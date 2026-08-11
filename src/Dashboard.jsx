import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import QRCode from 'qrcode'

const emojiFor = (label = '') => {
  const l = label.toLowerCase()
  if (l.includes('instagram')) return '📷'
  if (l.includes('whatsapp')) return '💬'
  if (l.includes('tiktok')) return '🎵'
  if (l.includes('youtube')) return '▶️'
  if (l.includes('twitter') || l.includes('x.com')) return '✕'
  if (l.includes('linkedin')) return '💼'
  if (l.includes('facebook')) return '👤'
  return '🔗'
}

export default function Dashboard({ user, goToAnalytics }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState(null)

  useEffect(() => {
    loadProfile()
    loadLinks()
  }, [])

  useEffect(() => {
    if (profile) generateQr()
  }, [profile])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  async function loadLinks() {
    const { data } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    setLinks(data || [])
  }

  async function generateQr() {
    const pageUrl = `https://linksocio.com/${profile.username}`
    const dataUrl = await QRCode.toDataURL(pageUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
    setQrUrl(dataUrl)
  }

  function downloadQr() {
    if (!qrUrl) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `linksocio-${profile.username}-qr.png`
    a.click()
  }

  async function addLink(e) {
    e.preventDefault()
    if (!label || !url) return
    setAdding(true)

    const { error } = await supabase.from('links').insert({
      user_id: user.id,
      label,
      url,
      position: links.length,
    })

    setAdding(false)
    if (!error) {
      setLabel('')
      setUrl('')
      loadLinks()
    }
  }

  async function deleteLink(id) {
    await supabase.from('links').delete().eq('id', id)
    loadLinks()
  }

  async function toggleActive(link) {
    await supabase.from('links').update({ active: !link.active }).eq('id', link.id)
    loadLinks()
  }

  async function setStyle(link, style) {
    await supabase.from('links').update({ style }).eq('id', link.id)
    loadLinks()
  }

  async function setIconPosition(link, icon_position) {
    await supabase.from('links').update({ icon_position }).eq('id', link.id)
    loadLinks()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  function copyLink() {
    if (!profile) return
    navigator.clipboard.writeText(`linksocio.com/${profile.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#F8FAFA',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        padding: '32px 16px 64px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="26" height="26" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              <span style={{ color: '#0F172A' }}>Link</span>
              <span style={{ color: '#14B8A6' }}>Socio</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={goToAnalytics}
              style={{
                background: 'none',
                border: '1px solid #E7EDEC',
                borderRadius: 10,
                padding: '7px 14px',
                fontSize: 13,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              📊 Analytics
            </button>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '1px solid #E7EDEC',
                borderRadius: 10,
                padding: '7px 14px',
                fontSize: 13,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* Public page card */}
        {profile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'white',
              border: '1px solid #E7EDEC',
              borderRadius: 16,
              padding: '14px 16px',
              marginBottom: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#8A97A3', fontWeight: 500 }}>YOUR PAGE</p>
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', textDecoration: 'none' }}
              >
                linksocio.com/{profile.username}
              </a>
            </div>
            <button
              onClick={copyLink}
              style={{
                flexShrink: 0,
                background: copied ? '#E6F7F5' : '#0F172A',
                color: copied ? '#0D9488' : 'white',
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {/* QR Code card */}
        {qrUrl && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'white',
              border: '1px solid #E7EDEC',
              borderRadius: 16,
              padding: '16px',
              marginBottom: 20,
            }}
          >
            <img
              src={qrUrl}
              alt="QR code"
              style={{ width: 72, height: 72, borderRadius: 10, border: '1px solid #E7EDEC' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Your QR code</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A97A3' }}>
                Print it, share it, stick it anywhere.
              </p>
            </div>
            <button
              onClick={downloadQr}
              style={{
                flexShrink: 0,
                background: '#F1F2F4',
                color: '#0F172A',
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Download
            </button>
          </div>
        )}

        {/* Add link form */}
        <div
          style={{
            background: 'white',
            border: '1px solid #E7EDEC',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add a link</p>
          <form onSubmit={addLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              placeholder="Label (e.g. Instagram)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={adding}
              style={{
                background: adding ? '#5DCAA5' : '#14B8A6',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '11px',
                fontSize: 13,
                fontWeight: 500,
                cursor: adding ? 'default' : 'pointer',
              }}
            >
              {adding ? 'Adding...' : 'Add link'}
            </button>
          </form>
        </div>

        {/* Links list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                background: 'white',
                border: '1px solid #E7EDEC',
                borderRadius: 16,
                padding: '12px 14px',
                opacity: link.active === false ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#F1F2F4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  {emojiFor(link.label)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{link.label}</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: '#8A97A3',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {link.url}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(link)}
                  title={link.active === false ? 'Show on page' : 'Hide from page'}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    fontSize: 15,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {link.active === false ? '🙈' : '👁️'}
                </button>
                <button
                  onClick={() => deleteLink(link.id)}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    color: '#C2CBD1',
                    fontSize: 13,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Display options */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid #F1F2F4',
                  fontSize: 11,
                }}
              >
                <span style={{ color: '#8A97A3', alignSelf: 'center' }}>Show as:</span>
                <button
                  onClick={() => setStyle(link, 'button')}
                  style={{
                    ...chipStyle,
                    background: link.style !== 'icon' ? '#0F172A' : '#F1F2F4',
                    color: link.style !== 'icon' ? 'white' : '#0F172A',
                  }}
                >
                  Button
                </button>
                <button
                  onClick={() => setStyle(link, 'icon')}
                  style={{
                    ...chipStyle,
                    background: link.style === 'icon' ? '#0F172A' : '#F1F2F4',
                    color: link.style === 'icon' ? 'white' : '#0F172A',
                  }}
                >
                  Icon
                </button>

                {link.style === 'icon' && (
                  <>
                    <span style={{ color: '#8A97A3', alignSelf: 'center', marginLeft: 6 }}>Position:</span>
                    <button
                      onClick={() => setIconPosition(link, 'top')}
                      style={{
                        ...chipStyle,
                        background: link.icon_position !== 'bottom' ? '#14B8A6' : '#F1F2F4',
                        color: link.icon_position !== 'bottom' ? 'white' : '#0F172A',
                      }}
                    >
                      Top
                    </button>
                    <button
                      onClick={() => setIconPosition(link, 'bottom')}
                      style={{
                        ...chipStyle,
                        background: link.icon_position === 'bottom' ? '#14B8A6' : '#F1F2F4',
                        color: link.icon_position === 'bottom' ? 'white' : '#0F172A',
                      }}
                    >
                      Bottom
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {links.length === 0 && (
            <p style={{ textAlign: 'center', color: '#8A97A3', fontSize: 13, marginTop: 12 }}>
              No links yet. Add your first one above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
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

const chipStyle = {
  border: 'none',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
}
