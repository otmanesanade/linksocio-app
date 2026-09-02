import { useState, useEffect } from 'react'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  saveNotificationSettingsLocally,
  fetchServerNotificationSettings,
  playNotificationSound,
  formatTemplate,
  generateWhatsAppUrl,
  generateMailtoUrl,
  dispatchServerAlert,
} from './notificationService'
import confetti from 'canvas-confetti'

const COUNTRY_CODES = [
  { flag: '🇲🇦', code: '212', label: 'Morocco (+212)' },
  { flag: '🇸🇦', code: '966', label: 'Saudi Arabia (+966)' },
  { flag: '🇦🇪', code: '971', label: 'UAE (+971)' },
  { flag: '🇪🇬', code: '20', label: 'Egypt (+20)' },
  { flag: '🇶🇦', code: '974', label: 'Qatar (+974)' },
  { flag: '🇰🇼', code: '965', label: 'Kuwait (+965)' },
  { flag: '🇺🇸', code: '1', label: 'USA / Canada (+1)' },
  { flag: '🇫🇷', code: '33', label: 'France (+33)' },
  { flag: '🇪🇸', code: '34', label: 'Spain (+34)' },
  { flag: '🇬🇧', code: '44', label: 'UK (+44)' },
  { flag: '🇩🇪', code: '49', label: 'Germany (+49)' },
]

