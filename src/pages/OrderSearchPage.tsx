import { useMemo, useState } from 'react'
import { formatShipTime, money, qty, shipDay } from '../format'
import { orderProfit } from '../model'
import { useStore } from '../store'
import { Empty, Page, Pager, usePager } from '../ui'

function includes(value: string, query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) return true
  return value.toLowerCase().includes(text)
}

export function OrderSearchPage() {
  const { data, removeOrder } = useStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [trackingNo, setTrackingNo] = useState('')
  const [shop, setShop] = useState('')
  const [comboCode, setComboCode] = useState('')
  const invalid = Boolean(from && to && from > to)
  const rows = useMemo(() => {
    if (invalid) return []
    return data.orders
      .filter((order) => {
        const day = shipDay(order.shipTime)
        if (from && day < from) return false
        if (to && day > to) return false
        if (!includes(order.orderNo, orderNo)) return false
        if (!includes(order.trackingNo, trackingNo)) return false
        if (!includes(order.shop, shop)) return false
        if (!includes(order.comboCode, comboCode)) return false
        return true
      })
      .slice()
      .sort((a, b) => b.shipTime.localeCompare(a.shipTime) || b.createdAt.localeCompare(a.createdAt))
  }, [comboCode, data.orders, from, invalid, orderNo, shop, to, trackingNo])
  const pager = usePager(rows, `${from}|${to}|${orderNo}|${trackingNo}|${shop}|${comboCode}`)

  function clearFilters() {
    setFrom('')
    setTo('')
    setOrderNo('')
    setTrackingNo('')
    setShop('')
    setComboCode('')
  }

  return (
    <Page
      kicker="订单"
      title="订单检索"
      desc="按发货时间、订单编号、快递单号、店铺名称、组合编码查找已发货订单。几项可以一起用。"
    >
      <form
        className="card card-pad"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="form-grid">
          <label className="field">
            <span>1. 发货时间起</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>发货时间止</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="field">
            <span>2. 订单编号</span>
            <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>3. 快递单号</span>
            <input value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>4. 店铺名称</span>
            <input value={shop} onChange={(event) => setShop(event.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>5. 组合编码</span>
            <input value={comboCode} onChange={(event) => setComboCode(event.target.value)} autoComplete="off" />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={clearFilters}>
            清空条件
          </button>
        </div>
      </form>
      {invalid ? <p className="warn-line">开始时间不能晚于结束时间。</p> : null}
      <div className="card">
        {data.orders.length === 0 ? (
          <Empty text="还没有已发货订单。" />
        ) : rows.length === 0 ? (
          <Empty text="没有符合条件的订单。" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>订单编号</th>
                    <th>店铺名称</th>
                    <th className="num">商家实收金额(元)</th>
                    <th>商品组合编码</th>
                    <th className="num">销售件数</th>
                    <th>发货时间</th>
                    <th>快递单号</th>
                    <th className="num">商品总成本(元)</th>
                    <th className="num">利润(元)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((order) => {
                    const profit = orderProfit(order)
                    return (
                      <tr key={order.id}>
                        <td>{order.orderNo}</td>
                        <td>{order.shop}</td>
                        <td className="num">{money(order.receivedAmount)}</td>
                        <td>{order.comboCode}</td>
                        <td className="num">{qty(order.qty)}</td>
                        <td>{formatShipTime(order.shipTime)}</td>
                        <td>{order.trackingNo || '—'}</td>
                        <td className="num">{money(order.totalCost)}</td>
                        <td className={profit < 0 ? 'num neg' : 'num'}>{money(profit)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => {
                              if (!window.confirm('删除后，这单扣掉的库存会加回去。确定删除？')) return
                              removeOrder(order.id)
                            }}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={pager.page} pages={pager.pages} total={pager.total} size={pager.size} onPage={pager.setPage} onSize={pager.setSize} />
          </>
        )}
      </div>
    </Page>
  )
}
