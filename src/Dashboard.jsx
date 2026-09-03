import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import QRCode from 'qrcode'
import LinksManager from './components/LinksManager'
import ShopTab from './ShopTab'
import ThemeTab from './ThemeTab'
import Analytics from './Analytics'
import QrTab from './components/QrTab'
import AvatarUpload from './components/AvatarUpload'
import InquiryTab, { fetchServerInquirySettings, getStoredLeads } from './InquiryTab'
import BookingTab, { fetchServerBookingSettings, getStoredBookings } from './BookingTab'
import RestaurantTab, { fetchServerRestaurantMenu } from './RestaurantTab'
import NotificationTab from './NotificationTab'
import PayoutsTab from './PayoutsTab'
import SettingsTab from './SettingsTab'
import { getNotificationSettings, playNotificationSound } from './notificationService'
import { LivePagePreview } from './components/LivePagePreview'
import confetti from 'canvas-confetti'

function ProfileCard({ user, profile, onSaved }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setLocation(profile?.location || '')
    setError('')
  }, [profile])

  const originalName = profile?.display_name || ''
  const originalBio = profile?.bio || ''
  const originalLocation = profile?.location || ''
  const hasChanges = displayName !== originalName || bio !== originalBio || location !== originalLocation
  const nameTooLong = displayName.length > 50
  const bioTooLong = bio.length > 120
  const locTooLong = location.length > 80
  const canSave = hasChanges && !saving && !nameTooLong && !bioTooLong && !locTooLong

  async function save(e) {
    e?.preventDefault()
    setError('')

    const cleanName = displayName.trim()
    const cleanBio = bio.trim()
    const cleanLocation = location.trim()

    if (!cleanName) {
      setError('Please enter your display name.')
      return
    }

    if (!hasChanges) return

    setSaving(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: cleanName, bio: cleanBio, location: cleanLocation })
      .eq('id', profile.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message || 'Could not save your profile.')
      return
    }

    if (profile?.username) {
      try {
        localStorage.setItem(`linksocio_profile_location_${profile.username}`, cleanLocation)
      } catch (e) {}
    }

    setDisplayName(cleanName)
    setBio(cleanBio)
    setLocation(cleanLocation)
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
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8A97A3' }}>Update your page name, bio, and location.</p>
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

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="profile-location" style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>📍</span> Location / City / Address
            </label>
            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Optional · Shows on public page</span>
          </div>
          <input
            id="profile-location"
            value={location}
            onChange={(e) => { setLocation(e.target.value); setError('') }}
            placeholder="e.g. Casablanca, Morocco or Marrakech, Gueliz"
            maxLength={80}
            style={{ ...inputStyle, marginTop: 4, borderColor: locTooLong ? '#EF4444' : '#E7EDEC' }}
          />
          <p style={{ margin: '3px 0 0', fontSize: 11, color: locTooLong ? '#EF4444' : '#94A3B8', textAlign: 'right' }}>{location.length}/80</p>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showMobilePreviewModal, setShowMobilePreviewModal] = useState(false)
  const [bookingCount, setBookingCount] = useState(0)
  const [leadsCount, setLeadsCount] = useState(0)
  const [floatingToast, setFloatingToast] = useState(null)

  useEffect(() => {
    loadProfile()
    loadLinks()
    loadProducts()
  }, [])

  useEffect(() => {
    if (profile?.username) {
      generateQr()
      syncCounts()

      const interval = setInterval(() => {
        syncCounts()
      }, 3000)

      function onNewBookingOrLead(e) {
        syncCounts()

        // Check notif settings
        const notifSettings = getNotificationSettings(profile)
        if (notifSettings.sound_enabled) {
          playNotificationSound()
        }

        const detail = e?.detail || {}
        if (detail.service_title || detail.client_name) {
          setFloatingToast({
            type: 'booking',
            title: '🗓️ New Appointment Booked!',
            message: `${detail.client_name || 'Client'} scheduled "${detail.service_title || 'Consultation'}" for ${detail.date || ''} at ${detail.time_slot || ''}`,
            phone: detail.client_phone || '',
          })
          setTimeout(() => setFloatingToast(null), 7000)
        } else if (detail.message || detail.name) {
          setFloatingToast({
            type: 'inquiry',
            title: '💬 New Inquiry Received!',
            message: `Message from ${detail.name || 'Visitor'}: "${(detail.message || '').slice(0, 50)}"`,
            phone: detail.phone || '',
          })
          setTimeout(() => setFloatingToast(null), 7000)
        }
      }
      window.addEventListener('linksocio_new_booking', onNewBookingOrLead)
      window.addEventListener('linksocio_booking_updated', onNewBookingOrLead)
      window.addEventListener('linksocio_lead_updated', onNewBookingOrLead)
      window.addEventListener('storage', onNewBookingOrLead)

      return () => {
        clearInterval(interval)
        window.removeEventListener('linksocio_new_booking', onNewBookingOrLead)
        window.removeEventListener('linksocio_booking_updated', onNewBookingOrLead)
        window.removeEventListener('linksocio_lead_updated', onNewBookingOrLead)
        window.removeEventListener('storage', onNewBookingOrLead)
      }
    }
  }, [profile?.username])

  async function syncCounts() {
    if (!profile?.username && !profile?.id) return
    const clean = String(profile?.username || '').toLowerCase().trim().replace(/^@/, '')
    const userId = profile?.id || ''

    // 1. Sync Active Bookings Count (Exclude Cancelled and Completed/Done)
    const bClean = getStoredBookings(clean)
    const bUser = profile?.username ? getStoredBookings(profile.username) : []
    const bId = userId ? getStoredBookings(userId) : []
    const bMap = new Map()
    for (const b of [...bClean, ...bUser, ...bId]) {
      if (b && b.id) bMap.set(b.id, b)
    }
    const localBookings = Array.from(bMap.values())
    const activeLocalBookings = localBookings.filter(
      (b) => b.status !== 'cancelled' && b.status !== 'completed'
    )
    setBookingCount(activeLocalBookings.length)

    try {
      const res = await fetch(`/api/bookings?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(userId)}`)
      if (res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          if (data.bookings && Array.isArray(data.bookings)) {
            const serverBookings = data.bookings
            const activeBookings = serverBookings.filter(
              (b) => b.status !== 'cancelled' && b.status !== 'completed'
            )
            setBookingCount(activeBookings.length)
            const jsonStr = JSON.stringify(serverBookings)
            if (clean) localStorage.setItem(`linksocio_bookings_${clean}`, jsonStr)
            if (userId) localStorage.setItem(`linksocio_bookings_${userId}`, jsonStr)
            if (profile?.username) localStorage.setItem(`linksocio_bookings_${profile.username}`, jsonStr)
          }
        }
      }
    } catch (e) {}

    // 2. Sync Active Leads Count (Exclude Closed, Replied, Completed and Cancelled)
    const lClean = getStoredLeads(clean)
    const lUser = profile?.username ? getStoredLeads(profile.username) : []
    const lId = userId ? getStoredLeads(userId) : []
    const lMap = new Map()
    for (const l of [...lClean, ...lUser, ...lId]) {
      if (l && l.id) lMap.set(l.id, l)
    }
    const localLeads = Array.from(lMap.values())
    const activeLocalLeads = localLeads.filter(
      (l) => l.status !== 'closed' && l.status !== 'cancelled' && l.status !== 'replied' && l.status !== 'completed' && l.status !== 'done'
    )
    setLeadsCount(activeLocalLeads.length)

    try {
      const res = await fetch(`/api/inquiry-leads?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(userId)}`)
      if (res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          if (data.leads && Array.isArray(data.leads)) {
            const serverLeads = data.leads
            const activeLeads = serverLeads.filter(
              (l) => l.status !== 'closed' && l.status !== 'cancelled' && l.status !== 'replied' && l.status !== 'completed' && l.status !== 'done'
            )
            setLeadsCount(activeLeads.length)
          }
        }
      }
    } catch (e) {}
  }

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!data) {
      setProfile(null)
      return
    }

    const [serverInquiry, serverBooking] = await Promise.all([
      fetchServerInquirySettings(data.username, data.id),
      fetchServerBookingSettings(data.username, data.id),
    ])

    if (serverInquiry) {
      data._inquirySettings = serverInquiry
      if (serverInquiry.enabled !== undefined) {
        data.inquiry_enabled = serverInquiry.enabled
      }
    }

    if (serverBooking) {
      data._bookingSettings = serverBooking
      if (serverBooking.enabled !== undefined) {
        data.booking_enabled = serverBooking.enabled
      }
    }

    if (!data.location && data.username) {
      const storedLoc = localStorage.getItem(`linksocio_profile_location_${data.username}`)
      if (storedLoc) data.location = storedLoc
    }

    setProfile({ ...data, _ts: Date.now() })
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
    let combined = []
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })
      if (data && Array.isArray(data)) combined = [...data]
    } catch (e) {}

    try {
      const username = profile?.username || user?.user_metadata?.username || ''
      const res = await fetch(`/api/products?username=${encodeURIComponent(username)}&userId=${encodeURIComponent(user.id)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.products && Array.isArray(json.products)) {
          // Merge rich digital products info by id or name
          for (const sp of json.products) {
            const idx = combined.findIndex((p) => p.id === sp.id || (p.name && sp.name && p.name.trim() === sp.name.trim()))
            if (idx >= 0) {
              combined[idx] = { ...combined[idx], ...sp }
            } else {
              combined.push(sp)
            }
          }
        }
      }
    } catch (e) {}

    setProducts(combined)
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
    { key: 'restaurant', label: 'Restaurant & Menu', icon: '🍽️' },
    { key: 'bookings', label: 'Appointments & Calendar', icon: '🗓️' },
    { key: 'inquiries', label: 'Messages & Leads', icon: '💬' },
    { key: 'notifications', label: 'WhatsApp & Email Alerts', icon: '🔔' },
    { key: 'shop', label: 'Store & Products', icon: '🛍️' },
    { key: 'payouts', label: 'Wallet & 9% Fees', icon: '💰' },
    { key: 'theme', label: 'Appearance & Themes', icon: '🎨' },
    { key: 'qr', label: 'QR Code', icon: '🔲' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  const currentNavItem = navItems.find((it) => it.key === tab) || navItems[0]

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#F8FAFA', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Floating Instant Alert Banner */}
      {floatingToast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 999999,
            background: '#0F172A',
            color: 'white',
            borderRadius: 16,
            padding: '14px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            maxWidth: 380,
            animation: 'slideIn 0.3s ease-out',
            border: '1px solid #334155',
          }}
        >
          <div style={{ fontSize: 24 }}>{floatingToast.type === 'booking' ? '🗓️' : '💬'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#22C55E' }}>{floatingToast.title}</div>
            <div style={{ fontSize: 12, color: '#E2E8F0', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {floatingToast.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTab(floatingToast.type === 'booking' ? 'bookings' : 'inquiries')
              setFloatingToast(null)
            }}
            style={{
              background: '#22C55E',
              color: '#0F172A',
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            View
          </button>
          <button
            type="button"
            onClick={() => setFloatingToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Mobile Bar with 3-Lines Hamburger Menu Button (3 Chartat) */}
      <div
        className="mobile-header"
        style={{
          display: 'none',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #E2E8F0',
          padding: '10px 14px',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 3 Chartat (Hamburger) Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <span style={{ width: 17, height: 2.2, background: '#0F172A', borderRadius: 2 }} />
            <span style={{ width: 17, height: 2.2, background: '#0F172A', borderRadius: 2 }} />
            <span style={{ width: 17, height: 2.2, background: '#0F172A', borderRadius: 2 }} />
          </button>

          {/* Logo & Current Active Section Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="20" height="20" viewBox="0 0 46 46">
                <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
                <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: '#0F172A' }}>Link</span>
                <span style={{ color: '#14B8A6' }}>Socio</span>
              </span>
            </div>

            <div
              onClick={() => setMobileMenuOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: 100,
                padding: '3px 9px',
                fontSize: 11.5,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                maxWidth: 140,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span>{currentNavItem.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentNavItem.label.split(' & ')[0]}</span>
              <span style={{ fontSize: 9, color: '#94A3B8' }}>▼</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowMobilePreviewModal(true)}
          style={{
            background: '#0F172A',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            padding: '6px 12px',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
          }}
        >
          <span>📱 Preview</span>
        </button>
      </div>

      {/* Mobile Navigation Drawer (Opens on 3 chartat click) */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.65)',
            zIndex: 99999,
            display: 'flex',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: '84%',
              maxWidth: 320,
              height: '100%',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 25px rgba(0,0,0,0.2)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 46 46">
                  <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
                  <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
                </svg>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  <span style={{ color: '#0F172A' }}>Link</span>
                  <span style={{ color: '#14B8A6' }}>Socio</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Items in Drawer */}
            <div style={{ padding: '14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ margin: '0 0 6px 8px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Navigation Menu
              </p>
              {navItems.map((item) => {
                const isActive = tab === item.key
                const badgeNum = item.key === 'bookings' ? bookingCount : item.key === 'inquiries' ? leadsCount : 0
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTab(item.key)
                      setMobileMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      background: isActive ? '#0F172A' : '#F8FAFC',
                      border: isActive ? '1px solid #0F172A' : '1px solid #F1F5F9',
                      borderRadius: 14,
                      padding: '12px 14px',
                      fontSize: 13.5,
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? 'white' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 17 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>

                    {badgeNum > 0 && (
                      <span
                        style={{
                          background: isActive ? '#14B8A6' : '#DCFCE7',
                          color: isActive ? 'white' : '#15803D',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 100,
                        }}
                      >
                        {badgeNum}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Profile & Logout in Drawer */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              {profile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: profile.avatar_url
                        ? '#F1F5F9'
                        : `linear-gradient(135deg, ${profile.theme_color || '#14B8A6'}, #0F172A)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 14,
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
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profile.display_name || profile.username}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      @{profile.username}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  logout()
                }}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#EF4444',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>🚪</span>
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              const badgeNum = item.key === 'bookings' ? bookingCount : item.key === 'inquiries' ? leadsCount : 0
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {badgeNum > 0 && (
                    <span
                      style={{
                        background: isActive ? '#14B8A6' : '#E6F7F5',
                        color: isActive ? 'white' : '#0D9488',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 100,
                      }}
                    >
                      {badgeNum}
                    </span>
                  )}
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
          {tab === 'restaurant' && (
            <RestaurantTab profile={profile} onUpdated={loadProfile} />
          )}
          {tab === 'inquiries' && (
            <InquiryTab profile={profile} onUpdated={loadProfile} />
          )}
          {tab === 'bookings' && (
            <BookingTab profile={profile} onUpdated={loadProfile} />
          )}
          {tab === 'notifications' && (
            <NotificationTab profile={profile} onUpdated={loadProfile} onNavigateToTab={(t) => setTab(t)} />
          )}
          {tab === 'shop' && (
            <ShopTab user={user} profile={profile} products={products} reloadProducts={loadProducts} />
          )}
          {tab === 'payouts' && (
            <PayoutsTab user={user} profile={profile} />
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
          {tab === 'settings' && (
            <SettingsTab user={user} profile={profile} onSaved={loadProfile} />
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
          .linksocio-grid { grid-template-columns: minmax(0, 1fr) !important; padding: 12px 12px 48px !important; }
          .linksocio-preview-panel { display: none !important; }
          .mobile-header { display: flex !important; }
          .linksocio-sidebar { display: none !important; }
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
