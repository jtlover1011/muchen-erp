import { formatDate, lastNDates, round2, round3, shipDay, today, uid, yesterday } from './format'
import type { Batch, Combo, ComboInput, ComboLine, Data, Order, OrderComponent, OrderInput, Product, ProductDraft, Purchase, PurchaseInput } from './types'

export const STORAGE_KEY = 'qingge-erp-v1'

export class BizError extends Error {}

export function emptyData(): Data {
  return { products: [], purchases: [], batches: [], combos: [], orders: [] }
}

export function emptyDraft(): ProductDraft {
  return {
    key: uid(),
    code: '',
    name: '',
    image: '',
    costPrice: '',
    material: '',
    weight: '',
    volume: '',
    supplier: '',
    replenishDays: '',
  }
}

export function draftFromProduct(product: Product): ProductDraft {
  return {
    key: product.id,
    code: product.code,
    name: product.name,
    image: product.image,
    costPrice: String(product.costPrice),
    material: product.material,
    weight: product.weight ? String(product.weight) : '',
    volume: product.volume ? String(product.volume) : '',
    supplier: product.supplier,
    replenishDays: product.replenishDays ? String(product.replenishDays) : '',
  }
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.code !== 'string' || typeof row.name !== 'string') return null
  const image = typeof row.image === 'string' && row.image.startsWith('data:image') ? row.image : ''
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    image,
    costPrice: num(row.costPrice),
    material: str(row.material),
    weight: num(row.weight),
    volume: num(row.volume),
    supplier: str(row.supplier),
    replenishDays: Math.max(0, Math.floor(num(row.replenishDays))),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
  }
}

function asPurchase(raw: unknown): Purchase | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.productId !== 'string') return null
  const purchaseQty = num(row.qty)
  const receivedQty = num(row.receivedQty)
  if (!Number.isInteger(purchaseQty) || purchaseQty <= 0) return null
  if (!Number.isInteger(receivedQty) || receivedQty < 0 || receivedQty > purchaseQty) return null
  return {
    id: row.id,
    productId: row.productId,
    qty: purchaseQty,
    amount: num(row.amount),
    expectedDate: typeof row.expectedDate === 'string' ? row.expectedDate : today(),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    receivedQty,
  }
}

function asBatch(raw: unknown): Batch | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.productId !== 'string' || typeof row.batchNo !== 'string') return null
  const batchQty = num(row.qty)
  if (!Number.isInteger(batchQty) || batchQty <= 0) return null
  return {
    id: row.id,
    batchNo: row.batchNo,
    purchaseId: typeof row.purchaseId === 'string' ? row.purchaseId : '',
    productId: row.productId,
    qty: batchQty,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
  }
}

function asComboLine(raw: unknown): ComboLine | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.productId !== 'string') return null
  const lineQty = num(row.qty)
  if (!Number.isInteger(lineQty) || lineQty <= 0) return null
  return { productId: row.productId, qty: lineQty }
}

function asCombo(raw: unknown): Combo | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.code !== 'string' || !Array.isArray(row.lines)) return null
  const lines = row.lines.map(asComboLine).filter((line): line is ComboLine => line !== null)
  if (lines.length === 0) return null
  const image = typeof row.image === 'string' && row.image.startsWith('data:image') ? row.image : ''
  return {
    id: row.id,
    image,
    code: row.code,
    name: str(row.name),
    lines,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
  }
}

function asComponent(raw: unknown): OrderComponent | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.productId !== 'string') return null
  const lineQty = num(row.qty)
  if (!Number.isInteger(lineQty) || lineQty <= 0) return null
  return { productId: row.productId, qty: lineQty, unitCost: num(row.unitCost) }
}

function asOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.orderNo !== 'string') return null
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString()
  const components = Array.isArray(row.components) ? row.components.map(asComponent).filter((line): line is OrderComponent => line !== null) : []
  if (typeof row.shipTime === 'string' || typeof row.receivedAmount === 'number') {
    const pieces = num(row.qty)
    if (!Number.isInteger(pieces) || pieces <= 0) return null
    return {
      id: row.id,
      orderNo: row.orderNo,
      shop: str(row.shop),
      receivedAmount: num(row.receivedAmount),
      comboCode: str(row.comboCode),
      qty: pieces,
      shipTime: typeof row.shipTime === 'string' ? row.shipTime : `${today()}T00:00`,
      trackingNo: str(row.trackingNo),
      totalCost: num(row.totalCost),
      components,
      createdAt,
    }
  }
  if (!Array.isArray(row.lines)) return null
  const legacy = row.lines.map(asComponent).filter((line): line is OrderComponent => line !== null)
  if (legacy.length === 0) return null
  const shipDate = typeof row.shipDate === 'string' ? row.shipDate : today()
  const totalCost = round2(legacy.reduce((total, line) => total + round2(line.qty * line.unitCost), 0))
  return {
    id: row.id,
    orderNo: row.orderNo,
    shop: str(row.shop),
    receivedAmount: num(row.salesAmount),
    comboCode: str(row.comboCode),
    qty: legacy.reduce((total, line) => total + line.qty, 0),
    shipTime: shipDate.length === 10 ? `${shipDate}T00:00` : shipDate,
    trackingNo: '',
    totalCost,
    components: legacy,
    createdAt,
  }
}

export function normalizeData(raw: unknown): Data | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (!Array.isArray(row.products) || !Array.isArray(row.purchases) || !Array.isArray(row.batches) || !Array.isArray(row.orders)) {
    return null
  }
  return {
    products: row.products.map(asProduct).filter((item): item is Product => item !== null),
    purchases: row.purchases.map(asPurchase).filter((item): item is Purchase => item !== null),
    batches: row.batches.map(asBatch).filter((item): item is Batch => item !== null),
    combos: Array.isArray(row.combos) ? row.combos.map(asCombo).filter((item): item is Combo => item !== null) : [],
    orders: row.orders.map(asOrder).filter((item): item is Order => item !== null),
  }
}

export function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    return normalizeData(JSON.parse(raw)) ?? emptyData()
  } catch {
    return emptyData()
  }
}

export function persist(data: Data): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...data }))
    return true
  } catch {
    return false
  }
}

function mustInt(value: string, label: string, allowZero: boolean): number {
  const text = value.trim()
  if (!/^\d+$/.test(text)) throw new BizError(allowZero ? `${label}请填整数` : `${label}要填正整数`)
  const n = Number(text)
  if (n > 99999999) throw new BizError(`${label}太大了`)
  if (!allowZero && n <= 0) throw new BizError(`${label}要填正整数`)
  return n
}

