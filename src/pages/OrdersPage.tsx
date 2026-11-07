import { useMemo, useState } from 'react'
import { formatShipTime, money, nowLocalMinute, qty, round2, shipDay } from '../format'
import { orderProfit, quoteShipment } from '../model'
import { useGo } from '../go'
import { useStore } from '../store'
import type { OrderInput } from '../types'
import { Empty, Page, Pager, usePager } from '../ui'

function blankForm() {
  return {
    orderNo: '',
    shop: '',
    receivedAmount: '',
    comboCode: '',
    qty: '',
    shipTime: nowLocalMinute(),
    trackingNo: '',
  }
}

export function OrdersPage() {
  const { data, saveOrder, removeOrder } = useStore()
  const go = useGo()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [trackingNo, setTrackingNo] = useState('')
  const [shop, setShop] = useState('')
  const [comboCode, setComboCode] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const invalid = Boolean(from && to && from > to)
  const rows = useMemo(() => {
    if (invalid) return []
    return data.orders
      .filter((order) => {
        const day = shipDay(order.shipTime)
        if (from && day < from) return false
        if (to && day > to) return false
        if (!order.orderNo.toLowerCase().includes(orderNo.trim().toLowerCase())) return false
        if (!order.trackingNo.toLowerCase().includes(trackingNo.trim().toLowerCase())) return false
        if (!order.shop.toLowerCase().includes(shop.trim().toLowerCase())) return false
        if (!order.comboCode.toLowerCase().includes(comboCode.trim().toLowerCase())) return false
        return true
      })
      .slice()
      .sort((a, b) => b.shipTime.localeCompare(a.shipTime) || b.createdAt.localeCompare(a.createdAt))
  }, [comboCode, data.orders, from, invalid, orderNo, shop, to, trackingNo])
  const pager = usePager(rows, `${from}|${to}|${orderNo}|${trackingNo}|${shop}|${comboCode}`)

  const quote = quoteShipment(data, form.comboCode, form.qty)
  const profitText =
    quote && /^\d+(\.\d{1,2})?$/.test(form.receivedAmount.trim()) ? money(round2(Number(form.receivedAmount) - quote.totalCost)) : ''

  function submit() {
    const input: OrderInput = { ...form }
    if (saveOrder(input)) setForm(blankForm())
  }

  return (
    <Page
      kicker="订单"
      title="已发货"
      desc="只选组合编码。销售件数是套数，按组合里的每套数量扣每个商品的库存。订单编号不能重复，避免同一单算两次。"
      extra={
        <button type="button" className="btn primary" onClick={() => setOpen((value) => !value)}>
          {open ? '收起' : '登记发货'}
        </button>
      }
    >
      <form
        className="card card-pad"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="form-grid">
          <label className="field">
            <span>发货时间起</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>发货时间止</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="field">
            <span>订单编号</span>
            <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>快递单号</span>
            <input value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>店铺名称</span>
            <input value={shop} onChange={(event) => setShop(event.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>组合编码</span>
            <input value={comboCode} onChange={(event) => setComboCode(event.target.value)} autoComplete="off" />
          </label>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setFrom('')
              setTo('')
              setOrderNo('')
              setTrackingNo('')
              setShop('')
              setComboCode('')
            }}
          >
            清空条件
          </button>
        </div>
      </form>
      {invalid ? <p className="warn-line">开始时间不能晚于结束时间。</p> : null}
      {open ? (
        <form
          className="card card-pad"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="form-grid">
            <label className="field">
              <span>订单编号</span>
              <input value={form.orderNo} onChange={(event) => setForm((current) => ({ ...current, orderNo: event.target.value }))} autoComplete="off" />
            </label>
            <label className="field">
              <span>店铺名称</span>
              <input value={form.shop} onChange={(event) => setForm((current) => ({ ...current, shop: event.target.value }))} autoComplete="off" />
            </label>
            <label className="field">
              <span>商家实收金额（元）</span>
              <input value={form.receivedAmount} inputMode="decimal" onChange={(event) => setForm((current) => ({ ...current, receivedAmount: event.target.value }))} autoComplete="off" />
            </label>
            <label className="field">
              <span>商品组合编码</span>
              <select value={form.comboCode} onChange={(event) => setForm((current) => ({ ...current, comboCode: event.target.value }))}>
                <option value="">选择组合</option>
                {(data.combos ?? []).map((combo) => (
                  <option key={combo.id} value={combo.code}>
                    {combo.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>销售件数</span>
              <input value={form.qty} inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, qty: event.target.value }))} autoComplete="off" />
            </label>
            <label className="field">
              <span>发货时间</span>
              <input type="datetime-local" value={form.shipTime} onChange={(event) => setForm((current) => ({ ...current, shipTime: event.target.value }))} />
            </label>
            <label className="field">
              <span>快递单号</span>
              <input value={form.trackingNo} onChange={(event) => setForm((current) => ({ ...current, trackingNo: event.target.value }))} autoComplete="off" />
            </label>
            <label className="field">
              <span>商品总成本（元）</span>
              <input value={quote ? money(quote.totalCost) : ''} readOnly placeholder="按组合自动计算" />
            </label>
            <label className="field">
              <span>利润（元）</span>
              <input value={profitText} readOnly placeholder="自动计算" />
            </label>
          </div>
          {quote ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商品编码</th>
                    <th>商品名称</th>
                    <th className="num">每套</th>
                    <th className="num">本次扣减</th>
                    <th className="num">当前库存</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.rows.map((row) => (
                    <tr key={row.productId} className={row.total > row.have ? 'zero' : undefined}>
                      <td>{row.code}</td>
                      <td>{row.name}</td>
                      <td className="num">{qty(row.perSet)}</td>
                      <td className="num">{qty(row.total)}</td>
                      <td className={row.total > row.have ? 'num neg' : 'num'}>{qty(row.have)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {quote && !quote.ok ? <p className="warn-line">{quote.problem}</p> : null}
          {(data.combos ?? []).length === 0 ? <p className="sheet-note">还没有组合。先去组合商品信息里，用商品编码组成一套。</p> : null}
          <div className="form-actions">
            {(data.combos ?? []).length === 0 ? (
              <button type="button" className="btn ghost" onClick={() => go('combo')}>
                去建组合
              </button>
            ) : null}
            <button className="btn primary" type="submit">
              登记发货
            </button>
          </div>
        </form>
      ) : null}
      <div className="card">
        {data.orders.length === 0 ? (
          <Empty text="还没有已发货订单。" />
        ) : rows.length === 0 ? (
          <Empty text="没有符合的订单。" />
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
