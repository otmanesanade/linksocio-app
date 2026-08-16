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
  const [path, setPath] = useState(window.location.pathname.replace('/', ''))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    function onPopState() {
      setPath(window.location.pathname.replace('/', ''))
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  function goTo(newPath) {
    window.history.pushState({}, '', `/${newPath}`)
    setPath(newPath)
  }

  const reservedPaths = ['login', 'signup', 'privacy', 'terms', 'forgot-password', 'reset-password']

  if (path === 'privacy') return <PrivacyPolicy goBack={() => goTo('')} />
  if (path === 'terms') return <TermsOfService goBack={() => goTo('')} />
  if (path === 'forgot-password') return <ForgotPassword switchToLogin={() => goTo('login')} />
  if (path === 'reset-password') return <ResetPassword onDone={() => goTo('login')} />

  if (path && !reservedPaths.includes(path)) {
    return <PublicProfile username={path.toLowerCase()} />
  }

  if (checking) return null

  if (user && path !== 'reset-password') {
    return <Dashboard user={user} />
  }

  if (path === 'login') {
    return <Login onDone={() => goTo('')} switchToSignUp={() => goTo('signup')} switchToForgot={() => goTo('forgot-password')} />
  }

  if (path === 'signup') {
    return <SignUp onDone={() => goTo('')} switchToLogin={() => goTo('login')} />
  }

  return <LandingPage goToLogin={() => goTo('login')} goToSignUp={() => goTo('signup')} goTo={goTo} />
}
