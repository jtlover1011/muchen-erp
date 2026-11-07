import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export function MobileScanPage() {
  const video = useRef<HTMLVideoElement>(null)
  const reader = useRef<BrowserMultiFormatReader | null>(null)
  const controls = useRef<{ stop: () => void } | null>(null)
  const lastSent = useRef('')
  const token = new URLSearchParams(location.search).get('token') ?? ''
  const [status, setStatus] = useState('点击开启摄像头，扫描商品条码。')
  const [running, setRunning] = useState(false)
  const [sendingPhoto, setSendingPhoto] = useState(false)

  useEffect(() => () => controls.current?.stop(), [])

  async function start() {
    if (!token) { setStatus('配对链接无效，请在电脑扫码页重新配对。'); return }
    try {
      const codeReader = new BrowserMultiFormatReader()
      reader.current = codeReader
      setRunning(true)
      setStatus('正在启动摄像头…')
      controls.current = await codeReader.decodeFromVideoDevice(undefined, video.current!, async (result) => {
        if (!result) return
        const code = result.getText().trim()
        if (!code || code === lastSent.current) return
        lastSent.current = code
        try {
          const response = await fetch(`/api/scan/submit?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
          if (!response.ok) throw new Error('连接已失效，请重新扫描电脑上的配对码。')
          setStatus(`已同步：${code}`)
          window.setTimeout(() => { if (lastSent.current === code) lastSent.current = '' }, 1400)
        } catch (error) { setStatus(error instanceof Error ? error.message : '同步失败') }
      })
      setStatus('摄像头已开启，请对准商品条码。')
    } catch (error) {
      setRunning(false)
      setStatus(error instanceof Error ? `无法开启摄像头：${error.message}` : '无法开启摄像头，请检查浏览器权限。')
    }
  }

  function stop() {
    controls.current?.stop()
    controls.current = null
    setRunning(false)
    setStatus('摄像头已关闭。')
  }

  async function takePhoto() {
    const frame = video.current
    if (!frame || !frame.videoWidth || !frame.videoHeight) { setStatus('请先开启摄像头，等待画面出现。'); return }
    const canvas = document.createElement('canvas')
    canvas.width = frame.videoWidth
    canvas.height = frame.videoHeight
    const context = canvas.getContext('2d')
    if (!context) { setStatus('无法拍摄，请重试。'); return }
    context.drawImage(frame, 0, 0)
    setSendingPhoto(true)
    try {
      const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!photo) throw new Error('无法生成图片，请重试。')
      const response = await fetch(`/api/scan/photo?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: photo })
      if (!response.ok) throw new Error('图片发送失败，请检查连接并重试。')
      setStatus('照片已发送并保存到电脑。')
    } catch (error) { setStatus(error instanceof Error ? error.message : '图片发送失败。') }
    finally { setSendingPhoto(false) }
  }

  return <main className="mobile-scan"><h1>商品扫码</h1><p>{status}</p><video ref={video} muted playsInline />{running ? <button type="button" className="btn ghost" onClick={stop}>关闭摄像头</button> : <button type="button" className="btn primary" onClick={() => void start()}>开启摄像头</button>}<button type="button" className="btn primary" onClick={() => void takePhoto()} disabled={!running || sendingPhoto}>{sendingPhoto ? '正在发送…' : '拍摄并发送到电脑'}</button></main>
}
