import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

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
      setError(updateError.message)
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
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFA',
        padding: '48px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="34" height="34" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 20, fontWeight: 600 }}>
              <span style={{ color: '#0F172A' }}>Link</span>
              <span style={{ color: '#14B8A6' }}>Socio</span>
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: 28,
            border: '1px solid #E7EDEC',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            padding: '36px 28px 32px',
          }}
        >
          {done ? (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', textAlign: 'center', margin: 0 }}>
                Password updated
              </h1>
              <p style={{ fontSize: 13, color: '#8A97A3', textAlign: 'center', marginTop: 10, marginBottom: 24 }}>
                You can now log in with your new password.
              </p>
              <button
                onClick={onDone}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '13px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Go to log in
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', textAlign: 'center', margin: 0 }}>
                Choose a new password
              </h1>
              <p style={{ fontSize: 13, color: '#8A97A3', textAlign: 'center', marginTop: 6, marginBottom: 28 }}>
                Make it something you'll remember.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>New password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirm password</label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                {error && <p style={{ color: '#D85A30', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 8,
                    background: loading ? '#5DCAA5' : '#0F172A',
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    padding: '13px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#0F172A', marginBottom: 6 }
const inputStyle = { width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid #E7EDEC', background: '#FBFCFC', padding: '11px 14px', fontSize: 14, color: '#0F172A', outline: 'none' }
