import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import QRCode from 'qrcode'
import LinksManager from './components/LinksManager'
import ShopTab from './ShopTab'
import ThemeTab from './ThemeTab'
import Analytics from './Analytics'
import QrTab from './components/QrTab'
import AvatarUpload from './components/AvatarUpload'
import { LivePagePreview } from './components/LivePagePreview'
import confetti from 'canvas-confetti'

function ProfileCard({ user, profile, onSaved }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setError('')
  }, [profile])

  const originalName = profile?.display_name || ''
  const originalBio = profile?.bio || ''
  const hasChanges = displayName !== originalName || bio !== originalBio
  const nameTooLong = displayName.length > 50
  const bioTooLong = bio.length > 120
  const canSave = hasChanges && !saving && !nameTooLong && !bioTooLong

  async function save(e) {
    e?.preventDefault()
    setError('')

    const cleanName = displayName.trim()
    const cleanBio = bio.trim()

    if (!cleanName) {
      setError('Please enter your display name.')
      return
    }

    if (!hasChanges) return

    setSaving(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: cleanName, bio: cleanBio })
      .eq('id', profile.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message || 'Could not save your profile.')
      return
    }

    setDisplayName(cleanName)
    setBio(cleanBio)
    setSaved(true)
    await onSaved()
    setTimeout(() => setSaved(false), 1800)
  }

  if (!profile) return null

  return (
    <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 20, marginBottom: 20 }}>
      {/* Avatar / Photo Upload Section */}
      <div style={{ marginBottom: 16 }}>
        <AvatarUpload user={user} profile={profile} onUpdated={onSaved} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Profile Details</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8A97A3' }}>Update your page name and bio description.</p>
        </div>
      </div>

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label htmlFor="profile-display-name" style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Display Name</label>
          <input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setError('') }}
            placeholder="e.g. Otman | Creative Agency"
            maxLength={50}
            style={{ ...inputStyle, marginTop: 4, borderColor: nameTooLong ? '#EF4444' : '#E7EDEC' }}
          />
          <p style={{ margin: '3px 0 0', fontSize: 11, color: nameTooLong ? '#EF4444' : '#94A3B8', textAlign: 'right' }}>{displayName.length}/50</p>
        </div>

        <div>
          <label htmlFor="profile-bio" style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Bio Description</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => { setBio(e.target.value); setError('') }}
            placeholder="Digital Creator · Software & Design · Work with me 👇"
            maxLength={120}
            rows={2}
            style={{ ...inputStyle, marginTop: 4, resize: 'vertical', minHeight: 64, fontFamily: 'inherit', borderColor: bioTooLong ? '#EF4444' : '#E7EDEC' }}
          />
          <p style={{ margin: '3px 0 0', fontSize: 11, color: bioTooLong ? '#EF4444' : '#94A3B8', textAlign: 'right' }}>{bio.length}/120</p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="submit"
            disabled={!canSave}
            style={{
              flex: 1,
              background: saved ? '#ECFDF5' : canSave ? '#14B8A6' : '#E2E8F0',
              color: saved ? '#059669' : canSave ? 'white' : '#94A3B8',
              border: 'none',
              borderRadius: 12,
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              cursor: canSave ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [products, setProducts] = useState([])
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState(null)
  const [tab, setTab] = useState('links')
  const [showMobilePreviewModal, setShowMobilePreviewModal] = useState(false)

  useEffect(() => {
    loadProfile()
    loadLinks()
    loadProducts()
  }, [])

  useEffect(() => {
    if (profile?.username) generateQr()
  }, [profile?.username])

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

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    setProducts(data || [])
  }

  async function generateQr() {
    if (!profile?.username) return
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
    const pageUrl = `${currentOrigin}/${profile.username}`
    try {
      const dataUrl = await QRCode.toDataURL(pageUrl, {
        width: 450,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      })
      setQrUrl(dataUrl)
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

  function downloadQr() {
    if (!qrUrl) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `linksocio-${profile.username}-qr.png`
    a.click()
  }

  function copyLink() {
    if (!profile) return
    navigator.clipboard.writeText(`https://linksocio.com/${profile.username}`)
    setCopied(true)
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } })
    } catch (e) {}
    setTimeout(() => setCopied(false), 2000)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const navItems = [
    { key: 'links', label: 'Links & Socials', icon: '🔗' },
    { key: 'shop', label: 'Store & Products', icon: '🛍️' },
    { key: 'theme', label: 'Appearance & Themes', icon: '🎨' },
    { key: 'qr', label: 'QR Code', icon: '🔲' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#F8FAFA', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top Mobile Bar with floating preview button */}
      <div className="mobile-header" style={{ display: 'none', background: 'white', borderBottom: '1px solid #E2E8F0', padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 46 46">
            <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
            <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            <span style={{ color: '#0F172A' }}>Link</span>
            <span style={{ color: '#14B8A6' }}>Socio</span>
          </span>
        </div>
        <button
          onClick={() => setShowMobilePreviewModal(true)}
          style={{ background: '#0F172A', color: 'white', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>📱 Live Preview</span>
        </button>
      </div>

      <div
        className="linksocio-grid"
        style={{
          width: '100%',
          maxWidth: 1220,
          margin: '0 auto',
          padding: '24px 16px 64px',
          display: 'grid',
          gridTemplateColumns: '200px minmax(0, 1fr) 340px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Navigation Sidebar */}
        <div className="linksocio-sidebar" style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingLeft: 4 }}>
            <svg width="24" height="24" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              <span style={{ color: '#0F172A' }}>Link</span>
              <span style={{ color: '#14B8A6' }}>Socio</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => {
              const isActive = tab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    background: isActive ? '#0F172A' : 'transparent',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'white' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
            {profile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '4px 6px' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: profile.avatar_url
                      ? '#F1F5F9'
                      : `linear-gradient(135deg, ${profile.theme_color || '#14B8A6'}, #0F172A)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile.display_name || profile.username}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    @{profile.username}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              style={{
                width: '100%',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#64748B',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🚪</span>
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Center Editing Workspace */}
        <div>
          {tab === 'links' && (
            <div>
              <ProfileCard user={user} profile={profile} onSaved={loadProfile} />
              <LinksManager
                profile={profile}
                links={links}
                onLinksChanged={loadLinks}
                onProfileSaved={loadProfile}
                copied={copied}
                copyLink={copyLink}
                qrUrl={qrUrl}
                downloadQr={downloadQr}
              />
            </div>
          )}
          {tab === 'shop' && (
            <ShopTab user={user} products={products} reloadProducts={loadProducts} />
          )}
          {tab === 'theme' && (
            <ThemeTab user={user} profile={profile} onUpdated={loadProfile} />
          )}
          {tab === 'qr' && (
            <QrTab profile={profile} qrUrl={qrUrl} downloadQr={downloadQr} />
          )}
          {tab === 'analytics' && (
            <Analytics links={links} />
          )}
        </div>

        {/* Right Phone Mockup Live Preview */}
        <div
          className="linksocio-preview-panel"
          style={{
            position: 'sticky',
            top: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 310, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
                LIVE PREVIEW
              </span>
            </div>
            {profile?.username && (
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: '#14B8A6', fontWeight: 600, textDecoration: 'none' }}
              >
                Open in new tab ↗
              </a>
            )}
          </div>

          {/* Device Mockup Shell */}
          <div
            style={{
              width: 310,
              background: '#0F172A',
              borderRadius: 42,
              padding: '12px 10px',
              boxShadow: '0 20px 40px -15px rgba(15,23,42,0.25), 0 0 0 1px rgba(15,23,42,0.08)',
              position: 'relative',
            }}
          >
            {/* Dynamic Island / Speaker notch */}
            <div
              style={{
                width: 76,
                height: 18,
                background: '#0F172A',
                borderRadius: 100,
                position: 'absolute',
                top: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
              }}
            />

            {/* Mockup screen */}
            <div
              style={{
                borderRadius: 32,
                overflow: 'hidden',
                maxHeight: 560,
                overflowY: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <LivePagePreview
                profile={profile}
                links={links}
                products={products}
                isEmbedded={true}
                activeTabOverride={tab === 'shop' ? 'shop' : 'links'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Modal */}
      {showMobilePreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.8)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setShowMobilePreviewModal(false)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', zIndex: 1000 }}
          >
            ✕
          </button>
          <div style={{ width: '100%', maxWidth: 360, maxHeight: '85vh', overflowY: 'auto', borderRadius: 28 }}>
            <LivePagePreview profile={profile} links={links} products={products} isEmbedded={true} />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .linksocio-grid { grid-template-columns: minmax(0, 1fr) !important; padding: 16px 12px !important; }
          .linksocio-preview-panel { display: none !important; }
          .mobile-header { display: flex !important; }
          .linksocio-sidebar { display: flex !important; flex-direction: row !important; align-items: center !important; overflow-x: auto !important; margin-bottom: 16px !important; }
          .linksocio-sidebar > div:first-child { display: none !important; }
          .linksocio-sidebar > div { flex-direction: row !important; }
          .linksocio-sidebar > div:last-child { margin-top: 0 !important; padding-top: 0 !important; border-top: none !important; }
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
  fontSize: 13.5,
  color: '#0F172A',
  outline: 'none',
}
