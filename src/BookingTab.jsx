import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import confetti from 'canvas-confetti'

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'MAD', symbol: 'DH', label: 'MAD (DH)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'SAR', symbol: 'SAR', label: 'SAR (ر.س)' },
  { code: 'AED', symbol: 'AED', label: 'AED (د.إ)' },
  { code: 'CAD', symbol: 'CAD$', label: 'CAD ($)' },
]

export const DEFAULT_BOOKING_SETTINGS = {
  enabled: true,
  title: 'Book a Consultation',
  subtitle: 'Select a suitable date & time for a 1-on-1 meeting with me.',
  whatsapp_number: '',
  currency: 'USD',
  working_days: [1, 2, 3, 4, 5], // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  start_time: '09:00',
  end_time: '18:00',
  slot_duration: 30, // in minutes
  buffer_time: 10, // in minutes
  services: [
    {
      id: 'srv_1',
      title: '30-Min Strategy Call',
      duration: 30,
      price: 'Free',
      platform: 'Google Meet',
      description: 'Discovery session to discuss your business goals, ideas, and strategy.',
    },
    {
      id: 'srv_2',
      title: '1-on-1 Full Consultation',
      duration: 60,
      price: '$50',
      platform: 'WhatsApp Call',
      description: 'In-depth consultation, personalized action plan and direct Q&A.',
    },
  ],
}

export function getBookingSettings(profile) {
  if (!profile) return DEFAULT_BOOKING_SETTINGS

  if (profile._bookingSettings) {
    return {
      ...DEFAULT_BOOKING_SETTINGS,
      ...profile._bookingSettings,
      enabled: Boolean(profile._bookingSettings.enabled),
    }
  }

  try {
    const idKey = profile.id ? `linksocio_booking_${profile.id}` : null
    const userKey = profile.username ? `linksocio_booking_${profile.username}` : null
    let parsed = null
    const stored = (idKey && localStorage.getItem(idKey)) || (userKey && localStorage.getItem(userKey))
    if (stored) {
      try {
        parsed = JSON.parse(stored)
      } catch (e) {}
    }

    let isEnabled = true
    if (parsed && parsed.enabled !== undefined) {
      isEnabled = Boolean(parsed.enabled)
    } else if (profile.booking_enabled !== undefined && profile.booking_enabled !== null) {
      isEnabled = Boolean(profile.booking_enabled)
    }

    return {
      ...DEFAULT_BOOKING_SETTINGS,
      ...(parsed || {}),
      enabled: isEnabled,
      title: (parsed && parsed.title) || profile.booking_title || DEFAULT_BOOKING_SETTINGS.title,
      subtitle: (parsed && parsed.subtitle) || profile.booking_subtitle || DEFAULT_BOOKING_SETTINGS.subtitle,
      whatsapp_number: (parsed && parsed.whatsapp_number !== undefined) ? parsed.whatsapp_number : (profile.whatsapp_number || ''),
      services: (parsed && parsed.services && parsed.services.length > 0) ? parsed.services : DEFAULT_BOOKING_SETTINGS.services,
    }
  } catch (e) {
    return DEFAULT_BOOKING_SETTINGS
  }
}

