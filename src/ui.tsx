import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { sum } from './format'

export function usePager<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const pages = Math.max(1, Math.ceil(items.length / size))
  useEffect(() => {
    setPage(1)
  }, [resetKey])
  useEffect(() => {
    setPage((current) => Math.min(current, pages))
  }, [pages])
  const safe = Math.min(page, pages)
  const start = (safe - 1) * size
  return {
    page: safe,
    pages,
    size,
    total: items.length,
    slice: items.slice(start, start + size),
    setPage,
    setSize: (next: number) => {
      setSize(next)
      setPage(1)
    },
  }
}

export function Pager({
  page,
  pages,
  total,
  size,
  onPage,
  onSize,
}: {
  page: number
  pages: number
  total: number
  size: number
  onPage: (page: number) => void
  onSize: (size: number) => void
}) {
  return (
    <div className="pager">
      <span>共 {total} 条</span>
      <label>
        每页
        <select aria-label="每页条数" value={size} onChange={(event) => onSize(Number(event.target.value))}>
          {[10, 20, 50].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
        条
      </label>
      <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        上一页
      </button>
      <span>
        {page} / {pages}
      </span>
      <button type="button" className="btn ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        下一页
      </button>
    </div>
  )
}

export function Page({
  kicker,
  title,
  desc,
  extra,
  children,
}: {
  kicker: string
  title: string
  desc?: string
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="kicker" data-mod={kicker}>
            {kicker}
          </p>
          <h1>{title}</h1>
          {desc ? <p className="desc">{desc}</p> : null}
        </div>
        {extra ? <div className="page-extra">{extra}</div> : null}
      </header>
      {children}
    </section>
  )
}

export function Empty({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {action && onAction ? (
        <button type="button" className="btn ghost" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  )
}

export function Stat({ k, v, sub, tone }: { k: string; v: string | number; sub?: string; tone?: 'neg' | 'pos' }) {
  return (
    <div className="card stat">
      <div className="k">{k}</div>
      <div className={tone ? `v ${tone}` : 'v'}>{v}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  )
}

export function Thumb({ src, name, lg }: { src: string; name: string; lg?: boolean }) {
  const cls = lg ? 'thumb lg' : 'thumb'
  if (src) return <img className={cls} src={src} alt="" />
  return <span className={cls}>{name.trim().slice(0, 1) || '品'}</span>
}

export function Spark({ values }: { values: number[] }) {
  const w = 88
  const h = 26
  const max = Math.max(1, ...values)
  const step = values.length > 1 ? w / (values.length - 1) : 0
  const points = values
    .map((value, index) => {
      const x = index * step
      const y = h - 2 - (value / max) * (h - 6)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={points} />
    </svg>
  )
}

export function Bars({ series, showLabels }: { series: { date: string; qty: number }[]; showLabels?: boolean }) {
  const max = Math.max(1, ...series.map((item) => item.qty))
  const total = sum(series.map((item) => item.qty))
  return (
    <div className="chart">
      <div className="bars">
        {series.map((item) => (
          <div key={item.date} className="bar-col" title={`${item.date} 销售 ${item.qty}`}>
            <div className="bar-track">
              <div className={item.qty ? 'bar-fill' : 'bar-fill zero'} style={{ height: item.qty ? `${(item.qty / max) * 100}%` : '2px' }} />
            </div>
            {showLabels ? <span>{item.date.slice(5)}</span> : null}
          </div>
        ))}
      </div>
      <p className="chart-foot">
        {series[0]?.date} 至 {series[series.length - 1]?.date}，合计 {total}
      </p>
    </div>
  )
}

function LineChart({ series }: { series: { date: string; qty: number }[] }) {
  const w = 256
  const h = 88
  const max = Math.max(1, ...series.map((item) => item.qty))
  const step = series.length > 1 ? w / (series.length - 1) : 0
  const points = series.map((item, index) => {
    const x = index * step
    const y = h - 10 - (item.qty / max) * (h - 18)
    return { x, y, ...item }
  })
  const total = sum(series.map((item) => item.qty))
  return (
    <div className="chart">
      <svg className="line-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="销售趋势折线">
        <polyline fill="none" stroke="#8c3d16" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')} />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r={series.length > 10 ? 1.6 : 2.6} fill="#8c3d16">
            <title>
              {point.date} 销售 {point.qty}
            </title>
          </circle>
        ))}
      </svg>
      <p className="chart-foot">
        {series[0]?.date} 至 {series[series.length - 1]?.date}，合计 {total}
      </p>
    </div>
  )
}

export function SalesTrend({ name, seriesFor }: { name: string; seriesFor: (days: 7 | 30) => { date: string; qty: number }[] }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<7 | 30>(7)
  const [place, setPlace] = useState({ top: 0, left: 0 })
  const root = useRef<HTMLDivElement>(null)
  const series = seriesFor(days)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const width = 300
    const height = 230
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const below = rect.bottom + 8
    const top = below + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : below
    setPlace({ top, left })
    setOpen(true)
  }

  return (
    <div className="trend-pop" ref={root} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="btn text" onClick={toggle}>
        销售趋势
      </button>
      {open ? (
        <div className="bubble" style={{ top: place.top, left: place.left }} role="dialog" aria-label={`${name}销售趋势`}>
          <strong>{name}</strong>
          <LineChart series={series} />
          <div className="bubble-tabs">
            <button type="button" className={days === 7 ? 'on' : ''} onClick={() => setDays(7)}>
              7天
            </button>
            <button type="button" className={days === 30 ? 'on' : ''} onClick={() => setDays(30)}>
              30天
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Badge({ status }: { status: '待入库' | '部分入库' | '已入库' }) {
  const cls = status === '已入库' ? 'ok' : status === '部分入库' ? 'mid' : 'wait'
  return <span className={`badge ${cls}`}>{status}</span>
}

export function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={wide ? 'modal wide' : 'modal'} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            关闭
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function Held({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <Page kicker={kicker} title={title}>
      <div className="card card-pad held">
        <p>{text}</p>
      </div>
    </Page>
  )
}
