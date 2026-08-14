import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { getTheme } from './themes'

const IconInstagram = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none" />
  </svg>
)
const IconWhatsapp = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)
const IconTiktok = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)
const IconYoutube = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="M10 9.5v5l4.5-2.5z" fill={color} stroke="none" />
  </svg>
)
const IconTwitter = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
)
const IconLinkedin = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <path d="M7 11v6M11 11v6M11 13.5c0-1.5 1-2.5 2.5-2.5S16 12 16 13.5V17" />
  </svg>
)
const IconFacebook = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)
const IconLink = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
)

const iconFor = (label = '', color) => {
  const l = label.toLowerCase()
  if (l.includes('instagram')) return <IconInstagram color={color} />
  if (l.includes('whatsapp')) return <IconWhatsapp color={color} />
  if (l.includes('tiktok')) return <IconTiktok color={color} />
  if (l.includes('youtube')) return <IconYoutube color={color} />
  if (l.includes('twitter') || l.includes('x.com')) return <IconTwitter color={color} />
  if (l.includes('linkedin')) return <IconLinkedin color={color} />
  if (l.includes('facebook')) return <IconFacebook color={color} />
  return <IconLink color={color} />
}

function IconRow({ links, onLinkClick, color, tint }) {
  if (links.length === 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => onLinkClick(link)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {iconFor(link.label, color)}
        </a>
      ))}
    </div>
  )
}

export default function PublicProfile({ username }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [products, setProducts] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [pressed, setPressed] = useState(null)
  const [tab, setTab] = useState('links')

  useEffect(() => {
    load()
  }, [username])

  async function load() {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('username', username).single()

    if (!profileData) {
      setNotFound(true)
      return
    }
    setProfile(profileData)

    const { data: linksData } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('active', true)
      .order('position', { ascending: true })
    setLinks(linksData || [])

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', profileData.id)
      .order('position', { ascending: true })
    setProducts(productsData || [])
  }

  async function handleClick(link) {
    supabase.from('links').update({ clicks: (link.clicks || 0) + 1 }).eq('id', link.id).then(() => {})
  }

  if (notFound) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, fontFamily: 'sans-serif', color: '#8A97A3' }}>
        This page doesn't exist.
      </div>
    )
  }
  if (!profile) return null

  const theme = getTheme(profile.theme_preset)
  const color = theme.accent
  const tint = `${color}1A`

  const buttonLinks = links.filter((l) => l.style !== 'icon')
  const topIcons = links.filter((l) => l.style === 'icon' && l.icon_position !== 'bottom')
  const bottomIcons = links.filter((l) => l.style === 'icon' && l.icon_position === 'bottom')
  const hasShop = products.length > 0

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.pageBg,
        padding: '48px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div
          style={{
            position: 'relative',
            background: theme.cardBg,
            borderRadius: 28,
            border: '1px solid rgba(0,0,0,0.06)',
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
                background: `linear-gradient(135deg, ${color}, ${theme.textColor})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {profile.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <h1 style={{ marginTop: 16, fontSize: 17, fontWeight: 600, color: theme.textColor }}>{profile.display_name}</h1>
            {profile.bio && (
              <p style={{ marginTop: 4, fontSize: 13, color: theme.subTextColor, textAlign: 'center' }}>{profile.bio}</p>
            )}

            {topIcons.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <IconRow links={topIcons} onLinkClick={handleClick} color={color} tint={tint} />
              </div>
            )}

            {hasShop && (
              <div style={{ marginTop: 20, display: 'flex', gap: 6, background: tint, borderRadius: 100, padding: 4 }}>
                <button
                  onClick={() => setTab('links')}
                  style={{
                    border: 'none',
                    borderRadius: 100,
                    padding: '7px 18px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: tab === 'links' ? theme.cardBg : 'transparent',
                    color: theme.textColor,
                    boxShadow: tab === 'links' ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  Links
                </button>
                <button
                  onClick={() => setTab('shop')}
                  style={{
                    border: 'none',
                    borderRadius: 100,
                    padding: '7px 18px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: tab === 'shop' ? theme.cardBg : 'transparent',
                    color: theme.textColor,
                    boxShadow: tab === 'shop' ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  Shop
                </button>
              </div>
            )}
          </div>

          {tab === 'links' && (
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {buttonLinks.map((link) => {
                const isPressed = pressed === link.id
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleClick(link)}
                    onMouseDown={() => setPressed(link.id)}
                    onMouseUp={() => setPressed(null)}
                    onMouseLeave={() => setPressed(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 16,
                      border: '1px solid rgba(0,0,0,0.06)',
                      background: 'transparent',
                      padding: '14px 16px',
                      textDecoration: 'none',
                      color: theme.textColor,
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
                        background: tint,
                      }}
                    >
                      {iconFor(link.label, color)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{link.label}</span>
                    </span>
                    <span style={{ color: theme.subTextColor, fontSize: 14 }}>↗</span>
                  </a>
                )
              })}
              {buttonLinks.length === 0 && bottomIcons.length === 0 && topIcons.length === 0 && (
                <p style={{ textAlign: 'center', color: theme.subTextColor, fontSize: 13 }}>No links yet.</p>
              )}
            </div>
          )}

          {tab === 'shop' && (
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {products.map((p) => (
                <a
                  key={p.id}
                  href={p.external_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', textDecoration: 'none' }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>🛍️</span>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: theme.textColor }}>{p.name}</p>
                    {p.price && <p style={{ margin: '2px 0 0', fontSize: 12, color, fontWeight: 600 }}>{p.price}</p>}
                  </div>
                </a>
              ))}
            </div>
          )}

          {bottomIcons.length > 0 && tab === 'links' && (
            <div style={{ marginTop: 20 }}>
              <IconRow links={bottomIcons} onLinkClick={handleClick} color={color} tint={tint} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: theme.subTextColor }}>
          <span>
            <span style={{ color: theme.textColor, fontWeight: 500 }}>Link</span>
            <span style={{ color, fontWeight: 500 }}>Socio</span>
          </span>
          <span>·</span>
          <span>One tap. Instant connection.</span>
        </div>
      </div>
    </div>
  )
}
