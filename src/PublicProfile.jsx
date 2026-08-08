import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const iconFor = (label = '') => {
  const l = label.toLowerCase()
  if (l.includes('instagram')) return { emoji: '📷', color: '#E1306C' }
  if (l.includes('whatsapp')) return { emoji: '💬', color: '#25D366' }
  if (l.includes('tiktok')) return { emoji: '🎵', color: '#000000' }
  if (l.includes('youtube')) return { emoji: '▶️', color: '#FF0000' }
  if (l.includes('twitter') || l.includes('x.com')) return { emoji: '✕', color: '#000000' }
  if (l.includes('linkedin')) return { emoji: '💼', color: '#0A66C2' }
  if (l.includes('facebook')) return { emoji: '👤', color: '#1877F2' }
  return { emoji: '🔗', color: '#14B8A6' }
}

export default function PublicProfile({ username }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [pressed, setPressed] = useState(null)

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

  if (notFound) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, fontFamily: 'sans-serif', color: '#8A97A3' }}>
        This page doesn't exist.
      </div>
    )
  }
  if (!profile) return null

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
        <div
          style={{
            position: 'relative',
            background: 'white',
            borderRadius: 28,
            border: '1px solid #E7EDEC',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            padding: '40px 28px 32px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {profile.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <h1 style={{ marginTop: 16, fontSize: 17, fontWeight: 600, color: '#0F172A' }}>
              {profile.display_name}
            </h1>
            {profile.bio && (
              <p style={{ marginTop: 4, fontSize: 13, color: '#8A97A3', textAlign: 'center' }}>
                {profile.bio}
              </p>
            )}
          </div>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {links.map((link) => {
              const { emoji, color } = iconFor(link.label)
              const isPressed = pressed === link.id
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onMouseDown={() => setPressed(link.id)}
                  onMouseUp={() => setPressed(null)}
                  onMouseLeave={() => setPressed(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 16,
                    border: '1px solid #E7EDEC',
                    background: '#FBFCFC',
                    padding: '14px 16px',
                    textDecoration: 'none',
                    color: '#0F172A',
                    transition: 'all 0.15s',
                    transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#F1F2F4',
                      fontSize: 16,
                    }}
                  >
                    {emoji}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>
                      {link.label}
                    </span>
                  </span>
                  <span style={{ color: '#C2CBD1', fontSize: 14 }}>↗</span>
                </a>
              )
            })}
            {links.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8A97A3', fontSize: 13 }}>No links yet.</p>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            color: '#A6AFB6',
          }}
        >
          <span>
            <span style={{ color: '#0F172A', fontWeight: 500 }}>Link</span>
            <span style={{ color: '#14B8A6', fontWeight: 500 }}>Socio</span>
          </span>
          <span style={{ color: '#C2CBD1' }}>·</span>
          <span>One tap. Instant connection.</span>
        </div>
      </div>
    </div>
  )
}
