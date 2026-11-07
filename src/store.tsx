import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BizError,
  STORAGE_KEY,
  createCombo,
  createOrder,
  createProduct,
  createProducts,
  createPurchase,
  editProduct,
  emptyData,
  loadData,
  normalizeData,
  persist,
  receivePurchase,
  removeCombo,
  removeOrder,
  removeProduct,
  removePurchase,
  setArrival,
  stockInExisting,
  suggestCode,
} from './model'
import type { ComboInput, Data, OrderInput, ProductDraft, PurchaseInput } from './types'

type Toast = { kind: 'ok' | 'err'; text: string }

type StoreApi = {
  data: Data
  toast: Toast | null
  notify: (text: string, kind?: Toast['kind']) => void
  suggestCode: () => string
  saveProduct: (draft: ProductDraft, id?: string) => boolean
  saveProducts: (drafts: ProductDraft[]) => boolean
  removeProduct: (id: string) => boolean
  savePurchase: (input: PurchaseInput) => boolean
  changeArrival: (id: string, date: string) => boolean
  removePurchase: (id: string) => boolean
  receive: (id: string, qty: string) => boolean
  receiveExisting: (productId: string, qty: string) => boolean
  saveCombo: (input: ComboInput, id?: string) => boolean
  removeCombo: (id: string) => boolean
  saveOrder: (input: OrderInput) => boolean
  removeOrder: (id: string) => boolean
  replaceData: (raw: unknown) => boolean
  clearData: () => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => loadData())
  const [toast, setToast] = useState<Toast | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const next = normalizeData(JSON.parse(event.newValue))
        if (!next) return
        dataRef.current = next
        setData(next)
      } catch {
        // 别的标签页写入了读不了的内容时，保持当前页不变。
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function notify(text: string, kind: Toast['kind'] = 'ok') {
    setToast({ kind, text })
  }

  function commit(next: Data, okText: string) {
    dataRef.current = next
    setData(next)
    if (!persist(next)) {
      setToast({ kind: 'err', text: '改动只在当前页面，没能写入浏览器存储。' })
      return true
    }
    setToast({ kind: 'ok', text: okText })
    return true
  }

  function apply(fn: (current: Data) => Data, okText: string) {
    try {
      return commit(fn(dataRef.current), okText)
    } catch (error) {
      setToast({ kind: 'err', text: error instanceof BizError ? error.message : '操作失败' })
      return false
    }
  }

  const api: StoreApi = {
    data,
    toast,
    notify,
    suggestCode: () => suggestCode(dataRef.current.products, (dataRef.current.combos ?? []).map((combo) => combo.code)),
    saveProduct: (draft, id) => apply((current) => (id ? editProduct(current, id, draft) : createProduct(current, draft)), id ? '已保存修改' : '已建档'),
    saveProducts: (drafts) => apply((current) => createProducts(current, drafts), '表格已保存'),
    removeProduct: (id) => apply((current) => removeProduct(current, id), '已删除商品'),
    savePurchase: (input) => apply((current) => createPurchase(current, input), '采购单已保存，已进入在途'),
    changeArrival: (id, date) => {
      try {
        const next = setArrival(dataRef.current, id, date)
        dataRef.current = next
        setData(next)
        if (!persist(next)) setToast({ kind: 'err', text: '改动只在当前页面，没能写入浏览器存储。' })
        return true
      } catch (error) {
        setToast({ kind: 'err', text: error instanceof BizError ? error.message : '操作失败' })
        return false
      }
    },
    removePurchase: (id) => apply((current) => removePurchase(current, id), '已删除采购单'),
    receive: (id, qtyText) => apply((current) => receivePurchase(current, id, qtyText), '已入库'),
    receiveExisting: (productId, qtyText) => apply((current) => stockInExisting(current, productId, qtyText), '已补录入库'),
    saveCombo: (input, id) => apply((current) => createCombo(current, input, id), id ? '已保存组合' : '组合已保存'),
    removeCombo: (id) => apply((current) => removeCombo(current, id), '已删除组合'),
    saveOrder: (input) => apply((current) => createOrder(current, input), '已登记发货，库存已扣'),
    removeOrder: (id) => apply((current) => removeOrder(current, id), '已删除，库存已加回'),
    replaceData: (raw) => {
      const next = normalizeData(raw)
      if (!next) {
        setToast({ kind: 'err', text: '文件内容对不上' })
        return false
      }
      return commit(next, '已导入')
    },
    clearData: () => commit(emptyData(), '已清空'),
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('页面还没接上数据')
  return store
}
