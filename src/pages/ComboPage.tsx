import { useMemo, useRef, useState } from 'react'
import { hit, money, qty, round2, uid } from '../format'
import { readImageFile } from '../image'
import { comboAvailability, findProduct } from '../model'
import { useOpenProductCreate } from '../go'
import { useStore } from '../store'
import type { Combo, ComboInput } from '../types'
import { Empty, Modal, Page, Pager, Thumb, usePager } from '../ui'

type Line = { key: string; productId: string; qty: string }

function blankLine(): Line {
  return { key: uid(), productId: '', qty: '' }
}

function comboCost(combo: Combo, products: { id: string; costPrice: number }[]): number {
  return round2(
    combo.lines.reduce((total, line) => {
      const product = products.find((item) => item.id === line.productId)
      return total + (product ? round2(product.costPrice * line.qty) : 0)
    }, 0),
  )
}

export function ComboPage() {
  const { data, saveCombo, removeCombo, notify } = useStore()
  const openProductCreate = useOpenProductCreate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [image, setImage] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [lines, setLines] = useState<Line[]>([blankLine(), blankLine()])
  const fileRef = useRef<HTMLInputElement>(null)
  const combos = data.combos ?? []
  const rows = useMemo(
    () => combos.filter((combo) => hit(query, [combo.code, combo.name, ...combo.lines.map((line) => findProduct(data, line.productId)?.name ?? '')])),
    [combos, data, query],
  )
  const pager = usePager(rows, query)
  const draftCost = round2(
    lines.reduce((total, line) => {
      const product = findProduct(data, line.productId)
      if (!product || !/^\d+$/.test(line.qty.trim())) return total
      return total + round2(product.costPrice * Number(line.qty.trim()))
    }, 0),
  )

  function patchLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function openCreate() {
    setImage('')
    setCode('')
    setName('')
    setLines([blankLine(), blankLine()])
    setOpen(true)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      setImage(await readImageFile(file))
    } catch (error) {
      notify(error instanceof Error ? error.message : '图片读取失败', 'err')
    }
  }

  function submit() {
    const input: ComboInput = { image, code, name, lines: lines.map((line) => ({ productId: line.productId, qty: line.qty })) }
    if (!saveCombo(input)) return
    setOpen(false)
  }

  return (
    <Page
      kicker="商品"
      title="组合商品信息"
      desc="成本价按单个商品成本价乘每套数量自动相加。某个商品没有库存时，组合可用数为 0，并标出缺的商品。"
      extra={
        <>
          <input className="search" value={query} placeholder="搜编码、名称" onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className="btn primary" onClick={openCreate}>
            新增组合商品
          </button>
        </>
      }
    >
      <div className="card">
        {combos.length === 0 ? (
          <Empty text="还没有组合商品。" action="新增组合商品" onAction={openCreate} />
        ) : rows.length === 0 ? (
          <Empty text="没有符合的组合。" />
        ) : (
          <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>组合图片</th>
                  <th>组合编码</th>
                  <th>组合名称</th>
                  <th className="num">成本价(元)</th>
                  <th className="num">组合可用数</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((combo) => {
                  const stock = comboAvailability(data, combo)
                  return (
                  <tr key={combo.id} className={stock.available <= 0 ? 'zero' : undefined}>
                    <td>
                      <Thumb src={combo.image} name={combo.name || combo.code} />
                    </td>
                    <td>{combo.code}</td>
                    <td>{combo.name || '—'}</td>
                    <td className="num">{money(comboCost(combo, data.products))}</td>
                    <td className="num">
                      <div className={stock.missing.length ? 'neg' : undefined}>{qty(stock.available)}</div>
                      {stock.missing.length ? <div className="miss">{stock.missing.map((item) => `${item}缺失`).join('，')}</div> : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => {
                          if (!window.confirm(`删除组合 ${combo.code}？已发过货的不能删。`)) return
                          removeCombo(combo.id)
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
      {open ? (
        <Modal title="新增组合商品" onClose={() => setOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <div className="field">
              <span>组合图片</span>
              <div className="image-row">
                <Thumb src={image} name={name || '组'} lg />
                <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
                  上传图片
                </button>
                {image ? (
                  <button type="button" className="btn danger" onClick={() => setImage('')}>
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
            <label className="field">
              <span>组合编码</span>
              <input value={code} required placeholder="另外编一个，不要用商品编码" onChange={(event) => setCode(event.target.value)} autoComplete="off" />
            </label>
            <label className="field">
              <span>组合名称</span>
              <input value={name} required onChange={(event) => setName(event.target.value)} autoComplete="off" />
            </label>
            <div className="lines">
              {lines.map((line, index) => (
                <div className="line" key={line.key}>
                  <label className="field">
                    <span>商品编码</span>
                    <select required value={line.productId} onChange={(event) => patchLine(line.key, { productId: event.target.value })}>
                      <option value="">选择商品</option>
                      {data.products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} {product.name}（成本 {money(product.costPrice)}）
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>每套数量</span>
                    <input required value={line.qty} inputMode="numeric" aria-label={`第${index + 1}行每套数量`} onChange={(event) => patchLine(line.key, { qty: event.target.value })} />
                  </label>
                  <button
                    type="button"
                    className="btn danger line-remove"
                    onClick={() => setLines((current) => (current.length <= 2 ? current : current.filter((item) => item.key !== line.key)))}
                  >
                    移除
                  </button>
                </div>
              ))}
              <button type="button" className="btn ghost" onClick={() => setLines((current) => [...current, blankLine()])}>
                添加商品
              </button>
            </div>
            <label className="field">
              <span>成本价（元）</span>
              <input value={money(draftCost)} readOnly />
            </label>
            <p className="sheet-note">图片、编码、名称、商品和每套数量都要填。同一套商品和数量不能再组一次。</p>
            {data.products.length < 2 ? <p className="sheet-note">至少要有两个商品，才能组成一套。</p> : null}
            <div className="form-actions">
              {data.products.length < 2 ? (
                <button type="button" className="btn ghost" onClick={openProductCreate}>
                  去建档
                </button>
              ) : null}
              <button className="btn primary" type="submit">
                保存组合
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  )
}
