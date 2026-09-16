import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('LinkSocio ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleHardReset = async () => {
    try {
      if (typeof window !== 'undefined') {
        // Clear all cached storage
        localStorage.clear()
        sessionStorage.clear()

        // Unregister service workers if any
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const reg of registrations) {
            await reg.unregister()
          }
        }

        // Clear CacheStorage API
        if ('caches' in window) {
          const cacheKeys = await caches.keys()
          for (const key of cacheKeys) {
            await caches.delete(key)
          }
        }
      }
    } catch (e) {
      console.warn('Cache clearing error:', e)
    } finally {
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0F172A',
            color: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: 500,
              width: '100%',
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 20,
              padding: 28,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                margin: '0 auto 16px',
              }}
            >
              ⚠️
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>
              Chargement interrompu / Recovery Mode
            </h2>

            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#94A3B8', lineHeight: 1.5 }}>
              Une erreur inattendue est survenue lors du chargement. Cliquez ci-dessous pour recharger l'application ou vider le cache corrompu.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '10px 14px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: '#F87171',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  maxHeight: 120,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  background: '#14B8A6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔄 Actualiser la page
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#F1F5F9',
                  border: '1px solid #475569',
                  borderRadius: 12,
                  padding: '11px 16px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🧹 Vider le cache & Réinitialiser
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = '/'
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#94A3B8',
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                🏠 Revenir à l'accueil
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
