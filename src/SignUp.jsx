import { useState, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, CheckCircle2, User, Globe } from 'lucide-react'

export default function SignUp({ onDone, goHome, switchToLogin, initialUsername = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState(
    initialUsername || sessionStorage.getItem('linksocio_claim_user') || ''
  )
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

  // Clean and sanitize username in real-time
  const cleanUsername = useMemo(() => {
    return username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_.-]/g, '')
  }, [username])

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, text: '', color: '#CBD5E1' }
    if (password.length < 6) return { score: 1, text: 'Too short (min 6 chars)', color: '#EF4444' }
    let score = 2
    if (password.length >= 8) score++
    if (/[0-9]/.test(password) && /[A-Z]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    if (score <= 2) return { score: 2, text: 'Fair', color: '#F59E0B' }
    if (score === 3) return { score: 3, text: 'Good', color: '#10B981' }
    return { score: 4, text: 'Strong', color: '#059669' }
  }, [password])

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')

    const finalUsername = cleanUsername
    if (!finalUsername || finalUsername.length < 2) {
      setError('Please choose a valid username (at least 2 characters).')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (signUpError) {
        setError(signUpError.message || 'Could not create account. Please check your details.')
        setLoading(false)
        return
      }

      if (data?.user?.id) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: finalUsername,
          display_name: finalUsername,
        })

        if (profileError) {
          // If profile insert fails (e.g. duplicate username), display clear message
          setError(
            profileError.message.includes('unique')
              ? 'This username is already taken. Please pick another one.'
              : profileError.message
          )
          setLoading(false)
          return
        }
      }

      setLoading(false)
      onDone()
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
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
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 550,
          height: 400,
          background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Top Header / Clickable Logo to return to Landing Page */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 24,
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

          <button
            type="button"
            onClick={handleGoHome}
            style={{
              marginTop: 6,
              background: 'none',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            <ArrowLeft size={13} />
            <span>Back to home</span>
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
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: 11.5,
                fontWeight: 700,
                color: '#15803D',
                marginBottom: 12,
              }}
            >
              <Sparkles size={13} color="#16A34A" />
              <span>🎁 14-Days Free Trial · No credit card required</span>
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
              Claim your Link in Bio
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: '#64748B',
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              One simple link for all your links, bookings & store.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username Field with Live Domain Prefix */}
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
                <User size={14} color="#64748B" />
                <span>Choose your username</span>
              </label>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#94A3B8',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  linksocio.com/
                </span>
                <input
                  type="text"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    padding: '12px 14px 12px 122px',
                    fontSize: 14,
                    fontWeight: 600,
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

              {/* Live Preview pill */}
              {cleanUsername && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 6,
                    fontSize: 11.5,
                    color: '#0D9488',
                    fontWeight: 600,
                  }}
                >
                  <Globe size={12} />
                  <span>Your URL: linksocio.com/{cleanUsername}</span>
                </div>
              )}
            </div>

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
                <span>Email address</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
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
                <Lock size={14} color="#64748B" />
                <span>Create password</span>
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    padding: '12px 42px 12px 14px',
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
                    right: 12,
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

              {/* Password Strength Indicator */}
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          height: 4,
                          flex: 1,
                          borderRadius: 2,
                          background: step <= passwordStrength.score ? passwordStrength.color : '#E2E8F0',
                          transition: 'background 0.2s ease',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
                    <span>Strength: <strong style={{ color: passwordStrength.color }}>{passwordStrength.text}</strong></span>
                    <span>Min. 6 characters</span>
                  </div>
                </div>
              )}
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
                marginTop: 6,
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
                  <span>Creating your page...</span>
                </>
              ) : (
                <>
                  <span>Create your free page</span>
                  <ArrowRight size={16} />
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
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Already signed up?</span>
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
          </div>

          {/* Switch to Login */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748B' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={switchToLogin}
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
                Log in here
              </button>
            </p>
          </div>
        </div>

        {/* Feature Highlights beneath Card */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            marginTop: 20,
            fontSize: 12,
            color: '#64748B',
            fontWeight: 500,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} color="#14B8A6" /> Unlimited Links
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} color="#14B8A6" /> Custom QR Codes
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} color="#14B8A6" /> Appointments & Menu
          </span>
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
