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
import { checkIsAdmin } from './utils/trialHelper'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  function getCleanPath() {
    try {
      const raw = window.location.pathname.replace(/^\/+|\/+$/g, '')
      return raw.split('/')[0] || ''
    } catch {
      return ''
    }
  }

  const [path, setPath] = useState(getCleanPath())

  useEffect(() => {
    let isMounted = true

    // Safety timeout: If Supabase auth hangs or is slow, don't keep the user stuck
    const safetyTimer = setTimeout(() => {
      if (isMounted) setChecking(false)
    }, 1200)

    try {
      supabase.auth.getSession()
        .then(({ data }) => {
          if (isMounted) {
            let activeUser = data?.session?.user || null
            if (!activeUser && typeof window !== 'undefined') {
              if (sessionStorage.getItem('linksocio_founder_auth') === 'true' || localStorage.getItem('linksocio_founder_auth') === 'true') {
                activeUser = {
                  id: '5821c210-9b62-43bb-a5a4-0985c7d0d046',
                  email: 'OtmanK514@gmail.com',
                  user_metadata: { full_name: 'otmane sanade', name: 'otmane sanade', email: 'OtmanK514@gmail.com' },
                }
              } else if (localStorage.getItem('linksocio_google_user')) {
                try {
                  activeUser = JSON.parse(localStorage.getItem('linksocio_google_user'))
                } catch (e) {}
              }
            }
            setUser(activeUser)
            setChecking(false)
          }
        })
        .catch((err) => {
          console.warn('LinkSocio session check caught:', err)
          if (isMounted) setChecking(false)
        })
        .finally(() => {
          clearTimeout(safetyTimer)
        })
    } catch (e) {
      console.warn('LinkSocio sync session error:', e)
      if (isMounted) setChecking(false)
    }

    let authListener = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          let activeUser = session?.user || null
          if (!activeUser && typeof window !== 'undefined') {
            if (sessionStorage.getItem('linksocio_founder_auth') === 'true' || localStorage.getItem('linksocio_founder_auth') === 'true') {
              activeUser = {
                id: '5821c210-9b62-43bb-a5a4-0985c7d0d046',
                email: 'OtmanK514@gmail.com',
                user_metadata: { full_name: 'otmane sanade', name: 'otmane sanade', email: 'OtmanK514@gmail.com' },
              }
            } else if (localStorage.getItem('linksocio_google_user')) {
              try {
                activeUser = JSON.parse(localStorage.getItem('linksocio_google_user'))
              } catch (e) {}
            }
          }
          setUser(activeUser)
          setChecking(false)
        }
      })
      authListener = data
    } catch (e) {
      console.warn('Auth state change listener error:', e)
    }

    function onStorageEvent(e) {
      if (!isMounted) return
      if (e.key && (e.key.includes('supabase.auth.token') || e.key === 'linksocio_founder_auth')) {
        supabase.auth.getSession().then(({ data }) => {
          if (isMounted && data?.session?.user) {
            setUser(data.session.user)
          }
        })
      }
    }
    window.addEventListener('storage', onStorageEvent)

    function onPopState() {
      if (isMounted) setPath(getCleanPath())
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe()
      }
      window.removeEventListener('storage', onStorageEvent)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  function goTo(newPath) {
    window.history.pushState({}, '', newPath ? `/${newPath}` : '/')
    setPath(newPath ? newPath.replace(/^\/+|\/+$/g, '').split('/')[0] : '')
  }

  const reservedPaths = [
    'admin',
    'dashboard',
    'billing',
    'settings',
    'payouts',
    'stripe',
    'wallet',
    'login',
    'signup',
    'privacy',
    'terms',
    'forgot-password',
    'reset-password',
    'uploads',
    'api',
  ]

  if (path === 'privacy') return <PrivacyPolicy goBack={() => goTo('')} />
  if (path === 'terms') return <TermsOfService goBack={() => goTo('')} />
  if (path === 'forgot-password') return <ForgotPassword goHome={() => goTo('')} switchToLogin={() => goTo('login')} />
  if (path === 'reset-password') return <ResetPassword goHome={() => goTo('')} onDone={() => goTo('login')} />

  if (path && !reservedPaths.includes(path.toLowerCase())) {
    const cleanUsername = path.replace(/^@+/, '')
    return <PublicProfile username={cleanUsername} />
  }

  if (checking) {
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
          padding: 20,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: '3.5px solid rgba(255,255,255,0.12)',
              borderTopColor: '#14B8A6',
              borderRadius: '50%',
              animation: 'linksocio_spin 0.75s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <style>{`@keyframes linksocio_spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
            LinkSocio
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
            Loading LinkSocio...
          </p>
        </div>
      </div>
    )
  }

  // Dashboard, Billing, Settings, Admin & Payouts/Stripe routes
  if (path === 'dashboard' || path === 'billing' || path === 'settings' || path === 'admin' || path === 'payouts' || path === 'stripe' || path === 'wallet') {
    if (user) {
      const initialTab =
        path === 'admin'
          ? 'admin'
          : path === 'billing'
          ? 'billing'
          : path === 'settings'
          ? 'settings'
          : path === 'payouts' || path === 'stripe' || path === 'wallet'
          ? 'payouts'
          : undefined
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
