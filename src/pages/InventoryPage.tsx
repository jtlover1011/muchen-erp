import { useMemo, useState } from 'react'
import { hit, money, qty, sum, yesterday } from '../format'
import { ageLevel, inventoryTotals, outboundOn, outSeries, stockAgeDays, stockOf, stockValue, transitOf, warehouseValue } from '../model'
import { useOpenProductCreate } from '../go'
import { useStore } from '../store'
import { Empty, Page, SalesTrend, Stat, Thumb } from '../ui'

export function InventoryPage() {
  const { data } = useStore()
  const openProductCreate = useOpenProductCreate()
  const [query, setQuery] = useState('')
  const [onlyZero, setOnlyZero] = useState(false)
  const totals = inventoryTotals(data)
  const day = yesterday()
  const rows = useMemo(() => {
    return data.products
      .filter((product) => hit(query, [product.code, product.name, product.supplier]))
      .filter((product) => !onlyZero || stockOf(data, product.id) <= 0)
      .slice()
      .sort((a, b) => stockOf(data, a.id) - stockOf(data, b.id) || a.code.localeCompare(b.code))
  }, [data, onlyZero, query])

  return (
    <Page
      kicker="库存"
      title="库存数据看板"
      desc="货值按库存乘成本价。库龄按最早没发完的入库算：满30天蓝色，满60天橙色，满90天红色。"
      extra={
        <>
          <input className="search" value={query} placeholder="搜编码、名称、供应商" onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className={onlyZero ? 'btn primary' : 'btn ghost'} onClick={() => setOnlyZero((value) => !value)}>
            只看零库存
          </button>
        </>
      }
    >
      <div className="stats">
        <Stat k="商品数" v={qty(totals.sku)} />
        <Stat k="库存总量" v={qty(totals.stock)} />
        <Stat k="在途总量" v={qty(totals.transit)} />
        <Stat k="昨日出库" v={qty(totals.yesterday)} />
        <Stat k="零库存" v={qty(totals.zero)} tone={totals.zero > 0 ? 'neg' : undefined} />
        <Stat k="仓库总货值" v={money(warehouseValue(data))} sub="元" />
      </div>
      <div className="card">
        {data.products.length === 0 ? (
          <Empty text="还没有商品。" action="去建档" onAction={openProductCreate} />
        ) : rows.length === 0 ? (
          <Empty text="没有符合的商品。" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>图片</th>
                  <th>商品编码</th>
                  <th>商品名称</th>
                  <th className="num">库存</th>
                  <th className="num">货值(元)</th>
                  <th>库龄</th>
                  <th className="num">在途</th>
                  <th className="num">昨日出库</th>
                  <th>销售趋势</th>
                  <th className="num">近30日出库</th>
                  <th>供应商</th>
                  <th className="num">补货周期(天)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => {
                  const stock = stockOf(data, product.id)
                  const age = stockAgeDays(data, product.id)
                  const level = ageLevel(age)
                  const month = outSeries(data, product.id, 30).map((item) => item.qty)
                  return (
                    <tr key={product.id} className={level || (stock <= 0 ? 'zero' : undefined)}>
                      <td>
                        <Thumb src={product.image} name={product.name} />
                      </td>
                      <td>{product.code}</td>
                      <td>{product.name}</td>
                      <td className={stock < 0 ? 'num neg' : 'num'}>{qty(stock)}</td>
                      <td className="num">{money(stockValue(data, product.id, product.costPrice))}</td>
                      <td>{age == null ? '—' : <span className={`age-tag ${level}`}>{age}天</span>}</td>
                      <td className="num">{qty(transitOf(data, product.id))}</td>
                      <td className="num">{qty(outboundOn(data, product.id, day))}</td>
                      <td>
                        <SalesTrend name={product.name} seriesFor={(days) => outSeries(data, product.id, days)} />
                      </td>
                      <td className="num">{sum(month)}</td>
                      <td>{product.supplier || '—'}</td>
                      <td className="num">{product.replenishDays || '—'}</td>
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
