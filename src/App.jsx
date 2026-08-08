import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SignUp from './SignUp'
import Login from './Login'
import Dashboard from './Dashboard'
import PublicProfile from './PublicProfile'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('login')

  const path = window.location.pathname.replace('/', '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (path && path !== '') {
    return <PublicProfile username={path.toLowerCase()} />
  }

  if (checking) return null

  if (user) {
    return <Dashboard user={user} />
  }

  return (
    <div>
      {view === 'login' ? (
        <>
          <Login onDone={() => {}} />
          <p style={{ textAlign: 'center' }}>
            No account?{' '}
            <button onClick={() => setView('signup')}>Sign up</button>
          </p>
        </>
      ) : (
        <>
          <SignUp onDone={() => {}} />
          <p style={{ textAlign: 'center' }}>
            Already have an account?{' '}
            <button onClick={() => setView('login')}>Log in</button>
          </p>
        </>
      )}
    </div>
  )
}
