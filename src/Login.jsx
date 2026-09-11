import { useState } from 'react'
import { supabase } from './supabaseClient'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import LanguageSwitcher from './components/LanguageSwitcher'
import { useLanguage } from './context/LanguageContext'

export default function Login({ onDone, goHome, switchToSignUp, switchToForgot }) {
  const { t, isRTL } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoHome = (e) => {
    if (e) e.preventDefault()
    if (goHome) {
      goHome()
    } else {
      window.location.href = '/'
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) {
        setError(loginError.message || t('auth.invalidCredentials', 'Invalid email or password. Please try again.'))
        setLoading(false)
        return
      }

      setLoading(false)
      onDone()
    } catch (err) {
      setError(err?.message || t('common.error', 'An unexpected error occurred. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #F0FDF4 0%, #F8FAFC 50%, #FFFFFF 100%)',
        padding: '32px 16px 48px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Decorative Glow */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 350,
          background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Top Controls: Back to Home + Language Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            padding: '0 4px',
          }}
        >
          <button
            type="button"
            onClick={handleGoHome}
            style={{
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #E2E8F0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 100,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={13} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            <span>{t('common.back', 'Back')}</span>
          </button>

          <LanguageSwitcher variant="pill" />
        </div>

        {/* Top Logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={handleGoHome}
            title="Return to LinkSocio Home"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px',
              borderRadius: 100,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <svg width="34" height="34" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span style={{ color: '#0F172A' }}>Link</span>
              <span style={{ color: '#14B8A6' }}>Socio</span>
            </span>
          </button>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -15px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.03)',
            padding: '36px 32px 32px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header Title inside Card */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#F0FDFA',
                border: '1px solid #CCFBF1',
                padding: '4px 10px',
                borderRadius: 100,
                fontSize: 11.5,
                fontWeight: 700,
                color: '#0F766E',
                marginBottom: 12,
              }}
            >
              <ShieldCheck size={13} />
              <span>{t('auth.secureAccess', 'Secure Access')}</span>
            </div>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {t('auth.welcomeBack', 'Welcome back')}
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: '#64748B',
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              {t('auth.loginSub', 'Log in to manage your link in bio & profile.')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 7,
                }}
              >
                <Mail size={14} color="#64748B" />
                <span>{t('auth.email', 'Email address')}</span>
              </label>
              <input
                type="email"
                placeholder={t('auth.emailPlaceholder', 'name@example.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 12,
                  border: '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  fontSize: 14,
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#14B8A6'
                  e.target.style.background = '#FFFFFF'
                  e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0'
                  e.target.style.background = '#F8FAFC'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    margin: 0,
                  }}
                >
                  <Lock size={14} color="#64748B" />
                  <span>{t('auth.password', 'Password')}</span>
                </label>

                <button
                  type="button"
                  onClick={switchToForgot}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0D9488',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0F766E')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#0D9488')}
                >
                  {t('auth.forgotPassword', 'Forgot password?')}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    padding: isRTL ? '12px 14px 12px 42px' : '12px 42px 12px 14px',
                    fontSize: 14,
                    color: '#0F172A',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#14B8A6'
                    e.target.style.background = '#FFFFFF'
                    e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.15)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0'
                    e.target.style.background = '#F8FAFC'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: isRTL ? 'auto' : 12,
                    left: isRTL ? 12 : 'auto',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  color: '#B91C1C',
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                width: '100%',
                background: loading ? '#64748B' : '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: '13px 18px',
                fontSize: 14.5,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#1E293B'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#0F172A'
                  e.currentTarget.style.transform = 'none'
                }
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>{t('common.loading', 'Signing in...')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.loginBtn', 'Sign in to Dashboard')}</span>
                  <ArrowRight size={16} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0 20px',
              color: '#CBD5E1',
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{t('common.or', 'or')}</span>
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
          </div>

          {/* Switch to Sign Up */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748B' }}>
              {t('auth.noAccount', "Don't have an account yet?")}{' '}
              <button
                type="button"
                onClick={switchToSignUp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0D9488',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {t('auth.createAccount', 'Create your page free')}
              </button>
            </p>
          </div>
        </div>

        {/* Bottom Trust Note */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#94A3B8' }}>
          <p style={{ margin: 0 }}>
            {t('auth.sslProtected', 'Protected by SSL Encryption · LinkSocio © {year}').replace('{year}', new Date().getFullYear())}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
