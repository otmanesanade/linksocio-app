import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SignUp from './SignUp'
import Login from './Login'
import Dashboard from './Dashboard'
import PublicProfile from './PublicProfile'
import LandingPage from './LandingPage'
import PrivacyPolicy from './PrivacyPolicy'
import TermsOfService from './TermsOfService'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  function getCleanPath() {
    const raw = window.location.pathname.replace(/^\/+|\/+$/g, '')
    return raw.split('/')[0] || ''
  }

  const [path, setPath] = useState(getCleanPath())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setChecking(false)
    })

    function onPopState() {
      setPath(getCleanPath())
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  function goTo(newPath) {
    window.history.pushState({}, '', newPath ? `/${newPath}` : '/')
    setPath(newPath ? newPath.replace(/^\/+|\/+$/g, '').split('/')[0] : '')
  }

  const reservedPaths = [
    'dashboard',
    'billing',
    'settings',
    'login',
    'signup',
    'privacy',
    'terms',
    'forgot-password',
    'reset-password',
  ]

  if (path === 'privacy') return <PrivacyPolicy goBack={() => goTo('')} />
  if (path === 'terms') return <TermsOfService goBack={() => goTo('')} />
  if (path === 'forgot-password') return <ForgotPassword goHome={() => goTo('')} switchToLogin={() => goTo('login')} />
  if (path === 'reset-password') return <ResetPassword goHome={() => goTo('')} onDone={() => goTo('login')} />

  if (path && !reservedPaths.includes(path)) {
    return <PublicProfile username={path.toLowerCase()} />
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B', fontFamily: 'system-ui, sans-serif' }}>
          <div
            style={{
              width: 38,
              height: 38,
              border: '3px solid #E2E8F0',
              borderTopColor: '#14B8A6',
              borderRadius: '50%',
              animation: 'linksocio_spin 0.8s linear infinite',
              margin: '0 auto 14px',
            }}
          />
          <style>{`@keyframes linksocio_spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#334155' }}>Loading LinkSocio...</p>
        </div>
      </div>
    )
  }

  // Dashboard, Billing & Settings routes
  if (path === 'dashboard' || path === 'billing' || path === 'settings') {
    if (user) {
      const initialTab = path === 'billing' ? 'billing' : path === 'settings' ? 'settings' : undefined
      return <Dashboard user={user} initialTab={initialTab} />
    }
    return (
      <Login
        onDone={() => goTo(path)}
        goHome={() => goTo('')}
        switchToSignUp={() => goTo('signup')}
        switchToForgot={() => goTo('forgot-password')}
      />
    )
  }

  if (user && path !== 'reset-password') {
    return <Dashboard user={user} />
  }

  if (path === 'login') {
    return (
      <Login
        onDone={() => goTo('')}
        goHome={() => goTo('')}
        switchToSignUp={() => goTo('signup')}
        switchToForgot={() => goTo('forgot-password')}
      />
    )
  }

  if (path === 'signup') {
    return (
      <SignUp
        onDone={() => goTo('')}
        goHome={() => goTo('')}
        switchToLogin={() => goTo('login')}
      />
    )
  }

  return <LandingPage goToLogin={() => goTo('login')} goToSignUp={() => goTo('signup')} goTo={goTo} />
}
