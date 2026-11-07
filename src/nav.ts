export type PageId =
  | 'orders'
  | 'order-search'
  | 'product-info'
  | 'combo'
  | 'inventory'
  | 'purchase'
  | 'transit'
  | 'inbound'
  | 'finance'

export type NavItem = {
  id: PageId
  label: string
  note?: string
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: '订单',
    items: [
      { id: 'orders', label: '已发货' },
      { id: 'order-search', label: '订单检索' },
    ],
  },
  {
    group: '商品管理',
    items: [
      { id: 'product-info', label: '商品信息' },
      { id: 'combo', label: '组合商品信息' },
    ],
  },
  { group: '库存', items: [{ id: 'inventory', label: '库存数据看板' }] },
  {
    group: '采购管理',
    items: [
      { id: 'purchase', label: '下单管理' },
      { id: 'transit', label: '在途商品' },
      { id: 'inbound', label: '入库管理' },
    ],
  },
  { group: '财务', items: [{ id: 'finance', label: '财务' }] },
]

export function isPage(id: string): id is PageId {
  return NAV.some((group) => group.items.some((item) => item.id === id))
}
