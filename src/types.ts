export type Product = {
  id: string
  code: string
  name: string
  image: string
  costPrice: number
  material: string
  weight: number
  volume: number
  supplier: string
  replenishDays: number
  createdAt: string
}

export type ProductDraft = {
  key: string
  code: string
  name: string
  image: string
  costPrice: string
  material: string
  weight: string
  volume: string
  supplier: string
  replenishDays: string
}

export type Purchase = {
  id: string
  productId: string
  qty: number
  amount: number
  expectedDate: string
  createdAt: string
  receivedQty: number
}

export type Batch = {
  id: string
  batchNo: string
  purchaseId: string
  productId: string
  qty: number
  createdAt: string
}

export type ComboLine = {
  productId: string
  qty: number
}

export type Combo = {
  id: string
  image: string
  code: string
  name: string
  lines: ComboLine[]
  createdAt: string
}

export type OrderComponent = {
  productId: string
  qty: number
  unitCost: number
}

export type Order = {
  id: string
  orderNo: string
  shop: string
  receivedAmount: number
  comboCode: string
  qty: number
  shipTime: string
  trackingNo: string
  totalCost: number
  components: OrderComponent[]
  createdAt: string
}

export type Data = {
  products: Product[]
  purchases: Purchase[]
  batches: Batch[]
  combos: Combo[]
  orders: Order[]
}

export type PurchaseInput = {
  productId: string
  qty: string
  amount: string
  expectedDate: string
}

export type ComboInput = {
  image: string
  code: string
  name: string
  lines: { productId: string; qty: string }[]
}

export type OrderInput = {
  orderNo: string
  shop: string
  receivedAmount: string
  comboCode: string
  qty: string
  shipTime: string
  trackingNo: string
}
