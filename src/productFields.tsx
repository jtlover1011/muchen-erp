import { useRef } from 'react'
import { readImageFile } from './image'
import { useStore } from './store'
import type { ProductDraft } from './types'
import { Thumb } from './ui'

export function ProductFields({
  draft,
  onChange,
  allowGenerate,
}: {
  draft: ProductDraft
  onChange: (patch: Partial<ProductDraft>) => void
  allowGenerate?: boolean
}) {
  const { suggestCode, notify } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      onChange({ image: await readImageFile(file) })
    } catch (error) {
      notify(error instanceof Error ? error.message : '图片读取失败', 'err')
    }
  }

  return (
    <div className="form-grid">
      <label className="field">
        <span>商品名称</span>
        <input value={draft.name} required onChange={(event) => onChange({ name: event.target.value })} autoComplete="off" />
      </label>
      <label className="field">
        <span>商品编码</span>
        <span className="code-line">
          <input value={draft.code} required onChange={(event) => onChange({ code: event.target.value })} autoComplete="off" />
          {allowGenerate ? (
            <button type="button" className="btn ghost" onClick={() => onChange({ code: suggestCode() })}>
              生成编码
            </button>
          ) : null}
        </span>
      </label>
      <label className="field">
        <span>成本价（元）</span>
        <input value={draft.costPrice} required inputMode="decimal" onChange={(event) => onChange({ costPrice: event.target.value })} autoComplete="off" />
      </label>
      <label className="field">
        <span>材质</span>
        <input value={draft.material} required onChange={(event) => onChange({ material: event.target.value })} autoComplete="off" />
      </label>
      <label className="field">
        <span>重量（kg）</span>
        <input value={draft.weight} required inputMode="decimal" onChange={(event) => onChange({ weight: event.target.value })} autoComplete="off" />
      </label>
      <label className="field">
        <span>供应商</span>
        <input value={draft.supplier} required onChange={(event) => onChange({ supplier: event.target.value })} autoComplete="off" />
      </label>
      <label className="field">
        <span>补货周期（天）</span>
        <input value={draft.replenishDays} required inputMode="numeric" onChange={(event) => onChange({ replenishDays: event.target.value })} autoComplete="off" />
      </label>
      <div className="field span-2">
        <span>商品图片</span>
        <div className="image-row">
          <Thumb src={draft.image} name={draft.name} lg />
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            上传图片
          </button>
          {draft.image ? (
            <button type="button" className="btn danger" onClick={() => onChange({ image: '' })}>
              移除
            </button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void onFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}
