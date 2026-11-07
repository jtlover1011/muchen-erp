import { findProduct, groupPending, sortedPending } from '../model'
import { qty, today, weekday } from '../format'
import { useGo } from '../go'
import { useStore } from '../store'
import { Empty, Page, Stat } from '../ui'

export function TransitPage() {
  const { data, changeArrival } = useStore()
  const go = useGo()
  const groups = groupPending(data)
  const pending = sortedPending(data)
  const pieces = pending.reduce((total, purchase) => total + purchase.qty - purchase.receivedQty, 0)
  const late = pending.filter((purchase) => purchase.expectedDate < today()).length
  const now = today()

  return (
    <Page kicker="采购" title="在途商品" desc="采购单保存后自动出现在这里。按到货日排成时间表，到了再去入库。">
      <div className="stats">
        <Stat k="在途单" v={pending.length} />
        <Stat k="在途件数" v={qty(pieces)} />
        <Stat k="最早到货日" v={pending[0]?.expectedDate ?? '—'} />
        <Stat k="已过到货日" v={late} tone={late > 0 ? 'neg' : undefined} />
      </div>
      {pending.length === 0 ? (
        <div className="card">
          <Empty text="现在没有在途商品。" action="去下单" onAction={() => go('purchase')} />
        </div>
      ) : (
        <div className="stack">
          {groups.map((group) => {
            const remain = group.items.reduce((total, purchase) => total + purchase.qty - purchase.receivedQty, 0)
            return (
              <section className="card" key={group.date}>
                <header className="day-head">
                  <strong>{group.date}</strong>
                  <span>{weekday(group.date)}</span>
                  {group.date < now ? <span className="late">已过到货日</span> : null}
                  <span className="muted">待入库 {qty(remain)}</span>
                </header>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>商品编码</th>
                        <th>商品名称</th>
                        <th className="num">下单数量</th>
                        <th className="num">待入库</th>
                        <th>到货时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((purchase) => {
                        const product = findProduct(data, purchase.productId)
                        return (
                          <tr key={purchase.id}>
                            <td>{product?.code ?? '—'}</td>
                            <td>{product?.name ?? '已删除商品'}</td>
                            <td className="num">{qty(purchase.qty)}</td>
                            <td className="num">{qty(purchase.qty - purchase.receivedQty)}</td>
                            <td>
                              <input type="date" aria-label="到货时间" value={purchase.expectedDate} onChange={(event) => changeArrival(purchase.id, event.target.value)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </Page>
  )
}
