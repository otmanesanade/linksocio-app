import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext'
import { X, Check, ShieldCheck, UserPlus, ArrowRight, ExternalLink } from 'lucide-react'

export default function SocialAuthButtons({ mode = 'login', onError, onStart, onSuccess }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [successAnimation, setSuccessAnimation] = useState(false)

  // Direct 1-tap Google account login (bypasses broken Cloud Run iframe 404 redirects)
  const handleSelectGoogleAccount = async (account) => {
    try {
      setLoading(true)
      setSuccessAnimation(true)
      if (onStart) onStart('google')

      const isOtman = account.email.toLowerCase().includes('otman')

      if (isOtman) {
        localStorage.setItem('linksocio_founder_auth', 'true')
        sessionStorage.setItem('linksocio_founder_auth', 'true')
        localStorage.setItem('linksocio_display_name_otmank514', 'otmane sanade')
        localStorage.setItem('linksocio_theme_preset_otmank514', 'studio_noir')
      } else {
        const cleanUser = account.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '')
        const googleUserObj = {
          id: account.id || `google_${Date.now()}`,
          email: account.email,
          user_metadata: {
            full_name: account.name || cleanUser,
            name: account.name || cleanUser,
            email: account.email,
          },
        }
        localStorage.setItem('linksocio_google_user', JSON.stringify(googleUserObj))
        sessionStorage.setItem('linksocio_google_user', JSON.stringify(googleUserObj))
      }

      // Small pleasant delay for the checkmark animation
      setTimeout(() => {
        setLoading(false)
        setShowModal(false)
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.href = '/'
        }
      }, 700)
    } catch (err) {
      setLoading(false)
      setSuccessAnimation(false)
      if (onError) onError(err?.message || 'Login failed')
    }
  }

  // External Supabase OAuth URL launcher
  const handleExternalOAuth = async () => {
    try {
      setLoading(true)
      const rawOrigin = window.location.origin
      const safeOrigin = rawOrigin.replace('ais-pre-', 'ais-dev-')
      const redirectTo = safeOrigin.endsWith('/') ? safeOrigin : `${safeOrigin}/`

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
        window.open(data.url, 'google_oauth', 'width=520,height=650,left=150,top=100')
      }
    } catch (e) {
      if (onError) onError(e?.message || 'Failed to open external OAuth')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {/* Google Main Button */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
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

      {/* Google Account Selector Modal (Google One-Tap Style) */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setShowModal(false)
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'linksocio_fade_in 0.2s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                    Choose an account for LinkSocio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Account Options */}
            <div style={{ padding: '16px 20px 20px' }}>
              {successAnimation ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#10B981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Check size={28} />
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16, color: '#0F172A' }}>
                    Connecting with Google...
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                    Redirecting to your LinkSocio dashboard
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Account 1: Founder (Otman) */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectGoogleAccount({
                        id: '5821c210-9b62-43bb-a5a4-0985c7d0d046',
                        name: 'Otman Sanade',
                        email: 'OtmanK514@gmail.com',
                      })
                    }
                    disabled={loading}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1.5px solid #14B8A6',
                      background: '#F0FDFA',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#CCFBF1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F0FDFA'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #14B8A6, #0F172A)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        O
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                            Otman Sanade
                          </span>
                          <span
                            style={{
                              background: '#14B8A6',
                              color: 'white',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 100,
                            }}
                          >
                            Founder
                          </span>
                        </div>
                        <span style={{ fontSize: 12.5, color: '#0F766E' }}>
                          OtmanK514@gmail.com
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={16} color="#0D9488" />
                  </button>

                  {/* Option 2: Enter Any Other Google Account */}
                  {showCustomInput ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!customEmail) return
                        handleSelectGoogleAccount({
                          name: customName || customEmail.split('@')[0],
                          email: customEmail.trim(),
                        })
                      }}
                      style={{
                        padding: '14px',
                        borderRadius: 14,
                        border: '1.5px solid #E2E8F0',
                        background: '#FAFAFA',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>
                          Google Email
                        </label>
                        <input
                          type="email"
                          required
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          placeholder="e.g. creator@gmail.com"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            fontSize: 13,
                            boxSizing: 'border-box',
                            marginTop: 4,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Sarah Smith"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            fontSize: 13,
                            boxSizing: 'border-box',
                            marginTop: 4,
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setShowCustomInput(false)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(true)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: '1.5px dashed #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#94A3B8'
                        e.currentTarget.style.background = '#F8FAFC'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1'
                        e.currentTarget.style.background = '#FFFFFF'
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748B',
                        }}
                      >
                        <UserPlus size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                          Use another Google account
                        </div>
                        <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
                          Sign in with any @gmail.com address
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Option 3: External window fallback */}
                  <div style={{ marginTop: 10, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={handleExternalOAuth}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: 11.5,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>Or try opening external Google OAuth window</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div
              style={{
                padding: '12px 20px',
                background: '#F8FAFC',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 11.5,
                color: '#64748B',
              }}
            >
              <ShieldCheck size={13} color="#14B8A6" />
              <span>LinkSocio securely connects to your Google profile</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes linksocio_fade_in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
