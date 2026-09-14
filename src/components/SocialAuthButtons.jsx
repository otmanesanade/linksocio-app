import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext'

export default function SocialAuthButtons({ mode = 'login', onError, onStart }) {
  const { t } = useLanguage()
  const [loadingProvider, setLoadingProvider] = useState(null)

  const handleOAuth = async (provider) => {
    try {
      setLoadingProvider(provider)
      if (onStart) onStart(provider)
      if (onError) onError('')

      // Redirect URL back to LinkSocio dashboard after successful OAuth
      const redirectTo = `${window.location.origin}/dashboard`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider, // 'google' or 'apple' (iCloud)
        options: {
          redirectTo,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'select_account',
          } : undefined,
        },
      })

      if (error) {
        throw error
      }
    } catch (err) {
      setLoadingProvider(null)
      const errorMsg =
        err?.message ||
        (provider === 'google'
          ? t('auth.googleError', 'Could not sign in with Google. Please try again.')
          : t('auth.appleError', 'Could not sign in with Apple / iCloud. Please try again.'))
      if (onError) onError(errorMsg)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {/* Google Button */}
      <button
        type="button"
        onClick={() => handleOAuth('google')}
        disabled={loadingProvider !== null}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '11px 16px',
          borderRadius: 12,
          border: '1.5px solid #E2E8F0',
          background: '#FFFFFF',
          color: '#0F172A',
          fontSize: 14,
          fontWeight: 600,
          cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!loadingProvider) {
            e.currentTarget.style.background = '#F8FAFC'
            e.currentTarget.style.borderColor = '#CBD5E1'
          }
        }}
        onMouseLeave={(e) => {
          if (!loadingProvider) {
            e.currentTarget.style.background = '#FFFFFF'
            e.currentTarget.style.borderColor = '#E2E8F0'
          }
        }}
      >
        {loadingProvider === 'google' ? (
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
          <svg width="18" height="18" viewBox="0 0 24 24">
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

      {/* Apple / iCloud Button */}
      <button
        type="button"
        onClick={() => handleOAuth('apple')}
        disabled={loadingProvider !== null}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '11px 16px',
          borderRadius: 12,
          border: '1.5px solid #0F172A',
          background: '#0F172A',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 4px rgba(15,23,42,0.1)',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!loadingProvider) {
            e.currentTarget.style.background = '#1E293B'
            e.currentTarget.style.borderColor = '#1E293B'
          }
        }}
        onMouseLeave={(e) => {
          if (!loadingProvider) {
            e.currentTarget.style.background = '#0F172A'
            e.currentTarget.style.borderColor = '#0F172A'
          }
        }}
      >
        {loadingProvider === 'apple' ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#FFFFFF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 0.92-2.84-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.71-.93 2.72 1.01.08 2.02-.48 2.64-1.23z" />
          </svg>
        )}
        <span>
          {isLogin
            ? t('auth.continueWithApple', 'Continue with Apple / iCloud')
            : t('auth.signUpWithApple', 'Sign up with Apple / iCloud')}
        </span>
      </button>
    </div>
  )
}
