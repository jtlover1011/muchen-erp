import { useEffect, useMemo, useRef, useState } from 'react'
import { hit, money, qty, yesterday } from '../format'
import { useCreateAsk } from '../go'
import { findProduct, outboundOn, outSeries, stockOf, transitOf } from '../model'
import { ProductCreateDialog } from './ProductCreatePage'
import { useStore } from '../store'
import { Bars, Empty, Page, Pager, SalesTrend, Thumb, usePager } from '../ui'

export function ProductInfoPage() {
  const { data } = useStore()
  const createAsk = useCreateAsk()
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const day = yesterday()
  const rows = useMemo(
    () => data.products.filter((product) => hit(query, [product.code, product.name, product.supplier, product.material])),
    [data.products, query],
  )
  const pager = usePager(rows, query)
  const current = detailId ? findProduct(data, detailId) : undefined

  const asked = useRef(createAsk)
  useEffect(() => {
    if (asked.current === createAsk) return
    asked.current = createAsk
    setCreating(true)
  }, [createAsk])

  return (
    <Page
      kicker="商品"
      title={current ? '商品详情' : '商品信息'}
      desc={current ? `${current.name} 的详细资料。库存和出库由采购、发货算出。` : '库存和在途由采购、组合发货算出，这里不能直接改。'}
      extra={
        current ? (
          <button type="button" className="btn ghost" onClick={() => setDetailId(null)}>
            返回商品信息
          </button>
        ) : (
          <>
            <input className="search" value={query} placeholder="搜编码、名称、供应商" onChange={(event) => setQuery(event.target.value)} />
            <button type="button" className="btn primary" onClick={() => setCreating(true)}>
              商品建档
            </button>
          </>
        )
      }
    >
      {current ? (
        <div className="card card-pad detail-page">
          <div className="detail-head">
            <Thumb src={current.image} name={current.name} lg />
            <div>
              <strong>{current.name}</strong>
              <p>{current.code}</p>
            </div>
          </div>
          <dl className="kv">
            <dt>库存</dt>
            <dd>{qty(stockOf(data, current.id))}</dd>
            <dt>在途</dt>
            <dd>{qty(transitOf(data, current.id))}</dd>
            <dt>昨日出库</dt>
            <dd>{qty(outboundOn(data, current.id, day))}</dd>
            <dt>成本价</dt>
            <dd>{money(current.costPrice)} 元</dd>
            <dt>材质</dt>
            <dd>{current.material || '—'}</dd>
            <dt>重量</dt>
            <dd>{current.weight} kg</dd>
            <dt>供应商</dt>
            <dd>{current.supplier || '—'}</dd>
            <dt>补货周期</dt>
            <dd>{current.replenishDays ? `${current.replenishDays} 天` : '—'}</dd>
          </dl>
          <h3>近7日销售</h3>
          <Bars series={outSeries(data, current.id, 7)} />
          <h3>近30日趋势</h3>
          <Bars series={outSeries(data, current.id, 30)} />
          <h3>近90天趋势</h3>
          <Bars series={outSeries(data, current.id, 90)} />
        </div>
      ) : (
      <div>
        <div className="card">
          {data.products.length === 0 ? (
            <Empty text="还没有商品。建档后，这里会列出库存和出库。" action="商品建档" onAction={() => setCreating(true)} />
          ) : rows.length === 0 ? (
            <Empty text="没有符合的商品。" />
          ) : (
            <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>图片</th>
                    <th>商品编码</th>
                    <th>商品名称</th>
                    <th className="num">库存</th>
                    <th className="num">在途</th>
                    <th className="num">昨日出库</th>
                    <th>销售趋势</th>
                    <th className="num">成本价(元)</th>
                    <th>材质</th>
                    <th className="num">重量(kg)</th>
                    <th>供应商</th>
                    <th className="num">补货周期(天)</th>
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((product) => {
                    const stock = stockOf(data, product.id)
                    return (
                      <tr key={product.id} className={stock <= 0 ? 'zero' : undefined}>
                        <td>
                          <div className="pic-cell">
                            <Thumb src={product.image} name={product.name} />
                            <button type="button" className="btn blue" onClick={() => setDetailId(product.id)}>
                              商品详情
                            </button>
                          </div>
                        </td>
                        <td>{product.code}</td>
                        <td>{product.name}</td>
                        <td className={stock < 0 ? 'num neg' : 'num'}>{qty(stock)}</td>
                        <td className="num">{qty(transitOf(data, product.id))}</td>
                        <td className="num">{qty(outboundOn(data, product.id, day))}</td>
                        <td>
                          <SalesTrend name={product.name} seriesFor={(days) => outSeries(data, product.id, days)} />
                        </td>
                        <td className="num">{money(product.costPrice)}</td>
                        <td>{product.material}</td>
                        <td className="num">{product.weight}</td>
                        <td>{product.supplier}</td>
                        <td className="num">{product.replenishDays}</td>
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
      </div>
      )}
      {creating ? <ProductCreateDialog onClose={() => setCreating(false)} /> : null}
    </Page>
  )
}
