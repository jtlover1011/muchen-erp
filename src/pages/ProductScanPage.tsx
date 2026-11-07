import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { draftFromProduct } from '../model'
import { useStore } from '../store'
import { Empty, Page, Thumb } from '../ui'

type ScanEvent = { id: number; code?: string; photoId?: string; scannedAt: string }

export function ProductScanPage() {
  const { data, saveProduct } = useStore()
  const [token, setToken] = useState('')
  const [lanUrl, setLanUrl] = useState('')
  const [caPath, setCaPath] = useState('')
  const [qr, setQr] = useState('')
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [after, setAfter] = useState(0)
  const [error, setError] = useState('')
  const [binding, setBinding] = useState<Record<number, string>>({})
  const matched = useMemo(
    () => (code: string) => data.products.find((product) => product.barcode === code),
    [data.products],
  )

  useEffect(() => {
    let alive = true
    fetch('/api/scan/session')
      .then((response) => {
        if (!response.ok) throw new Error('请在电脑本机打开此页以创建手机配对码。')
        return response.json()
      })
      .then(async ({ token: nextToken, lanUrl: nextUrl, caPath: nextCaPath }) => {
        if (!alive) return
        setToken(nextToken)
        setLanUrl(nextUrl)
        setCaPath(nextCaPath)
        setQr(await QRCode.toDataURL(`${nextUrl}/mobile-scan?token=${encodeURIComponent(nextToken)}`, { width: 220, margin: 1 }))
      })
      .catch((reason) => alive && setError(reason instanceof Error ? reason.message : '无法创建配对码'))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!token) return
    let alive = true
    const poll = async () => {
      try {
        const response = await fetch(`/api/scan/poll?token=${encodeURIComponent(token)}&after=${after}`)
        if (!response.ok) throw new Error('扫码连接已失效，请刷新本页重新配对。')
        const next = (await response.json()) as ScanEvent[]
        if (!alive || !next.length) return
        setEvents((current) => [...current, ...next])
        setAfter(next[next.length - 1].id)
      } catch (reason) {
        if (alive) setError(reason instanceof Error ? reason.message : '扫码连接中断')
      }
    }
    const timer = window.setInterval(() => void poll(), 900)
    return () => { alive = false; window.clearInterval(timer) }
  }, [after, token])

  function bind(event: ScanEvent) {
    const product = data.products.find((item) => item.id === binding[event.id])
    if (!product || !event.code) return
    const draft = draftFromProduct(product)
    draft.barcode = event.code
    if (saveProduct(draft, product.id)) setBinding((current) => ({ ...current, [event.id]: '' }))
  }

  return (
    <Page kicker="商品" title="商品扫码" desc="手机与电脑连接同一 Wi‑Fi，扫描商品条码后结果会同步显示在这里。">
      <div className="card card-pad scan-pair">
        <div>
          <h3>用手机打开扫描器</h3>
          <p className="sheet-note">用手机相机或扫码软件扫描此二维码。首次使用需在手机上信任本机 HTTPS 证书。</p>
          {caPath ? <p className="sheet-note">先将电脑上的证书文件 AirDrop 到手机并安装信任：{caPath}</p> : null}
          {lanUrl ? <p className="scan-url">{lanUrl}/mobile-scan</p> : null}
          {error ? <p className="warn-line">{error}</p> : null}
        </div>
        {qr ? <img src={qr} alt="手机扫描器配对二维码" width="220" height="220" /> : null}
      </div>
      <div className="card">
        <h3 className="block-title">扫描记录</h3>
        {events.length === 0 ? <Empty text="等待手机扫描商品条码。" /> : (
          <div className="table-wrap">
            <table><thead><tr><th>条码</th><th>匹配商品</th><th>图片</th><th>处理</th></tr></thead>
              <tbody>{events.slice().reverse().map((event) => {
                const product = event.code ? matched(event.code) : undefined
                const photoUrl = event.photoId ? `/api/scan/photo/${event.photoId}?token=${encodeURIComponent(token)}` : ''
                if (photoUrl) return <tr key={event.id}><td>拍摄照片</td><td>待处理</td><td><a href={photoUrl} target="_blank" rel="noreferrer"><Thumb src={photoUrl} name="手机拍摄的照片" /></a></td><td><a href={photoUrl} download={`商品照片-${event.id}.jpg`}>下载照片</a></td></tr>
                return <tr key={event.id}><td>{event.code}</td><td>{product?.name ?? '未匹配'}</td><td>{product ? <Thumb src={product.image} name={product.name} /> : '—'}</td><td>{product ? '已匹配' : <span className="scan-bind"><select value={binding[event.id] ?? ''} onChange={(e) => setBinding((current) => ({ ...current, [event.id]: e.target.value }))}><option value="">选择商品关联</option>{data.products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><button type="button" className="btn ghost" onClick={() => bind(event)}>绑定条码</button></span>}</td></tr>
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}
