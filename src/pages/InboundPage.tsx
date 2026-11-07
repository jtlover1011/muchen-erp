import { useEffect, useState } from 'react'
import { formatDateTime, money, qty, round2 } from '../format'
import { findProduct, sortedPending } from '../model'
import { useGo } from '../go'
import { useStore } from '../store'
import type { Purchase } from '../types'
import { Empty, Page } from '../ui'

function ReceiveRow({ purchase }: { purchase: Purchase }) {
  const { data, receive } = useStore()
  const remain = purchase.qty - purchase.receivedQty
  const [qtyText, setQtyText] = useState(String(remain))
  const product = findProduct(data, purchase.productId)

  useEffect(() => {
    setQtyText(String(remain))
  }, [remain])

  return (
    <tr>
      <td>{product?.code ?? '—'}</td>
      <td>{product?.name ?? '已删除商品'}</td>
      <td className="num">{qty(purchase.qty)}</td>
      <td className="num">{qty(purchase.receivedQty)}</td>
      <td className="num">{qty(remain)}</td>
      <td>{purchase.expectedDate}</td>
      <td className="receive-cell">
        <input aria-label="本次入库数量" value={qtyText} inputMode="numeric" onChange={(event) => setQtyText(event.target.value)} />
        <button type="button" className="btn primary" onClick={() => receive(purchase.id, qtyText)}>
          确认入库
        </button>
      </td>
    </tr>
  )
}

export function InboundPage() {
  const { data, receiveExisting } = useStore()
  const go = useGo()
  const pending = sortedPending(data)
  const [productId, setProductId] = useState('')
  const [qtyText, setQtyText] = useState('')
  const product = findProduct(data, productId)
  const amount = product && /^\d+$/.test(qtyText.trim()) ? money(round2(Number(qtyText.trim()) * product.costPrice)) : ''

  return (
    <Page kicker="采购" title="入库管理" desc="每次确认都单独记一批，方便以后核对。确认后库存增加，在途减少。">
      <div className="card">
        <h2 className="block-title">待入库商品</h2>
        {pending.length === 0 ? (
          <Empty text="没有待入库的采购。" action="去下单" onAction={() => go('purchase')} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th className="num">下单数量</th>
                  <th className="num">已入库</th>
                  <th className="num">待入库</th>
                  <th>到货时间</th>
                  <th>本次入库</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((purchase) => (
                  <ReceiveRow key={purchase.id} purchase={purchase} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <form
        className="card card-pad"
        onSubmit={(event) => {
          event.preventDefault()
          if (receiveExisting(productId, qtyText)) setQtyText('')
        }}
      >
        <h2 className="block-title">补录现有库存</h2>
        <p className="sheet-note">仓库里已经有的货，从这里入。会按成本价留下一张采购单和一批入库记录。</p>
        <div className="form-grid">
          <label className="field">
            <span>商品</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">选择商品</option>
              {data.products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>数量</span>
            <input value={qtyText} inputMode="numeric" onChange={(event) => setQtyText(event.target.value)} />
          </label>
          <label className="field">
            <span>结算金额（元）</span>
            <input value={amount} readOnly placeholder="按成本价自动计算" />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn primary" type="submit">
            补录入库
          </button>
        </div>
      </form>
      <div className="card">
        <h2 className="block-title">已入库商品</h2>
        {data.batches.length === 0 ? (
          <Empty text="还没有入库批次。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>批次号</th>
                  <th>入库时间</th>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th className="num">数量</th>
                  <th>对应到货日</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => {
                  const item = findProduct(data, batch.productId)
                  const purchase = data.purchases.find((row) => row.id === batch.purchaseId)
                  return (
                    <tr key={batch.id}>
                      <td>{batch.batchNo}</td>
                      <td>{formatDateTime(batch.createdAt)}</td>
                      <td>{item?.code ?? '—'}</td>
                      <td>{item?.name ?? '已删除商品'}</td>
                      <td className="num">{qty(batch.qty)}</td>
                      <td>{purchase?.expectedDate ?? '—'}</td>
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