export default function NotificationTab({ profile, onUpdated, onNavigateToTab }) {
  const [settings, setSettings] = useState(() => getNotificationSettings(profile))
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [activeTemplateTab, setActiveTemplateTab] = useState('booking_alert')
  const [logs, setLogs] = useState([])
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)
  const [testSentMsg, setTestSentMsg] = useState('')

  useEffect(() => {
    if (profile) {
      const local = getNotificationSettings(profile)
      setSettings(local)
      loadLogs()

      fetchServerNotificationSettings(profile.username, profile.id).then((serverSettings) => {
        if (serverSettings) {
          setSettings((prev) => ({ ...prev, ...serverSettings }))
          saveNotificationSettingsLocally(profile, { ...local, ...serverSettings })
        }
      })

      const interval = setInterval(() => {
        loadLogs(false)
      }, 4000)

      function onAlertEvent() {
        loadLogs(false)
      }
      window.addEventListener('linksocio_new_booking', onAlertEvent)
      window.addEventListener('linksocio_new_alert', onAlertEvent)

      return () => {
        clearInterval(interval)
        window.removeEventListener('linksocio_new_booking', onAlertEvent)
        window.removeEventListener('linksocio_new_alert', onAlertEvent)
      }
    }
  }, [profile?.id, profile?.username])

  async function loadLogs(showLoading = false) {
    if (!profile?.username && !profile?.id) return
    if (showLoading) setIsRefreshingLogs(true)
    const clean = String(profile?.username || '').toLowerCase().trim().replace(/^@/, '')
    const userId = profile?.id || ''

    try {
      const res = await fetch(`/api/notification-logs?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(userId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs)
        }
      }
    } catch (e) {
    } finally {
      if (showLoading) {
        setTimeout(() => setIsRefreshingLogs(false), 300)
      }
    }
  }

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSaving(true)

    saveNotificationSettingsLocally(profile, settings)

    // Also sync WhatsApp number into profile if modified
    if (settings.whatsapp_number && profile?.id) {
      try {
        // Also update bookings & inquiry local storage
        const currentBooking = JSON.parse(localStorage.getItem(`linksocio_booking_${profile.username}`) || '{}')
        localStorage.setItem(
          `linksocio_booking_${profile.username}`,
          JSON.stringify({ ...currentBooking, whatsapp_number: settings.whatsapp_number })
        )
      } catch (e) {}
    }

    setSaving(false)
    setSavedSuccess(true)
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } })
    } catch (e) {}
    setTimeout(() => setSavedSuccess(false), 2200)

    if (onUpdated) onUpdated()
  }

  function handleSendTestWhatsApp() {
    const phone = settings.whatsapp_number || profile?.whatsapp_number || ''
    if (!phone) {
      alert('Please enter your WhatsApp phone number first.')
      return
    }

    const testText = `🔔 *LinkSocio WhatsApp Alerts Test*\n\n✅ Your WhatsApp notification system is connected and working perfectly!\n📅 Time: ${new Date().toLocaleString()}\nHost: ${profile?.display_name || profile?.username}`
    const url = generateWhatsAppUrl(testText, phone)

    window.open(url, '_blank')
    setTestSentMsg('✓ WhatsApp test alert opened in WhatsApp!')
    setTimeout(() => setTestSentMsg(''), 4000)

    // Log test event
    dispatchServerAlert('test', { channel: 'whatsapp', recipient: phone }, profile?.username, profile?.id)
    loadLogs(false)
  }

  async function handleSendTestEmail() {
    const email = settings.notification_email || profile?.email || ''
    if (!email) {
      alert('Please enter your Notification Email address first.')
      return
    }

    playNotificationSound()
    const res = await dispatchServerAlert(
      'test',
      {
        channel: 'email',
        recipient: email,
        title: 'Test Alert Notification',
        message: 'Your LinkSocio Email alert notification system is working!',
      },
      profile?.username,
      profile?.id
    )

    const subject = `[LinkSocio] Test Alert for @${profile?.username || 'user'}`
    const body = `Hello ${profile?.display_name || profile?.username},\n\nThis is a test notification confirming that your LinkSocio Email Alerts are active.\n\nYou will receive instant alerts whenever someone books a consultation or submits an inquiry.\n\nTimestamp: ${new Date().toLocaleString()}`
    const mailto = generateMailtoUrl(email, subject, body)

    setTestSentMsg(`✓ Email alert dispatched to ${email}!`)
    setTimeout(() => setTestSentMsg(''), 4000)

    loadLogs(false)

    // Also open client mail app as preview
    window.location.href = mailto
  }

  function handleApplyCountryCode(code) {
    const raw = (settings.whatsapp_number || '').replace(/^\+/, '')
    // If number already starts with some code, replace or prefix
    if (!raw) {
      setSettings({ ...settings, whatsapp_number: code })
    } else {
      // Check if it already has digits
      const digits = raw.replace(/[^0-9]/g, '')
      setSettings({ ...settings, whatsapp_number: code + (digits.startsWith(code) ? digits.slice(code.length) : digits) })
    }
  }

  function handleInsertVariable(variableName) {
    const currentText = settings.whatsapp_templates[activeTemplateTab] || ''
    const updated = currentText + ` {${variableName}}`
    setSettings({
      ...settings,
      whatsapp_templates: {
        ...settings.whatsapp_templates,
        [activeTemplateTab]: updated,
      },
    })
  }

  const templateVariables = [
    { key: 'client_name', label: '👤 Client Name' },
    { key: 'service_title', label: '🏷️ Service' },
    { key: 'service_duration', label: '⏱️ Duration' },
    { key: 'date', label: '📅 Date' },
    { key: 'time_slot', label: '⏰ Time' },
    { key: 'client_phone', label: '📞 Phone' },
    { key: 'client_email', label: '✉️ Email' },
    { key: 'service_platform', label: '📹 Platform' },
    { key: 'host_name', label: '👑 Host Name' },
    { key: 'message', label: '💬 Message' },
    { key: 'notes', label: '📝 Notes' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FEF3C7',
              padding: '4px 12px',
              borderRadius: 100,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13 }}>🔔</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>
              WHATSAPP & EMAIL ALERTS (الإشعارات)
            </span>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            Instant Notification Center
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
            Receive real-time WhatsApp messages and Email alerts whenever clients book appointments or send messages.
          </p>
        </div>

        {/* Quick Test Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSendTestWhatsApp}
            style={{
              background: '#22C55E',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)',
            }}
          >
            <span>💬 Test WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleSendTestEmail}
            style={{
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            <span>✉️ Test Email</span>
          </button>

          <button
            type="button"
            onClick={() => playNotificationSound()}
            title="Play alert sound chime"
            style={{
              background: '#F1F5F9',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: 12,
              padding: '9px 12px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🔔 Sound Chime</span>
          </button>
        </div>
      </div>

      {testSentMsg && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            borderRadius: 14,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>🚀</span>
          <span>{testSentMsg}</span>
        </div>
      )}

      {/* Main Form Configuration */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 1. WhatsApp Notifications Card */}
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                💬
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  WhatsApp Alerts (إشعارات واتساب)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Instant WhatsApp notifications sent directly to your phone when an action occurs.
                </p>
              </div>
            </div>

            {/* WhatsApp Master Toggle */}
            <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled}
                onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: settings.whatsapp_enabled ? '#22C55E' : '#CBD5E1',
                  borderRadius: 34,
                  transition: '0.3s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    height: 20,
                    width: 20,
                    left: settings.whatsapp_enabled ? 25 : 3,
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Your WhatsApp Phone Number (رقم الهاتف مع رمز الدولة) *
              </label>
              <input
                type="tel"
                value={settings.whatsapp_number || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="e.g. 212600000000 or +212600000000"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              />

              {/* Quick Country Code Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Quick Country Code:</span>
                {COUNTRY_CODES.slice(0, 7).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleApplyCountryCode(c.code)}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '3px 7px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    {c.flag} +{c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, paddingTop: 6 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.alert_on_booking}
                  onChange={(e) => setSettings({ ...settings, alert_on_booking: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#22C55E' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>🗓️ Alert on New Booking</div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>Notify me immediately when someone schedules</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.alert_on_inquiry}
                  onChange={(e) => setSettings({ ...settings, alert_on_inquiry: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#22C55E' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>💬 Alert on New Message / Lead</div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>Notify me when someone sends an inquiry</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 2. Email Notifications Card */}
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                ✉️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Email Alerts (إشعارات البريد الإلكتروني)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Receive email notifications and dispatch calendar confirmations to clients.
                </p>
              </div>
            </div>

            {/* Email Master Toggle */}
            <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: settings.email_enabled ? '#2563EB' : '#CBD5E1',
                  borderRadius: 34,
                  transition: '0.3s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    height: 20,
                    width: 20,
                    left: settings.email_enabled ? 25 : 3,
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Host Notification Email Address (بريد استلام الإشعارات) *
              </label>
              <input
                type="email"
                value={settings.notification_email || ''}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                placeholder="e.g. otman@example.com"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  fontWeight: 600,
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94A3B8' }}>
                All booking receipts, client details, and message inquiries will be forwarded to this inbox.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.client_email_receipt}
                  onChange={(e) => setSettings({ ...settings, client_email_receipt: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#2563EB' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>📬 Send Client Confirmation</div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>Provide email confirmation receipt to booking clients</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.sound_enabled}
                  onChange={(e) => setSettings({ ...settings, sound_enabled: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#2563EB' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>🔔 Sound Chime & Audio</div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>Play bell chime when new alert arrives on dashboard</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 3. Customizable WhatsApp & Message Templates */}
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Custom Message & WhatsApp Templates (قوالب الرسائل)
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
              Customize the automated text format for alerts, client confirmations, and follow-up messages.
            </p>
          </div>

          {/* Template Sub-tabs */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 12, gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { id: 'booking_alert', label: '🚨 Host Booking Alert' },
              { id: 'inquiry_alert', label: '💬 Host Inquiry Alert' },
              { id: 'booking_confirmation_client', label: '✅ Client Confirmation' },
              { id: 'booking_reminder_client', label: '⏰ Client 24h Reminder' },
              { id: 'inquiry_reply_client', label: '👋 Client Inquiry Reply' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplateTab(t.id)}
                style={{
                  border: 'none',
                  borderRadius: 9,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTemplateTab === t.id ? 'white' : 'transparent',
                  color: activeTemplateTab === t.id ? '#0F172A' : '#64748B',
                  boxShadow: activeTemplateTab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Variables Quick Add Chips */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Click to insert dynamic variable tag:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {templateVariables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key)}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#0D9488',
                    cursor: 'pointer',
                  }}
                >
                  +{v.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={6}
            value={settings.whatsapp_templates[activeTemplateTab] || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                whatsapp_templates: {
                  ...settings.whatsapp_templates,
                  [activeTemplateTab]: e.target.value,
                },
              })
            }
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />

          {/* Live Preview of formatted template */}
          <div style={{ marginTop: 12, background: '#F8FAFC', padding: '12px 16px', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Sample Preview:</span>
            <div style={{ fontSize: 12.5, color: '#0F172A', whiteSpace: 'pre-wrap', marginTop: 4 }}>
              {formatTemplate(settings.whatsapp_templates[activeTemplateTab] || '', {
                client_name: 'Sara Benali',
                client_email: 'sara@example.com',
                client_phone: '+212612345678',
                service_title: '30-Min Strategy Call',
                service_duration: '30',
                date: '2026-09-05',
                time_slot: '10:30 AM',
                service_platform: 'Google Meet',
                host_name: profile?.display_name || profile?.username || 'Otman',
                notes: 'Looking forward to reviewing branding project.',
                message: 'Hello, what are your agency consulting rates?',
              })}
            </div>
          </div>
        </div>

        {/* Submit & Save Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: '#0F172A',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Notification Settings'}
          </button>

          {savedSuccess && (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0D9488' }}>
              ✓ All notification preferences saved!
            </span>
          )}
        </div>
      </form>

      {/* 4. Live Alert History & Logs */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Alert Delivery History & Logs ({logs.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
              Log of recently dispatched email alerts, WhatsApp notifications, and customer inquiries.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadLogs(true)}
            disabled={isRefreshingLogs}
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
            <span>{isRefreshingLogs ? '⏳' : '🔄'}</span>
            <span>{isRefreshingLogs ? 'Updating...' : 'Refresh Logs'}</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: 16,
              border: '1px dashed #CBD5E1',
            }}
          >
            <span style={{ fontSize: 30, display: 'block', marginBottom: 8 }}>📭</span>
            <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>No alerts logged yet</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
              When clients schedule bookings or send inquiries, automated alert logs will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.map((log) => {
              const isBooking = log.type === 'booking'
              const isInquiry = log.type === 'inquiry'
              const isTest = log.type === 'test'

              return (
                <div
                  key={log.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isBooking ? '#E6F7F5' : isInquiry ? '#FEF3C7' : '#EFF6FF',
                        color: isBooking ? '#0D9488' : isInquiry ? '#D97706' : '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {isBooking ? '🗓️' : isInquiry ? '💬' : '🔔'}
                    </span>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                          {log.title || (isBooking ? 'New Booking Alert' : isInquiry ? 'New Inquiry Alert' : 'System Test Alert')}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 100,
                            background: '#ECFDF5',
                            color: '#059669',
                          }}
                        >
                          ✓ Delivered
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                        {log.details || log.message || JSON.stringify(log.data || {})}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>

                    {isBooking && onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('bookings')}
                        style={{
                          background: '#F0FDFA',
                          border: '1px solid #99F6E4',
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#0D9488',
                          cursor: 'pointer',
                        }}
                      >
                        View Calendar
                      </button>
                    )}

                    {isInquiry && onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('inquiries')}
                        style={{
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#D97706',
                          cursor: 'pointer',
                        }}
                      >
                        View Leads
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
