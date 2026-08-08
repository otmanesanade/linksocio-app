import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function SignUp({ onDone, switchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.toLowerCase().trim(),
      display_name: username,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onDone()
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
        {/* Logo */}
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
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', textAlign: 'center', margin: 0 }}>
            Create your page
          </h1>
          <p style={{ fontSize: 13, color: '#8A97A3', textAlign: 'center', marginTop: 6, marginBottom: 28 }}>
            One link for everything you share.
          </p>

          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={prefixStyle}>linksocio.com/</span>
                <input
                  placeholder="mia"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingLeft: 118 }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ color: '#D85A30', fontSize: 13, margin: '4px 0 0' }}>{error}</p>
            )}

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
              {loading ? 'Creating your page...' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#8A97A3', marginTop: 20 }}>
          Already have an account?{' '}
          <button
            onClick={switchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#14B8A6',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#0F172A',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 12,
  border: '1px solid #E7EDEC',
  background: '#FBFCFC',
  padding: '11px 14px',
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
}

const prefixStyle = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: 13,
  color: '#8A97A3',
  pointerEvents: 'none',
}
