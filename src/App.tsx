import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { today } from './format'
import { GoProvider } from './go'
import { isPage, NAV, type PageId } from './nav'
import { FinancePage } from './pages/FinancePage'
import { ComboPage } from './pages/ComboPage'
import { InboundPage } from './pages/InboundPage'
import { InventoryPage } from './pages/InventoryPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderSearchPage } from './pages/OrderSearchPage'
import { ProductInfoPage } from './pages/ProductInfoPage'
import { PurchasePage } from './pages/PurchasePage'
import { TransitPage } from './pages/TransitPage'
import { useStore } from './store'

const views: Record<PageId, ComponentType> = {
  orders: OrdersPage,
  'order-search': OrderSearchPage,
  'product-info': ProductInfoPage,
  combo: ComboPage,
  inventory: InventoryPage,
  purchase: PurchasePage,
  transit: TransitPage,
  inbound: InboundPage,
  finance: FinancePage,
}

function titleOf(id: PageId): string {
  for (const group of NAV) {
    const item = group.items.find((entry) => entry.id === id)
    if (item) return item.label
  }
  return '清哥ERP'
}

class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || '页面出错了' }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <h1>页面出错了</h1>
          <p>{this.state.error}</p>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const { data, toast, replaceData, clearData } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [createAsk, setCreateAsk] = useState(0)
  const [page, setPage] = useState<PageId>(() => {
    const id = location.hash.replace('#', '')
    return isPage(id) ? id : 'inventory'
  })
  const pending = data.purchases.filter((purchase) => purchase.receivedQty < purchase.qty).length
  const View = views[page]

  useEffect(() => {
    document.title = `${titleOf(page)} · 清哥ERP`
    if (location.hash !== `#${page}`) location.hash = page
  }, [page])

  useEffect(() => {
    const onHash = () => {
      const id = location.hash.replace('#', '')
      if (isPage(id)) setPage(id)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, ...data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `清哥ERP-${today()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function onImport(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result))
        if (!window.confirm('导入会覆盖当前数据。确定？')) return
        replaceData(raw)
      } catch {
        replaceData(null)
      }
    }
    reader.readAsText(file)
  }

  return (
    <GoProvider
      go={setPage}
      createAsk={createAsk}
      openProductCreate={() => {
        setPage('product-info')
        setCreateAsk((count) => count + 1)
      }}
    >
      <div className="shell">
        <aside className="nav">
          <div className="brand">
            <span className="brand-mark">清</span>
            <div>
              <strong>清哥ERP</strong>
              <small>进销存</small>
            </div>
          </div>
          {NAV.map((group) => (
            <div key={group.group}>
              <div className="group">{group.group}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={page === item.id ? 'item active' : 'item'}
                  aria-current={page === item.id ? 'page' : undefined}
                  onClick={() => setPage(item.id)}
                >
                  <span>{item.label}</span>
                  {item.note ? <span className="soon">{item.note}</span> : null}
                  {item.id === 'transit' && pending > 0 ? <span className="count">{pending}</span> : null}
                </button>
              ))}
            </div>
          ))}
          <div className="nav-foot">
            <p>今天 {today()}</p>
            <p>数据保存在本机浏览器。清理站点数据会丢失，需要时可导出。</p>
            <div className="nav-foot-actions">
              <button type="button" onClick={exportData}>
                导出
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}>
                导入
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('清空后无法恢复。确定清空全部数据？')) return
                  clearData()
                }}
              >
                清空
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                onImport(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </div>
        </aside>
        <main className="main">
          <Boundary key={page}>
            <View />
          </Boundary>
        </main>
        {toast ? (
          <div className={toast.kind === 'err' ? 'toast err' : 'toast'} role="status">
            {toast.text}
          </div>
        ) : null}
      </div>
    </GoProvider>
  )
}