function mustDecimal(value: string, label: string, places: number, required: boolean): number {
  const text = value.trim()
  if (!text) {
    if (required) throw new BizError(`请填写${label}`)
    return 0
  }
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${places}})?$`)
  if (!pattern.test(text)) throw new BizError(`${label}请填数字，最多 ${places} 位小数`)
  const n = Number(text)
  if (n > 99999999) throw new BizError(`${label}太大了`)
  return places === 2 ? round2(n) : round3(n)
}

function mustDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BizError(`请选择${label}`)
  return value
}

function limitText(value: string, label: string, max: number): string {
  const text = value.trim()
  if (text.length > max) throw new BizError(`${label}最多 ${max} 个字`)
  return text
}

export function suggestCode(products: Pick<Product, 'code'>[], extra: string[] = []): string {
  const prefix = `SP${today().replaceAll('-', '')}`
  const taken = new Set([...products.map((product) => product.code), ...extra])
  let n = 1
  let code = ''
  do {
    code = prefix + String(n).padStart(3, '0')
    n += 1
  } while (taken.has(code))
  return code
}

function rowTouched(draft: ProductDraft): boolean {
  return [draft.name, draft.code, draft.costPrice, draft.material, draft.weight, draft.volume, draft.supplier, draft.replenishDays, draft.image].some(
    (value) => value.trim() !== '',
  )
}

export function parseProductDraft(draft: ProductDraft, data: Data, opt: { selfId?: string; requireImage: boolean }): Omit<Product, 'id' | 'createdAt'> {
  const name = limitText(draft.name, '商品名称', 60)
  if (!name) throw new BizError('请填写商品名称')
  if (data.products.some((product) => product.name === name && product.id !== opt.selfId)) throw new BizError(`商品名称「${name}」已存在`)
  const code = draft.code.trim()
  if (!code) throw new BizError('请填写商品编码')
  const comboCodes = comboList(data).map((combo) => combo.code)
  if (code.length > 40) throw new BizError('商品编码最多 40 个字符')
  if (data.products.some((product) => product.code === code && product.id !== opt.selfId)) throw new BizError(`商品编码 ${code} 已存在`)
  if (comboCodes.includes(code)) throw new BizError(`编码 ${code} 已被组合商品使用`)
  const material = limitText(draft.material, '材质', 40)
  if (!material) throw new BizError('请填写材质')
  const supplier = limitText(draft.supplier, '供应商', 40)
  if (!supplier) throw new BizError('请填写供应商')
  if (!draft.weight.trim()) throw new BizError('请填写重量')
  if (!draft.replenishDays.trim()) throw new BizError('请填写补货周期')
  const image = draft.image.startsWith('data:image') ? draft.image : ''
  if (opt.requireImage && !image) throw new BizError('请上传商品图片')
  return {
    code,
    name,
    image,
    costPrice: mustDecimal(draft.costPrice, '成本价', 2, true),
    material,
    weight: mustDecimal(draft.weight, '重量', 3, true),
    volume: 0,
    supplier,
    replenishDays: mustInt(draft.replenishDays, '补货周期', true),
  }
}

function withProduct(data: Data, fields: Omit<Product, 'id' | 'createdAt'>): Data {
  const product: Product = { ...fields, id: uid(), createdAt: new Date().toISOString() }
  return { ...data, products: [product, ...data.products] }
}

export function createProduct(data: Data, draft: ProductDraft): Data {
  return withProduct(data, parseProductDraft(draft, data, { requireImage: true }))
}

export function createProducts(data: Data, drafts: ProductDraft[]): Data {
  let next = data
  let count = 0
  drafts.forEach((draft, index) => {
    if (!rowTouched(draft)) return
    try {
      next = withProduct(next, parseProductDraft(draft, next, { requireImage: false }))
      count += 1
    } catch (error) {
      if (error instanceof BizError) throw new BizError(`第 ${index + 1} 行：${error.message}`)
      throw error
    }
  })
  if (count === 0) throw new BizError('请先填一行')
  return next
}

export function editProduct(data: Data, id: string, draft: ProductDraft): Data {
  if (!data.products.some((product) => product.id === id)) throw new BizError('找不到这个商品')
  const fields = parseProductDraft(draft, data, { selfId: id, requireImage: false })
  return {
    ...data,
    products: data.products.map((product) => (product.id === id ? { ...product, ...fields } : product)),
  }
}

export function removeProduct(data: Data, id: string): Data {
  if (!data.products.some((product) => product.id === id)) throw new BizError('找不到这个商品')
  const used =
    data.purchases.some((purchase) => purchase.productId === id) ||
    data.batches.some((batch) => batch.productId === id) ||
    (data.combos ?? []).some((combo) => combo.lines.some((line) => line.productId === id)) ||
    data.orders.some((order) => (order.components ?? []).some((line) => line.productId === id))
  if (used) throw new BizError('这个商品已被采购、入库或组合使用，不能删除')
  return { ...data, products: data.products.filter((product) => product.id !== id) }
}

export function findProduct(data: Data, id: string): Product | undefined {
  return data.products.find((product) => product.id === id)
}

export function stockOf(data: Data, productId: string): number {
  const inbound = data.batches.reduce((total, batch) => total + (batch.productId === productId ? batch.qty : 0), 0)
  const outbound = data.orders.reduce(
    (total, order) => total + (order.components ?? []).reduce((lineTotal, line) => lineTotal + (line.productId === productId ? line.qty : 0), 0),
    0,
  )
  return inbound - outbound
}

function localDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return formatDate(date)
}

function daysFrom(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  const [ty, tm, td] = today().split('-').map(Number)
  return Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(year, month - 1, date)) / 86400000)
}

export function stockAgeDays(data: Data, productId: string): number | null {
  const inbound = data.batches
    .filter((batch) => batch.productId === productId)
    .map((batch) => ({ day: localDay(batch.createdAt), qty: batch.qty }))
    .sort((a, b) => a.day.localeCompare(b.day) || 0)
  let left = data.orders.reduce(
    (total, order) => total + (order.components ?? []).reduce((lineTotal, line) => lineTotal + (line.productId === productId ? line.qty : 0), 0),
    0,
  )
  let oldest: string | null = null
  for (const batch of inbound) {
    const used = Math.min(batch.qty, Math.max(left, 0))
    left -= used
    if (batch.qty - used > 0 && !oldest) oldest = batch.day
  }
  if (!oldest || stockOf(data, productId) <= 0) return null
  return Math.max(0, daysFrom(oldest))
}

export function ageLevel(days: number | null): '' | 'age-30' | 'age-60' | 'age-90' {
  if (days == null) return ''
  if (days >= 90) return 'age-90'
  if (days >= 60) return 'age-60'
  if (days >= 30) return 'age-30'
  return ''
}

export function stockValue(data: Data, productId: string, costPrice: number): number {
  return round2(Math.max(0, stockOf(data, productId)) * costPrice)
}

export function warehouseValue(data: Data): number {
  return round2(data.products.reduce((total, product) => total + stockValue(data, product.id, product.costPrice), 0))
}

export function transitOf(data: Data, productId: string): number {
  return data.purchases.reduce((total, purchase) => {
    if (purchase.productId !== productId) return total
    return total + Math.max(0, purchase.qty - purchase.receivedQty)
  }, 0)
}

export function outboundOn(data: Data, productId: string, date: string): number {
  return data.orders.reduce((total, order) => {
    if (shipDay(order.shipTime) !== date) return total
    return total + (order.components ?? []).reduce((lineTotal, line) => lineTotal + (line.productId === productId ? line.qty : 0), 0)
  }, 0)
}

export function outSeries(data: Data, productId: string, days: number): { date: string; qty: number }[] {
  return lastNDates(days).map((date) => ({ date, qty: outboundOn(data, productId, date) }))
}

export function purchaseStatus(purchase: Purchase): '待入库' | '部分入库' | '已入库' {
  if (purchase.receivedQty <= 0) return '待入库'
  if (purchase.receivedQty < purchase.qty) return '部分入库'
  return '已入库'
}

export function sortedPending(data: Data): Purchase[] {
  return data.purchases
    .filter((purchase) => purchase.receivedQty < purchase.qty)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.createdAt.localeCompare(b.createdAt))
}

export function groupPending(data: Data): { date: string; items: Purchase[] }[] {
  const map = new Map<string, Purchase[]>()
  for (const purchase of sortedPending(data)) {
    const list = map.get(purchase.expectedDate)
    if (list) list.push(purchase)
    else map.set(purchase.expectedDate, [purchase])
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }))
}

function nextBatchNo(batches: Batch[]): string {
  const prefix = `RK${today().replaceAll('-', '')}`
  const n = batches.filter((batch) => batch.batchNo.startsWith(prefix)).length + 1
  return prefix + String(n).padStart(3, '0')
}

export function createPurchase(data: Data, input: PurchaseInput): Data {
  const product = findProduct(data, input.productId)
  if (!product) throw new BizError('请选择商品')
  const purchase: Purchase = {
    id: uid(),
    productId: product.id,
    qty: mustInt(input.qty, '下单数量', false),
    amount: mustDecimal(input.amount, '结算金额', 2, true),
    expectedDate: mustDate(input.expectedDate, '到货时间'),
    createdAt: new Date().toISOString(),
    receivedQty: 0,
  }
  return { ...data, purchases: [purchase, ...data.purchases] }
}

export function setArrival(data: Data, id: string, date: string): Data {
  if (!data.purchases.some((purchase) => purchase.id === id)) throw new BizError('找不到这张采购单')
  const expectedDate = mustDate(date, '到货时间')
  return {
    ...data,
    purchases: data.purchases.map((purchase) => (purchase.id === id ? { ...purchase, expectedDate } : purchase)),
  }
}

export function removePurchase(data: Data, id: string): Data {
  const purchase = data.purchases.find((item) => item.id === id)
  if (!purchase) throw new BizError('找不到这张采购单')
  if (purchase.receivedQty > 0) throw new BizError('已经有入库记录，不能删除')
  return { ...data, purchases: data.purchases.filter((item) => item.id !== id) }
}

export function receivePurchase(data: Data, id: string, qtyText: string): Data {
  const purchase = data.purchases.find((item) => item.id === id)
  if (!purchase) throw new BizError('找不到这张采购单')
  const receiveQty = mustInt(qtyText, '入库数量', false)
  const remain = purchase.qty - purchase.receivedQty
  if (remain <= 0) throw new BizError('这张采购单已经入完了')
  if (receiveQty > remain) throw new BizError(`最多还能入 ${remain}`)
  const batch: Batch = {
    id: uid(),
    batchNo: nextBatchNo(data.batches),
    purchaseId: purchase.id,
    productId: purchase.productId,
    qty: receiveQty,
    createdAt: new Date().toISOString(),
  }
  return {
    ...data,
    purchases: data.purchases.map((item) => (item.id === id ? { ...item, receivedQty: item.receivedQty + receiveQty } : item)),
    batches: [batch, ...data.batches],
  }
}

export function stockInExisting(data: Data, productId: string, qtyText: string): Data {
  const product = findProduct(data, productId)
  if (!product) throw new BizError('请选择商品')
  const receiveQty = mustInt(qtyText, '数量', false)
  const purchase: Purchase = {
    id: uid(),
    productId: product.id,
    qty: receiveQty,
    amount: round2(receiveQty * product.costPrice),
    expectedDate: today(),
    createdAt: new Date().toISOString(),
    receivedQty: 0,
  }
  return receivePurchase({ ...data, purchases: [purchase, ...data.purchases] }, purchase.id, String(receiveQty))
}

export function orderProfit(order: Order): number {
  return round2(order.receivedAmount - order.totalCost)
}

function mustShipTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) throw new BizError('请选择发货时间')
  return value.slice(0, 16)
}

function comboList(data: Data): Combo[] {
  return data.combos ?? []
}

export function findCombo(data: Data, code: string): Combo | undefined {
  return comboList(data).find((combo) => combo.code === code)
}

function parseComboLines(data: Data, lines: { productId: string; qty: string }[]): ComboLine[] {
  const filled = lines.filter((line) => line.productId || line.qty.trim())
  if (filled.length < 2) throw new BizError('一个组合至少要两个不同商品')
  const seen = new Set<string>()
  return filled.map((line) => {
    const product = findProduct(data, line.productId)
    if (!product) throw new BizError('请选择商品')
    if (seen.has(product.id)) throw new BizError(`${product.name} 重复了`)
    seen.add(product.id)
    return { productId: product.id, qty: mustInt(line.qty, '每套数量', false) }
  })
}

export function createCombo(data: Data, input: ComboInput, id?: string): Data {
  const code = limitText(input.code, '组合编码', 60)
  if (!code) throw new BizError('请填写组合编码')
  const name = limitText(input.name, '组合名称', 60)
  if (!name) throw new BizError('请填写组合名称')
  if (comboList(data).some((combo) => combo.name === name && combo.id !== id)) throw new BizError(`组合名称「${name}」已存在`)
  if (comboList(data).some((combo) => combo.code === code && combo.id !== id)) throw new BizError(`组合编码 ${code} 已存在`)
  if (data.products.some((product) => product.code === code)) throw new BizError(`编码 ${code} 已被商品使用`)
  const lines = parseComboLines(data, input.lines)
  const image = input.image.startsWith('data:image') ? input.image : ''
  if (!image) throw new BizError('请上传组合图片')
  const signature = [...lines].map((line) => `${line.productId}:${line.qty}`).sort().join('|')
  const duplicated = comboList(data).find((combo) => {
    if (combo.id === id) return false
    const other = [...combo.lines].map((line) => `${line.productId}:${line.qty}`).sort().join('|')
    return other === signature
  })
  if (duplicated) throw new BizError(`这套商品已经组过了，不能再组。已有组合：${duplicated.name || duplicated.code}`)
  if (id) {
    if (!comboList(data).some((combo) => combo.id === id)) throw new BizError('找不到这个组合')
    return { ...data, combos: comboList(data).map((combo) => (combo.id === id ? { ...combo, image, code, name, lines } : combo)) }
  }
  const combo: Combo = { id: uid(), image, code, name, lines, createdAt: new Date().toISOString() }
  return { ...data, combos: [combo, ...comboList(data)] }
}

export function comboAvailability(data: Data, combo: Combo): { available: number; missing: string[] } {
  let available = Number.POSITIVE_INFINITY
  const missing: string[] = []
  for (const line of combo.lines) {
    const product = findProduct(data, line.productId)
    const label = product?.name ?? '已删除商品'
    const stock = product ? stockOf(data, product.id) : 0
    if (stock <= 0) missing.push(label)
    available = Math.min(available, Math.floor(Math.max(stock, 0) / line.qty))
  }
  if (!Number.isFinite(available)) available = 0
  if (missing.length > 0) return { available: 0, missing }
  return { available, missing }
}

export function removeCombo(data: Data, id: string): Data {
  const combo = comboList(data).find((item) => item.id === id)
  if (!combo) throw new BizError('找不到这个组合')
  if (data.orders.some((order) => order.comboCode === combo.code)) throw new BizError('已有发货单用了这个组合，不能删除')
  return { ...data, combos: comboList(data).filter((item) => item.id !== id) }
}

export type ShipmentRow = {
  productId: string
  code: string
  name: string
  perSet: number
  total: number
  have: number
  unitCost: number
  cost: number
}

export function quoteShipment(data: Data, comboCode: string, setsText: string): { ok: boolean; problem: string; rows: ShipmentRow[]; totalCost: number } | null {
  const combo = findCombo(data, comboCode)
  if (!combo) return null
  if (!/^\d+$/.test(setsText.trim()) || Number(setsText.trim()) <= 0) return null
  const sets = Number(setsText.trim())
  const rows: ShipmentRow[] = []
  let problem = ''
  for (const line of combo.lines) {
    const product = findProduct(data, line.productId)
    if (!product) {
      problem = problem || '组合里有商品已不存在'
      continue
    }
    const total = line.qty * sets
    const have = stockOf(data, product.id)
    if (!problem && total > have) problem = `${product.name} 库存只有 ${have}，这单要扣 ${total}`
    rows.push({
      productId: product.id,
      code: product.code,
      name: product.name,
      perSet: line.qty,
      total,
      have,
      unitCost: product.costPrice,
      cost: round2(total * product.costPrice),
    })
  }
  return { ok: problem === '' && rows.length === combo.lines.length, problem, rows, totalCost: round2(rows.reduce((total, row) => total + row.cost, 0)) }
}

function orderKey(orderNo: string): string {
  return orderNo.trim().replace(/\s+/g, '').toLowerCase()
}

export function createOrder(data: Data, input: OrderInput): Data {
  const orderNo = limitText(input.orderNo, '订单编号', 40)
  if (!orderNo) throw new BizError('请填写订单编号')
  if (data.orders.some((order) => orderKey(order.orderNo) === orderKey(orderNo))) throw new BizError(`订单编号 ${orderNo} 已存在，不会重复计算`)
  const shop = limitText(input.shop, '店铺名称', 40)
  if (!shop) throw new BizError('请填写店铺名称')
  const comboCode = limitText(input.comboCode, '商品组合编码', 60)
  if (!comboCode) throw new BizError('请选择商品组合编码')
  if (!findCombo(data, comboCode)) throw new BizError('找不到这个组合编码，先去组合商品信息里建好')
  const sets = mustInt(input.qty, '销售件数', false)
  const quote = quoteShipment(data, comboCode, String(sets))
  if (!quote || !quote.ok) throw new BizError(quote?.problem || '这个组合无法发货')
  const order: Order = {
    id: uid(),
    orderNo,
    shop,
    receivedAmount: mustDecimal(input.receivedAmount, '商家实收金额', 2, true),
    comboCode,
    qty: sets,
    shipTime: mustShipTime(input.shipTime),
    trackingNo: limitText(input.trackingNo, '快递单号', 40),
    totalCost: quote.totalCost,
    components: quote.rows.map((row) => ({ productId: row.productId, qty: row.total, unitCost: row.unitCost })),
    createdAt: new Date().toISOString(),
  }
  return { ...data, orders: [order, ...data.orders] }
}

export function removeOrder(data: Data, id: string): Data {
  if (!data.orders.some((order) => order.id === id)) throw new BizError('找不到这张订单')
  return { ...data, orders: data.orders.filter((order) => order.id !== id) }
}

export function ordersInRange(data: Data, from: string, to: string): Order[] {
  return data.orders.filter((order) => {
    const day = shipDay(order.shipTime)
    return (!from || day >= from) && (!to || day <= to)
  })
}

export type ShopRow = {
  shop: string
  orderCount: number
  qty: number
  cost: number
  sales: number
  profit: number
}

export type ComboShipRow = {
  comboCode: string
  orderCount: number
  qty: number
  cost: number
  received: number
  profit: number
}

export function summarize(orders: Order[]) {
  const shops = new Map<string, ShopRow>()
  const combos = new Map<string, ComboShipRow>()
  for (const order of orders) {
    const shop = shops.get(order.shop) ?? { shop: order.shop, orderCount: 0, qty: 0, cost: 0, sales: 0, profit: 0 }
    shop.orderCount += 1
    shop.qty += order.qty
    shop.cost = round2(shop.cost + order.totalCost)
    shop.sales = round2(shop.sales + order.receivedAmount)
    shop.profit = round2(shop.sales - shop.cost)
    shops.set(order.shop, shop)
    const combo = combos.get(order.comboCode) ?? { comboCode: order.comboCode, orderCount: 0, qty: 0, cost: 0, received: 0, profit: 0 }
    combo.orderCount += 1
    combo.qty += order.qty
    combo.cost = round2(combo.cost + order.totalCost)
    combo.received = round2(combo.received + order.receivedAmount)
    combo.profit = round2(combo.received - combo.cost)
    combos.set(order.comboCode, combo)
  }
  const received = round2(orders.reduce((total, order) => total + order.receivedAmount, 0))
  const cost = round2(orders.reduce((total, order) => total + order.totalCost, 0))
  return {
    orderCount: orders.length,
    qty: orders.reduce((total, order) => total + order.qty, 0),
    sales: received,
    cost,
    profit: round2(received - cost),
    shops: [...shops.values()].sort((a, b) => b.qty - a.qty || a.shop.localeCompare(b.shop, 'zh-CN')),
    combos: [...combos.values()].sort((a, b) => b.qty - a.qty || a.comboCode.localeCompare(b.comboCode)),
  }
}

export function inventoryTotals(data: Data) {
  const day = yesterday()
  let stock = 0
  let transit = 0
  let yesterdayOut = 0
  let zero = 0
  for (const product of data.products) {
    const have = stockOf(data, product.id)
    stock += have
    transit += transitOf(data, product.id)
    yesterdayOut += outboundOn(data, product.id, day)
    if (have <= 0) zero += 1
  }
  return { sku: data.products.length, stock, transit, yesterday: yesterdayOut, zero }
}
