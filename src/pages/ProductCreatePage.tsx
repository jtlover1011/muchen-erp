import { useState } from 'react'
import { emptyDraft } from '../model'
import { ProductFields } from '../productFields'
import { useStore } from '../store'
import type { ProductDraft } from '../types'
import { Modal } from '../ui'

function blankRows(count: number): ProductDraft[] {
  return Array.from({ length: count }, () => emptyDraft())
}

export function ProductCreateDialog({ onClose }: { onClose: () => void }) {
  const { saveProduct, saveProducts } = useStore()
  const [mode, setMode] = useState<'one' | 'sheet'>('one')
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft())
  const [rows, setRows] = useState<ProductDraft[]>(() => blankRows(5))

  function patchRow(key: string, patch: Partial<ProductDraft>) {
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  return (
    <Modal title="商品建档" wide={mode === 'sheet'} onClose={onClose}>
      <div className="tabs" role="tablist">
        <button type="button" className={mode === 'one' ? 'on' : ''} onClick={() => setMode('one')}>
          单条录入
        </button>
        <button type="button" className={mode === 'sheet' ? 'on' : ''} onClick={() => setMode('sheet')}>
          表格录入
        </button>
      </div>
      {mode === 'one' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (saveProduct(draft)) onClose()
          }}
        >
          <ProductFields draft={draft} allowGenerate onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
          <p className="sheet-note">图片、编码、名称、成本价、材质、重量、供应商、补货周期都要填。编码可以点生成。</p>
          <div className="form-actions">
            <button className="btn primary" type="submit">
              保存建档
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (saveProducts(rows)) onClose()
          }}
        >
          <p className="sheet-note">表格里每一格都要填。图片请用单条录入。</p>
          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>商品名称</th>
                  <th>成本价(元)</th>
                  <th>材质</th>
                  <th>重量(kg)</th>
                  <th>供应商</th>
                  <th>补货周期(天)</th>
                  <th>商品编码</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key}>
                    <td>
                      <input aria-label={`第${index + 1}行商品名称`} value={row.name} onChange={(event) => patchRow(row.key, { name: event.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`第${index + 1}行成本价`} value={row.costPrice} inputMode="decimal" onChange={(event) => patchRow(row.key, { costPrice: event.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`第${index + 1}行材质`} value={row.material} onChange={(event) => patchRow(row.key, { material: event.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`第${index + 1}行重量`} value={row.weight} inputMode="decimal" onChange={(event) => patchRow(row.key, { weight: event.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`第${index + 1}行供应商`} value={row.supplier} onChange={(event) => patchRow(row.key, { supplier: event.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`第${index + 1}行补货周期`} value={row.replenishDays} inputMode="numeric" onChange={(event) => patchRow(row.key, { replenishDays: event.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`第${index + 1}行商品编码`} value={row.code} onChange={(event) => patchRow(row.key, { code: event.target.value })} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => setRows((list) => (list.length === 1 ? [emptyDraft()] : list.filter((item) => item.key !== row.key)))}
                      >
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={() => setRows((list) => [...list, emptyDraft()])}>
              添加一行
            </button>
            <button className="btn primary" type="submit">
              保存表格
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