export async function fetchServerBookingSettings(username, userId) {
  if (!username && !userId) return null
  try {
    const query = username ? `username=${encodeURIComponent(username)}` : `userId=${encodeURIComponent(userId)}`
    const res = await fetch(`/api/booking-settings?${query}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.settings) {
        return data.settings
      }
    }
  } catch (e) {}
  return null
}

export function saveBookingSettingsLocally(profile, settings) {
  if (!profile) return
  try {
    const dataStr = JSON.stringify(settings)
    if (profile.id) localStorage.setItem(`linksocio_booking_${profile.id}`, dataStr)
    if (profile.username) localStorage.setItem(`linksocio_booking_${profile.username}`, dataStr)
  } catch (e) {}

  // Sync with server API
  try {
    fetch('/api/booking-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: profile.username || '',
        userId: profile.id || '',
        settings,
      }),
    }).catch(() => {})
  } catch (e) {}
}

export function getStoredBookings(profileUsername) {
  if (!profileUsername) return []
  const clean = String(profileUsername).toLowerCase().trim()
  try {
    const raw =
      localStorage.getItem(`linksocio_bookings_${clean}`) ||
      localStorage.getItem(`linksocio_bookings_${profileUsername}`)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

export async function recordNewBooking(profileUsername, booking) {
  if (!profileUsername || !booking) return null
  const clean = String(profileUsername).toLowerCase().trim()
  try {
    const existing = getStoredBookings(clean)
    const newBooking = {
      id: 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      ...booking,
    }
    const updated = [newBooking, ...existing]
    const jsonStr = JSON.stringify(updated)
    localStorage.setItem(`linksocio_bookings_${clean}`, jsonStr)
    localStorage.setItem(`linksocio_bookings_${profileUsername}`, jsonStr)

    // Trigger local and cross-tab update event
    try {
      window.dispatchEvent(new CustomEvent('linksocio_new_booking', { detail: newBooking }))
    } catch (e) {}

    // Sync to server API
    await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: clean, booking: newBooking }),
    }).catch(() => {})

    return newBooking
  } catch (e) {
    return null
  }
}

export default function BookingTab({ profile, onUpdated }) {
  const [settings, setSettings] = useState(DEFAULT_BOOKING_SETTINGS)
  const [bookings, setBookings] = useState([])
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'confirmed' | 'completed' | 'cancelled'
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState(null)

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    title: '',
    duration: 30,
    price: 'Free',
    platform: 'Google Meet',
    description: '',
  })

  const dayNames = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
  ]

  useEffect(() => {
    if (profile) {
      const local = getBookingSettings(profile)
      setSettings(local)
      loadBookings(false)

      fetchServerBookingSettings(profile.username, profile.id).then((serverSettings) => {
        if (serverSettings) {
          setSettings((prev) => ({ ...prev, ...serverSettings }))
          if (profile) {
            saveBookingSettingsLocally(profile, { ...local, ...serverSettings })
          }
        }
      })

      // Realtime polling every 3 seconds for new appointments from server
      const interval = setInterval(() => {
        loadBookings(false)
      }, 3000)

      // Listen for direct local/preview booking events
      function handleNewBookingEvent() {
        loadBookings(false)
      }
      window.addEventListener('linksocio_new_booking', handleNewBookingEvent)
      window.addEventListener('storage', handleNewBookingEvent)

      return () => {
        clearInterval(interval)
        window.removeEventListener('linksocio_new_booking', handleNewBookingEvent)
        window.removeEventListener('storage', handleNewBookingEvent)
      }
    }
  }, [profile?.id, profile?.username])

  async function loadBookings(showIndicator = false) {
    if (!profile?.username) return
    const cleanUsername = String(profile.username).toLowerCase().trim()
    if (showIndicator) setIsRefreshing(true)

    const localBookings = getStoredBookings(cleanUsername)
    if (localBookings && localBookings.length > 0) {
      setBookings((prev) => {
        // Keep freshest list
        return localBookings.length >= prev.length ? localBookings : prev
      })
    }

    try {
      const res = await fetch(`/api/bookings?username=${encodeURIComponent(cleanUsername)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.bookings && Array.isArray(data.bookings)) {
          // Merge local and server bookings by unique ID
          const combined = [...data.bookings]
          const existingIds = new Set(data.bookings.map((b) => b.id))
          for (const lb of localBookings) {
            if (!existingIds.has(lb.id)) {
              combined.push(lb)
            }
          }
          combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          setBookings(combined)
          localStorage.setItem(`linksocio_bookings_${cleanUsername}`, JSON.stringify(combined))
        }
      }
    } catch (e) {
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 400)
      }
    }
  }

  async function handleToggleEnabled(newVal) {
    const updated = { ...settings, enabled: newVal }
    setSettings(updated)
    saveBookingSettingsLocally(profile, updated)

    try {
      await supabase.from('profiles').update({
        booking_enabled: newVal,
      }).eq('id', profile.id)
    } catch (err) {}

    if (onUpdated) onUpdated()
  }

  function handleDayToggle(dayId) {
    const current = settings.working_days || []
    let updatedDays
    if (current.includes(dayId)) {
      if (current.length === 1) return // Keep at least one day
      updatedDays = current.filter((d) => d !== dayId)
    } else {
      updatedDays = [...current, dayId].sort()
    }
    const updated = { ...settings, working_days: updatedDays }
    setSettings(updated)
    saveBookingSettingsLocally(profile, updated)
  }

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSaving(true)

    saveBookingSettingsLocally(profile, settings)

    try {
      await supabase.from('profiles').update({
        booking_enabled: settings.enabled,
        booking_title: settings.title,
        booking_subtitle: settings.subtitle,
      }).eq('id', profile.id)
    } catch (err) {}

    setSaving(false)
    setSavedSuccess(true)
    try {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } })
    } catch (e) {}
    setTimeout(() => setSavedSuccess(false), 2500)

    if (onUpdated) onUpdated()
  }

  function openAddService() {
    setEditingService(null)
    setServiceForm({
      title: '',
      duration: 30,
      price: 'Free',
      platform: 'Google Meet',
      description: '',
    })
    setShowServiceModal(true)
  }

  function openEditService(service) {
    setEditingService(service)
    setServiceForm({
      title: service.title || '',
      duration: service.duration || 30,
      price: service.price || 'Free',
      platform: service.platform || 'Google Meet',
      description: service.description || '',
    })
    setShowServiceModal(true)
  }

  function handleSaveService(e) {
    e.preventDefault()
    if (!serviceForm.title.trim()) return

    let updatedServices = [...(settings.services || [])]
    if (editingService) {
      updatedServices = updatedServices.map((s) => (s.id === editingService.id ? { ...s, ...serviceForm } : s))
    } else {
      const newService = {
        id: 'srv_' + Date.now(),
        ...serviceForm,
      }
      updatedServices.push(newService)
    }

    const updatedSettings = { ...settings, services: updatedServices }
    setSettings(updatedSettings)
    saveBookingSettingsLocally(profile, updatedSettings)
    setShowServiceModal(false)
    if (onUpdated) onUpdated()
  }

  function handleDeleteService(id) {
    if ((settings.services || []).length <= 1) {
      alert('You must have at least one booking service.')
      return
    }
    const updatedServices = (settings.services || []).filter((s) => s.id !== id)
    const updatedSettings = { ...settings, services: updatedServices }
    setSettings(updatedSettings)
    saveBookingSettingsLocally(profile, updatedSettings)
    if (onUpdated) onUpdated()
  }

  async function updateBookingStatus(bookingId, newStatus) {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return { ...b, status: newStatus }
      }
      return b
    })
    setBookings(updated)
    localStorage.setItem(`linksocio_bookings_${profile.username}`, JSON.stringify(updated))

    try {
      await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          bookingId,
          status: newStatus,
        }),
      })
    } catch (e) {}
  }

  function exportBookingsToCSV() {
    if (bookings.length === 0) return
    const headers = ['Client Name', 'Email', 'Phone', 'Service', 'Date', 'Time Slot', 'Status', 'Notes', 'Created At']
    const rows = bookings.map((b) => [
      `"${(b.client_name || '').replace(/"/g, '""')}"`,
      `"${(b.client_email || '').replace(/"/g, '""')}"`,
      `"${(b.client_phone || '').replace(/"/g, '""')}"`,
      `"${(b.service_title || '').replace(/"/g, '""')}"`,
      `"${b.date || ''}"`,
      `"${b.time_slot || ''}"`,
      `"${b.status || ''}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
      `"${b.createdAt || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `linksocio_bookings_${profile?.username || 'user'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getGoogleCalUrl(booking) {
    const title = encodeURIComponent(`Meeting: ${booking.service_title || 'Consultation'} with ${booking.client_name}`)
    const details = encodeURIComponent(`Client: ${booking.client_name}\nEmail: ${booking.client_email}\nPhone: ${booking.client_phone}\nNotes: ${booking.notes || 'None'}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`
  }

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true
    return b.status === statusFilter
  })

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const completedCount = bookings.filter((b) => b.status === 'completed').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E7EDEC',
          borderRadius: 20,
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E6F7F5', padding: '4px 12px', borderRadius: 100, marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>🗓️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488' }}>BOOKING & APPOINTMENTS</span>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            Consultation & Meeting Calendar
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
            Allow clients and followers to schedule 1-on-1 consultations directly from your profile.
          </p>
        </div>

        {/* Master Enable/Disable Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', padding: '10px 16px', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              {settings.enabled ? 'Calendar is Active' : 'Calendar is Disabled'}
            </div>
            <div style={{ fontSize: 11, color: settings.enabled ? '#0D9488' : '#94A3B8' }}>
              {settings.enabled ? 'Visible on your public profile' : 'Hidden from public visitors'}
            </div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.enabled ? '#0D9488' : '#CBD5E1',
                borderRadius: 34,
                transition: '0.3s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  height: 20,
                  width: 20,
                  left: settings.enabled ? 25 : 3,
                  bottom: 3,
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </span>
          </label>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, padding: '16px 20px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Bookings</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{bookings.length}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, padding: '16px 20px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase' }}>Confirmed / Upcoming</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488', marginTop: 4 }}>{confirmedCount}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, padding: '16px 20px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Completed</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#64748B', marginTop: 4 }}>{completedCount}</div>
        </div>
      </div>

      {/* Consultation Services & Types Section */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Consultation Types & Services
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
              Create different meeting options (e.g. 15-min discovery call, 1-hour coaching).
            </p>
          </div>

          <button
            type="button"
            onClick={openAddService}
            style={{
              background: '#0D9488',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+ Add Meeting Type</span>
          </button>
        </div>

        {/* Services List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(settings.services || []).map((srv) => (
            <div
              key={srv.id}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{srv.title}</span>
                  <span style={{ fontSize: 11, background: '#E6F7F5', color: '#0D9488', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                    ⏱️ {srv.duration} mins
                  </span>
                  <span style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                    🏷️ {srv.price || 'Free'}
                  </span>
                  <span style={{ fontSize: 11, background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                    📹 {srv.platform || 'Online'}
                  </span>
                </div>
                {srv.description && (
                  <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#64748B' }}>{srv.description}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => openEditService(srv)}
                  style={{
                    background: 'white',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteService(srv.id)}
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#DC2626',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Availability & Working Hours Config */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
          Availability & Working Hours
        </h3>

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Days of week selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              Available Days of the Week:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {dayNames.map((d) => {
                const isSelected = (settings.working_days || []).includes(d.id)
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => handleDayToggle(d.id)}
                    style={{
                      border: isSelected ? '2px solid #0D9488' : '1px solid #CBD5E1',
                      background: isSelected ? '#E6F7F5' : 'white',
                      color: isSelected ? '#0D9488' : '#64748B',
                      borderRadius: 12,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time range row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Daily Start Time:
              </label>
              <input
                type="time"
                value={settings.start_time || '09:00'}
                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Daily End Time:
              </label>
              <input
                type="time"
                value={settings.end_time || '18:00'}
                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Card Header Titles & Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Section Title:
              </label>
              <input
                type="text"
                value={settings.title || ''}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="e.g. Book a Consultation"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Default Currency / العملة:
              </label>
              <select
                value={settings.currency || 'USD'}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  background: 'white',
                  fontWeight: 600,
                }}
              >
                <option value="USD">💵 USD ($) - US Dollar</option>
                <option value="EUR">💶 EUR (€) - Euro</option>
                <option value="MAD">🇲🇦 MAD (DH) - Moroccan Dirham</option>
                <option value="GBP">💷 GBP (£) - British Pound</option>
                <option value="SAR">🇸🇦 SAR (ر.س) - Saudi Riyal</option>
                <option value="AED">🇦🇪 AED (د.إ) - UAE Dirham</option>
                <option value="CAD">🇨🇦 CAD ($) - Canadian Dollar</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                WhatsApp Notification Phone (Optional):
              </label>
              <input
                type="tel"
                value={settings.whatsapp_number || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="e.g. 212600000000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '11px 24px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving...' : '💾 Save Booking Settings'}
            </button>

            {savedSuccess && (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0D9488' }}>
                ✓ Settings saved successfully!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Bookings / Appointments CRM Table */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Scheduled Appointments ({filteredBookings.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
              Manage clients who booked a meeting with you.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Live real-time indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, color: '#059669' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              <span>Live Auto-Sync</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadBookings(true)}
              disabled={isRefreshing}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{isRefreshing ? '⏳' : '🔄'}</span>
              <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
            </button>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
              {['all', 'confirmed', 'completed', 'cancelled'].map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setStatusFilter(tabKey)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '5px 10px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: statusFilter === tabKey ? 'white' : 'transparent',
                    color: statusFilter === tabKey ? '#0F172A' : '#64748B',
                    boxShadow: statusFilter === tabKey ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {tabKey}
                </button>
              ))}
            </div>

            {bookings.length > 0 && (
              <button
                type="button"
                onClick={exportBookingsToCSV}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: 16,
              border: '1px dashed #CBD5E1',
            }}
          >
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🗓️</span>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No appointments found</h4>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
              When visitors schedule a session through your page, their bookings will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredBookings.map((b) => {
              const cleanPhone = (b.client_phone || '').replace(/[^0-9]/g, '')
              const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null

              return (
                <div
                  key={b.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{b.client_name}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 100,
                            background:
                              b.status === 'confirmed' ? '#E6F7F5' : b.status === 'completed' ? '#F1F5F9' : '#FEF2F2',
                            color:
                              b.status === 'confirmed' ? '#0D9488' : b.status === 'completed' ? '#64748B' : '#DC2626',
                            textTransform: 'uppercase',
                          }}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12.5, color: '#64748B', flexWrap: 'wrap' }}>
                        <span>📅 <strong>{b.date}</strong></span>
                        <span>⏰ <strong>{b.time_slot}</strong></span>
                        <span>🏷️ {b.service_title} ({b.service_duration} min)</span>
                      </div>
                    </div>

                    {/* Status Toggle Actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {b.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b.id, 'completed')}
                          style={{
                            background: '#F0FDFA',
                            border: '1px solid #99F6E4',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#0D9488',
                          }}
                        >
                          ✓ Mark Done
                        </button>
                      )}

                      {b.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b.id, 'cancelled')}
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#DC2626',
                          }}
                        >
                          ✕ Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Client Contact Info & Notes */}
                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 12, fontSize: 12.5, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {b.client_email && <span>✉️ {b.client_email}</span>}
                      {b.client_phone && <span>📞 {b.client_phone}</span>}
                      {b.notes && <span>💬 <em>"{b.notes}"</em></span>}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#22C55E',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: 8,
                            padding: '4px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      )}

                      <a
                        href={getGoogleCalUrl(b)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#EFF6FF',
                          color: '#2563EB',
                          textDecoration: 'none',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>📅 Add to Cal</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {showServiceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowServiceModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 20,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              {editingService ? 'Edit Meeting Type' : 'Add New Meeting Type'}
            </h3>

            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30-Min Strategy Call"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Duration (Minutes)
                  </label>
                  <select
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, boxSizing: 'border-box' }}
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins (1 hr)</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Price & Currency / الثمن والعملة
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $50, 50 €, 250 DH, Free"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                  {/* Currency & price presets */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {['Free', '$25', '$50', '$100', '25 €', '50 €', '100 €', '200 DH', '300 DH', '500 DH', '£40'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setServiceForm({ ...serviceForm, price: preset })}
                        style={{
                          background: serviceForm.price === preset ? '#0D9488' : '#F1F5F9',
                          color: serviceForm.price === preset ? 'white' : '#475569',
                          border: 'none',
                          borderRadius: 6,
                          padding: '3px 7px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Meeting Platform / Location
                </label>
                <select
                  value={serviceForm.platform}
                  onChange={(e) => setServiceForm({ ...serviceForm, platform: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, boxSizing: 'border-box' }}
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="WhatsApp Call">WhatsApp Video / Audio Call</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Zoom">Zoom</option>
                  <option value="In Person">In Person</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What will you discuss in this consultation?"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#0D9488', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'white' }}
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
