import { useState } from 'react'
import { supabase } from './supabaseClient'
import { ArrowLeft, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'

export default function ResetPassword({ goHome, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleGoHome = (e) => {
    if (e) e.preventDefault()
    if (goHome) {
      goHome()
    } else {
      window.location.href = '/'
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Failed to update password.')
      return
    }
    setDone(true)
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
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Top Header / Clickable Logo */}
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
            }}
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
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={28} />
              </div>

              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Password successfully updated
              </h1>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6, margin: '0 0 24px' }}>
                Your new password has been set. You can now sign in to your dashboard.
              </p>

              <button
                type="button"
                onClick={onDone}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '13px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Go to Sign in
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#F1F5F9',
                    padding: '4px 12px',
                    borderRadius: 100,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: 12,
                  }}
                >
                  <KeyRound size={13} />
                  <span>New Credentials</span>
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Set a new password
                </h1>
                <p style={{ fontSize: 13.5, color: '#64748B', marginTop: 6, marginBottom: 0 }}>
                  Enter and confirm your new secure password.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    <span>New password</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

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
                    <span>Confirm new password</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
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
                    }}
                  />
                </div>

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
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                  </div>
                )}

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
                  }}
                >
                  {loading ? 'Updating password...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
