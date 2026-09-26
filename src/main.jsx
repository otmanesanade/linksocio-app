import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary'

// Clean up any stale service workers in development mode to prevent script caching issues
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (!import.meta.env.PROD) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister()
        }
      }).catch(() => {})
    } else {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA registration skipped:', err)
      })
    }
  }
} catch (e) {
  console.warn('SW error:', e)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

