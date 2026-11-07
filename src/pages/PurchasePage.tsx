import { useMemo, useState } from 'react'
import { hit, money, qty, today } from '../format'
import { findProduct, purchaseStatus } from '../model'
import { useOpenProductCreate } from '../go'
import { useStore } from '../store'
import { Badge, Empty, Page } from '../ui'

export function PurchasePage() {
  const { data, savePurchase, removePurchase } = useStore()
  const openProductCreate = useOpenProductCreate()
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [orderQtyText, setOrderQtyText] = useState('')
  const [amount, setAmount] = useState('')
  const [expectedDate, setExpectedDate] = useState(() => today())
  const rows = useMemo(() => {
    return data.purchases.filter((purchase) => {
      const product = findProduct(data, purchase.productId)
      return hit(query, [product?.code ?? '', product?.name ?? '', purchase.expectedDate])
    })
  }, [data, query])

  return (
    <Page
      kicker="采购"
      title="下单管理"
      desc="按商品下采购。保存后数量进入在途，入库后才加库存。"
      extra={<input className="search" value={query} placeholder="搜编码、名称" onChange={(event) => setQuery(event.target.value)} />}
    >
      <form
        className="card card-pad"
        onSubmit={(event) => {
          event.preventDefault()
          const ok = savePurchase({ productId, qty: orderQtyText, amount, expectedDate })
          if (!ok) return
          setOrderQtyText('')
          setAmount('')
        }}
      >
        <div className="form-grid">
          <label className="field">
            <span>商品</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">选择商品</option>
              {data.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>下单数量</span>
            <input value={orderQtyText} inputMode="numeric" onChange={(event) => setOrderQtyText(event.target.value)} />
          </label>
          <label className="field">
            <span>结算金额（元）</span>
            <input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label className="field">
            <span>到货时间</span>
            <input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
          </label>
        </div>
        {data.products.length === 0 ? <p className="sheet-note">还没有商品。先建档，才能下采购。</p> : null}
        <div className="form-actions">
          {data.products.length === 0 ? (
            <button type="button" className="btn ghost" onClick={openProductCreate}>
              去建档
            </button>
          ) : null}
          <button className="btn primary" type="submit">
            保存采购单
          </button>
        </div>
      </form>
      <div className="card">
        {data.purchases.length === 0 ? (
          <Empty text="还没有采购单。" />
        ) : rows.length === 0 ? (
          <Empty text="没有符合的采购单。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th className="num">下单数量</th>
                  <th className="num">已入库</th>
                  <th className="num">结算金额(元)</th>
                  <th>到货时间</th>
                  <th>状态</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((purchase) => {
                  const product = findProduct(data, purchase.productId)
                  return (
                    <tr key={purchase.id}>
                      <td>{product?.code ?? '—'}</td>
                      <td>{product?.name ?? '已删除商品'}</td>
                      <td className="num">{qty(purchase.qty)}</td>
                      <td className="num">{qty(purchase.receivedQty)}</td>
                      <td className="num">{money(purchase.amount)}</td>
                      <td>{purchase.expectedDate}</td>
                      <td>
                        <Badge status={purchaseStatus(purchase)} />
                      </td>
                      <td>
                        {purchase.receivedQty === 0 ? (
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => {
                              if (!window.confirm('删除后，这张单的在途数量会去掉。确定删除？')) return
                              removePurchase(purchase.id)
                            }}
                          >
                            删除
                          </button>
                        ) : (
                          <span className="muted">已有入库</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}
