import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext'

export default function SocialAuthButtons({ mode = 'login', onError, onStart }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      if (onStart) onStart('google')

      // Use the actual current origin (e.g. https://www.linksocio.com/ or https://ais-dev-.../)
      const rawOrigin = window.location.origin
      const safeOrigin = rawOrigin.replace('ais-pre-', 'ais-dev-')
      const redirectTo = safeOrigin.endsWith('/') ? safeOrigin : `${safeOrigin}/`

      // Detect if the app is embedded inside an iframe (like AI Studio preview sandbox)
      const isInIframe = (() => {
        try {
          return window.self !== window.top
        } catch (e) {
          return true
        }
      })()

      if (isInIframe) {
        // When inside an iframe, Google OAuth cannot be loaded inside the iframe
        // because Google serves X-Frame-Options: DENY.
        // We obtain the authorize URL and open it in a real top window or popup.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        })

        if (error) throw error

        if (data?.url) {
          let navigatedTop = false
          try {
            if (window.top && window.top.location) {
              window.top.location.href = data.url
              navigatedTop = true
            }
          } catch (e) {
            navigatedTop = false
          }

          if (!navigatedTop) {
            const popup = window.open(data.url, 'google_oauth_popup', 'width=520,height=650,left=150,top=100')
            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
              window.open(data.url, '_blank')
            }
          }
        }
      } else {
        // Direct browser navigation on real domains (e.g. https://www.linksocio.com)
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        })
        if (error) throw error
      }
    } catch (err) {
      console.error('Google authentication error:', err)
      if (onError) onError(err?.message || 'Google authentication failed. Please try again.')
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {/* Official Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '11.5px 16px',
          borderRadius: 12,
          border: '1.5px solid #E2E8F0',
          background: '#FFFFFF',
          color: '#0F172A',
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#F8FAFC'
            e.currentTarget.style.borderColor = '#CBD5E1'
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#FFFFFF'
            e.currentTarget.style.borderColor = '#E2E8F0'
          }
        }}
      >
        {loading ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid #CBD5E1',
              borderTopColor: '#0F172A',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>
          {isLogin
            ? t('auth.continueWithGoogle', 'Continue with Google')
            : t('auth.signUpWithGoogle', 'Sign up with Google')}
        </span>
      </button>
    </div>
  )
}
