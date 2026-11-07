import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { MobileScanPage } from './pages/MobileScanPage'
import { StoreProvider } from './store'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname === '/mobile-scan' ? <MobileScanPage /> : <StoreProvider><App /></StoreProvider>}
  </StrictMode>,
)
