import { useMemo, useState } from 'react'
import { money, qty } from '../format'
import { ordersInRange, summarize } from '../model'
import { useGo } from '../go'
import { useStore } from '../store'
import { Empty, Page, Stat } from '../ui'

export function FinancePage() {
  const { data } = useStore()
  const go = useGo()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const invalid = Boolean(from && to && from > to)
  const orders = useMemo(() => (invalid ? [] : ordersInRange(data, from, to)), [data, from, invalid, to])
  const report = useMemo(() => summarize(orders), [orders])

  return (
    <Page
      kicker="财务"
      title="财务"
      desc="销售件数按卖出的套数统计。商品总成本按发货当时各商品的成本价自动算。利润 = 商家实收金额 - 商品总成本。"
      extra={
        <div className="range">
          <input type="date" aria-label="开始日期" value={from} onChange={(event) => setFrom(event.target.value)} />
          <span>至</span>
          <input type="date" aria-label="结束日期" value={to} onChange={(event) => setTo(event.target.value)} />
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setFrom('')
              setTo('')
            }}
          >
            全部
          </button>
        </div>
      }
    >
      {invalid ? <p className="warn-line">开始日期不能晚于结束日期。</p> : null}
      <div className="stats">
        <Stat k="发货单数" v={qty(report.orderCount)} />
        <Stat k="销售件数" v={qty(report.qty)} />
        <Stat k="商品总成本" v={money(report.cost)} sub="元" />
        <Stat k="利润" v={money(report.profit)} sub={`实收 ${money(report.sales)} 元`} tone={report.profit < 0 ? 'neg' : report.profit > 0 ? 'pos' : undefined} />
      </div>
      <div className="card">
        <h2 className="block-title">店铺发货数量</h2>
        {report.shops.length === 0 ? (
          <Empty text="这个范围里没有发货。" action="去登记发货" onAction={() => go('orders')} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>店铺名称</th>
                  <th className="num">发货单数</th>
                  <th className="num">销售件数</th>
                  <th className="num">商品总成本(元)</th>
                  <th className="num">商家实收(元)</th>
                  <th className="num">利润(元)</th>
                </tr>
              </thead>
              <tbody>
                {report.shops.map((shop) => (
                  <tr key={shop.shop}>
                    <td>{shop.shop}</td>
                    <td className="num">{qty(shop.orderCount)}</td>
                    <td className="num">{qty(shop.qty)}</td>
                    <td className="num">{money(shop.cost)}</td>
                    <td className="num">{money(shop.sales)}</td>
                    <td className={shop.profit < 0 ? 'num neg' : 'num'}>{money(shop.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card">
        <h2 className="block-title">组合发货</h2>
        {report.combos.length === 0 ? (
          <Empty text="这个范围里没有发货。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>商品组合编码</th>
                  <th className="num">发货单数</th>
                  <th className="num">销售件数</th>
                  <th className="num">商品总成本(元)</th>
                  <th className="num">商家实收(元)</th>
                  <th className="num">利润(元)</th>
                </tr>
              </thead>
              <tbody>
                {report.combos.map((combo) => (
                  <tr key={combo.comboCode}>
                    <td>{combo.comboCode}</td>
                    <td className="num">{qty(combo.orderCount)}</td>
                    <td className="num">{qty(combo.qty)}</td>
                    <td className="num">{money(combo.cost)}</td>
                    <td className="num">{money(combo.received)}</td>
                    <td className={combo.profit < 0 ? 'num neg' : 'num'}>{money(combo.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}
