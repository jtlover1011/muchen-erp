import { useMemo, useState } from 'react'
import { hit } from '../format'
import { useStore } from '../store'
import type { Product } from '../types'
import { Empty, Page, Thumb } from '../ui'
import { ProductCreateDialog } from './ProductCreatePage'

export function ProductEditPage() {
  const { data } = useStore()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const rows = useMemo(
    () => data.products.filter((product) => hit(query, [product.code, product.name, product.supplier])),
    [data.products, query],
  )

  return (
    <Page
      kicker="商品管理"
      title="编辑商品档案"
      desc="选择商品后，在弹窗中修改建档信息。"
      extra={<input className="search" value={query} placeholder="搜编码、名称、供应商" onChange={(event) => setQuery(event.target.value)} />}
    >
      <div className="card">
        {rows.length === 0 ? (
          <Empty text={data.products.length ? '没有符合的商品。' : '还没有商品档案。'} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>图片</th><th>商品编码</th><th>商品名称</th><th>供应商</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <tr key={product.id}>
                    <td><Thumb src={product.image} name={product.name} /></td>
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.supplier || '—'}</td>
                    <td><button type="button" className="btn ghost" onClick={() => setEditing(product)}>编辑档案</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing ? <ProductCreateDialog product={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  )
}
