import { createServer as createHttpsServer } from 'node:https'
import { request as httpRequest } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const lanFiles = {
  key: resolve('.local/lan-key.pem'),
  cert: resolve('.local/lan-cert.pem'),
}
const lanHttps = existsSync(lanFiles.key) && existsSync(lanFiles.cert)

function lanIp() {
  for (const entries of Object.values(networkInterfaces())) {
    const item = entries?.find((entry) => entry.family === 'IPv4' && !entry.internal)
    if (item) return item.address
  }
  return '127.0.0.1'
}

function scanInbox(): Plugin {
  const token = randomUUID()
  const inboxFile = resolve('.local/scan-inbox.json')
  mkdirSync(resolve('.local'), { recursive: true })
  let events: { id: number; code?: string; photoId?: string; scannedAt: string }[] = []
  try {
    events = JSON.parse(readFileSync(inboxFile, 'utf8'))
  } catch {
    events = []
  }
  let nextId = events.reduce((max, event) => Math.max(max, event.id), 0) + 1
  const unauthorized = (res: any) => {
    res.statusCode = 401
    res.end('Unauthorized')
  }
  return {
    name: 'local-product-scan-inbox',
    configureServer(server) {
      if (lanHttps) {
        const proxy = createHttpsServer({ key: readFileSync(lanFiles.key), cert: readFileSync(lanFiles.cert) }, (req, res) => {
          if ((req.url ?? '').startsWith('/api/scan/session')) { res.writeHead(403); res.end('Forbidden'); return }
          const upstream = httpRequest({ hostname: '127.0.0.1', port: 5173, path: req.url, method: req.method, headers: req.headers }, (response) => {
            res.writeHead(response.statusCode ?? 502, response.headers)
            response.pipe(res)
          })
          upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Service unavailable') })
          req.pipe(upstream)
        })
        proxy.on('error', (error) => console.error('HTTPS 扫码端口启动失败:', error.message))
        server.httpServer?.once('listening', () => proxy.listen(5174, '0.0.0.0'))
        server.httpServer?.once('close', () => proxy.close())
      }
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/scan/')) return next()
        if (req.method === 'GET' && url.pathname === '/api/scan/session') {
          const remote = req.socket.remoteAddress ?? ''
          if (!remote.includes('127.0.0.1') && !remote.includes('::1')) return unauthorized(res)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ token, lanUrl: `${lanHttps ? 'https' : 'http'}://${lanIp()}:${lanHttps ? 5174 : server.config.server.port}`, caPath: resolve('.local/lan-ca.crt') }))
          return
        }
        if (url.searchParams.get('token') !== token) return unauthorized(res)
        if (req.method === 'GET' && /^\/api\/scan\/photo\/[a-f0-9-]{36}$/.test(url.pathname)) {
          const photoId = url.pathname.split('/').pop()!
          try {
            const photo = readFileSync(resolve('.local/scan-photos', `${photoId}.jpg`))
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Cache-Control', 'private, no-store')
            res.end(photo)
          } catch { res.statusCode = 404; res.end('Photo not found') }
          return
        }
        if (req.method === 'POST' && url.pathname === '/api/scan/photo') {
          try {
            const chunks: Buffer[] = []
            let size = 0
            for await (const chunk of req) {
              const bytes = Buffer.from(chunk)
              size += bytes.length
              if (size > 8 * 1024 * 1024) throw new Error('Photo too large')
              chunks.push(bytes)
            }
            const photo = Buffer.concat(chunks)
            if (photo.length < 4 || photo[0] !== 0xff || photo[1] !== 0xd8 || photo[2] !== 0xff) throw new Error('Invalid JPEG')
            const photoId = randomUUID()
            const folder = resolve('.local/scan-photos')
            mkdirSync(folder, { recursive: true })
            const path = resolve(folder, `${photoId}.jpg`)
            writeFileSync(path, photo, { flag: 'wx' })
            const event = { id: nextId++, photoId, scannedAt: new Date().toISOString() }
            try { writeFileSync(inboxFile, JSON.stringify([...events, event])) }
            catch (error) { unlinkSync(path); throw error }
            events.push(event)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch { res.statusCode = 400; res.end('Unable to save photo') }
          return
        }
        if (req.method === 'GET' && url.pathname === '/api/scan/poll') {
          const after = Number(url.searchParams.get('after') ?? 0)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(events.filter((event) => event.id > after)))
          return
        }
        if (req.method === 'POST' && url.pathname === '/api/scan/submit') {
          try {
            let body = ''
            for await (const chunk of req) {
              body += chunk
              if (body.length > 4096) throw new Error('too large')
            }
            const value = JSON.parse(body) as { code?: unknown }
            const code = typeof value.code === 'string' ? value.code.trim() : ''
            if (!code || code.length > 80) {
              res.statusCode = 400
              res.end('Invalid barcode')
              return
            }
            events.push({ id: nextId++, code, scannedAt: new Date().toISOString() })
            writeFileSync(inboxFile, JSON.stringify(events))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.statusCode = 400
            res.end('Invalid request')
          }
          return
        }
        res.statusCode = 404
        res.end('Not found')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), scanInbox()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
