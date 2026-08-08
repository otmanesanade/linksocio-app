import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function PublicProfile({ username }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    load()
  }, [username])

  async function load() {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!profileData) {
      setNotFound(true)
      return
    }
    setProfile(profileData)

    const { data: linksData } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', profileData.id)
      .order('position', { ascending: true })

    setLinks(linksData || [])
  }

  if (notFound) return <p style={{ textAlign: 'center', marginTop: 80 }}>This page doesn't exist.</p>
  if (!profile) return null

  return (
    <div style={{ maxWidth: 380, margin: '60px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 28,
          fontWeight: 600,
        }}
      >
        {profile.display_name?.[0]?.toUpperCase() || '?'}
      </div>
      <h1 style={{ fontSize: 18, marginTop: 16 }}>{profile.display_name}</h1>
      {profile.bio && <p style={{ color: '#888', fontSize: 14 }}>{profile.bio}</p>}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((link) => (
          
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              padding: '14px',
              borderRadius: 16,
              border: '1px solid #E7EDEC',
              textDecoration: 'none',
              color: '#0F172A',
              fontWeight: 500,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: '#aaa' }}>
        Link<span style={{ color: '#14B8A6' }}>Socio</span>
      </p>
    </div>
  )
}
