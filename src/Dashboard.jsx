import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import QRCode from 'qrcode'
import ShopTab from './ShopTab'

const IconInstagram = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="#14B8A6" stroke="none" />
  </svg>
)
const IconWhatsapp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)
const IconTiktok = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)
const IconYoutube = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="M10 9.5v5l4.5-2.5z" fill="#14B8A6" stroke="none" />
  </svg>
)
const IconTwitter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
)
const IconLinkedin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <path d="M7 11v6M11 11v6M11 13.5c0-1.5 1-2.5 2.5-2.5S16 12 16 13.5V17" />
  </svg>
)
const IconFacebook = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
)

const iconSvgFor = (label = '') => {
  const l = label.toLowerCase()
  if (l.includes('instagram')) return <IconInstagram />
  if (l.includes('whatsapp')) return <IconWhatsapp />
  if (l.includes('tiktok')) return <IconTiktok />
  if (l.includes('youtube')) return <IconYoutube />
  if (l.includes('twitter') || l.includes('x.com')) return <IconTwitter />
  if (l.includes('linkedin')) return <IconLinkedin />
  if (l.includes('facebook')) return <IconFacebook />
  return <IconLink />
}

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

function LinksTab({ profile, links, label, url, setLabel, setUrl, adding, addLink, deleteLink, toggleActive, setStyle, setIconPosition, copied, copyLink, qrUrl, downloadQr }) {
  return (
    <div>
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#8A97A3', fontWeight: 500 }}>YOUR PAGE</p>
            <a href={`/${profile.username}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', textDecoration: 'none' }}>
              linksocio.com/{profile.username}
            </a>
          </div>
          <button onClick={copyLink} style={{ flexShrink: 0, background: copied ? '#E6F7F5' : '#0F172A', color: copied ? '#0D9488' : 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {qrUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, padding: '16px', marginBottom: 20 }}>
          <img src={qrUrl} alt="QR code" style={{ width: 72, height: 72, borderRadius: 10, border: '1px solid #E7EDEC' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Your QR code</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A97A3' }}>Print it, share it, stick it anywhere.</p>
          </div>
          <button onClick={downloadQr} style={{ flexShrink: 0, background: '#F1F2F4', color: '#0F172A', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            Download
          </button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add a link</p>
        <form onSubmit={addLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Label (e.g. Instagram)" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
          <input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} />
          <button type="submit" disabled={adding} style={{ background: adding ? '#5DCAA5' : '#14B8A6', color: 'white', border: 'none', borderRadius: 12, padding: '11px', fontSize: 13, fontWeight: 500, cursor: adding ? 'default' : 'pointer' }}>
            {adding ? 'Adding...' : 'Add link'}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((link) => (
          <div key={link.id} style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, padding: '12px 14px', opacity: link.active === false ? 0.5 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: '#F1F2F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {emojiFor(link.label)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{link.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#8A97A3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url}</p>
              </div>
              <button onClick={() => toggleActive(link)} title={link.active === false ? 'Show on page' : 'Hide from page'} style={{ flexShrink: 0, background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', padding: '4px' }}>
                {link.active === false ? '🙈' : '👁️'}
              </button>
              <button onClick={() => deleteLink(link.id)} style={{ flexShrink: 0, background: 'none', border: 'none', color: '#C2CBD1', fontSize: 13, cursor: 'pointer', padding: '4px' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F2F4', fontSize: 11, flexWrap: 'wrap' }}>
              <span style={{ color: '#8A97A3', alignSelf: 'center' }}>Show as:</span>
              <button onClick={() => setStyle(link, 'button')} style={{ ...chipStyle, background: link.style !== 'icon' ? '#0F172A' : '#F1F2F4', color: link.style !== 'icon' ? 'white' : '#0F172A' }}>
                Button
              </button>
              <button onClick={() => setStyle(link, 'icon')} style={{ ...chipStyle, background: link.style === 'icon' ? '#0F172A' : '#F1F2F4', color: link.style === 'icon' ? 'white' : '#0F172A' }}>
                Icon
              </button>
              {link.style === 'icon' && (
                <>
                  <span style={{ color: '#8A97A3', alignSelf: 'center', marginLeft: 6 }}>Position:</span>
                  <button onClick={() => setIconPosition(link, 'top')} style={{ ...chipStyle, background: link.icon_position !== 'bottom' ? '#14B8A6' : '#F1F2F4', color: link.icon_position !== 'bottom' ? 'white' : '#0F172A' }}>
                    Top
                  </button>
                  <button onClick={() => setIconPosition(link, 'bottom')} style={{ ...chipStyle, background: link.icon_position === 'bottom' ? '#14B8A6' : '#F1F2F4', color: link.icon_position === 'bottom' ? 'white' : '#0F172A' }}>
                    Bottom
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {links.length === 0 && <p style={{ textAlign: 'center', color: '#8A97A3', fontSize: 13, marginTop: 12 }}>No links yet. Add your first one above.</p>}
      </div>
    </div>
  )
}

function AnalyticsTab({ links }) {
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0)
  const maxClicks = Math.max(1, ...links.map((l) => l.clicks || 0))
  const sorted = [...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))

  return (
    <div>
      <div style={{ background: '#0F172A', borderRadius: 20, padding: 24, marginBottom: 20, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: 'white' }}>{totalClicks}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8A97A3' }}>total clicks across all links</p>
      </div>
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 20 }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Clicks per link</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((link) => (
            <div key={link.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{link.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0D9488' }}>{link.clicks || 0}</span>
              </div>
              <div style={{ background: '#F1F2F4', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${((link.clicks || 0) / maxClicks) * 100}%`, background: '#14B8A6', height: '100%', borderRadius: 8 }} />
              </div>
            </div>
          ))}
          {sorted.length === 0 && <p style={{ textAlign: 'center', color: '#8A97A3', fontSize: 13 }}>No links yet.</p>}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState(null)
  const [tab, setTab] = useState('links')

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
    const { data } = await supabase.from('links').select('*').eq('user_id', user.id).order('position', { ascending: true })
    setLinks(data || [])
  }

  async function generateQr() {
    const pageUrl = `https://linksocio.com/${profile.username}`
    const dataUrl = await QRCode.toDataURL(pageUrl, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } })
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
    const { error } = await supabase.from('links').insert({ user_id: user.id, label, url, position: links.length })
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

  const activeLinks = links.filter((l) => l.active !== false)
  const previewButtons = activeLinks.filter((l) => l.style !== 'icon')
  const previewTopIcons = activeLinks.filter((l) => l.style === 'icon' && l.icon_position !== 'bottom')
  const previewBottomIcons = activeLinks.filter((l) => l.style === 'icon' && l.icon_position === 'bottom')

  const navItems = [
    { key: 'links', label: 'Links', icon: '🔗' },
    { key: 'shop', label: 'Shop', icon: '🛍️' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#F8FAFA', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <div className="linksocio-grid" style={{ width: '100%', maxWidth: 1140, margin: '0 auto', padding: '24px 16px 64px', display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        <div className="linksocio-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, paddingLeft: 4 }}>
            <svg width="24" height="24" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              <span style={{ color: '#0F172A' }}>Link</span>
              <span style={{ color: '#14B8A6' }}>Socio</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  textAlign: 'left',
                  background: tab === item.key ? 'white' : 'none',
                  border: tab === item.key ? '1px solid #E7EDEC' : '1px solid transparent',
                  borderRadius: 10,
                  padding: '9px 11px',
                  fontSize: 13.5,
                  fontWeight: tab === item.key ? 600 : 500,
                  color: tab === item.key ? '#0F172A' : '#8A97A3',
                  cursor: 'pointer',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            style={{ marginTop: 24, width: '100%', background: 'none', border: '1px solid #E7EDEC', borderRadius: 10, padding: '9px 11px', fontSize: 13, color: '#0F172A', cursor: 'pointer', textAlign: 'left' }}
          >
            Log out
          </button>
        </div>

        <div>
          {tab === 'links' && (
            <LinksTab
              profile={profile}
              links={links}
              label={label}
              url={url}
              setLabel={setLabel}
              setUrl={setUrl}
              adding={adding}
              addLink={addLink}
              deleteLink={deleteLink}
              toggleActive={toggleActive}
              setStyle={setStyle}
              setIconPosition={setIconPosition}
              copied={copied}
              copyLink={copyLink}
              qrUrl={qrUrl}
              downloadQr={downloadQr}
            />
          )}
          {tab === 'analytics' && <AnalyticsTab links={links} />}
          {tab === 'shop' && <ShopTab user={user} />}
        </div>

        <div className="linksocio-preview-panel" style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8A97A3', letterSpacing: 0.5, marginBottom: 12 }}>LIVE PREVIEW</p>
          <div style={{ width: 280, background: '#0F172A', borderRadius: 36, padding: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.12)' }}>
            <div style={{ background: '#F8FAFA', borderRadius: 28, padding: '28px 18px', minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #14B8A6, #0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 600 }}>
                {profile?.display_name?.[0]?.toUpperCase() || '?'}
              </div>
              <p style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{profile?.display_name || 'you'}</p>

              {previewTopIcons.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {previewTopIcons.map((link) => (
                    <span key={link.id} style={{ width: 26, height: 26, borderRadius: '50%', background: '#E6F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {iconSvgFor(link.label)}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 18, width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {previewButtons.map((link) => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #E7EDEC', borderRadius: 11, padding: '9px 11px' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#E6F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {iconSvgFor(link.label)}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: '#0F172A' }}>{link.label}</span>
                  </div>
                ))}
                {activeLinks.length === 0 && <p style={{ textAlign: 'center', fontSize: 11, color: '#C2CBD1', marginTop: 20 }}>Your links will appear here</p>}
              </div>

              {previewBottomIcons.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {previewBottomIcons.map((link) => (
                    <span key={link.id} style={{ width: 26, height: 26, borderRadius: '50%', background: '#E6F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {iconSvgFor(link.label)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .linksocio-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .linksocio-preview-panel { display: none !important; }
          .linksocio-sidebar { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; margin-bottom: 16px !important; }
          .linksocio-sidebar > div:first-child { display: none !important; }
          .linksocio-sidebar > div { flex-direction: row !important; gap: 8px !important; }
          .linksocio-sidebar button { width: auto !important; }
        }
      `}</style>
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
