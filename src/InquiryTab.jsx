import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import confetti from 'canvas-confetti'

const DEFAULT_SETTINGS = {
  enabled: true,
  whatsapp_number: '',
  title: 'Send a Message',
  subtitle: 'Got a question or project inquiry? Write to me directly!',
  placeholder: 'Type your message or inquiry here...',
  button_text: 'Send via WhatsApp',
  auto_open_whatsapp: true,
}

export function getInquirySettings(profile) {
  if (!profile) return DEFAULT_SETTINGS
  try {
    const idKey = profile.id ? `linksocio_inquiry_${profile.id}` : null
    const userKey = profile.username ? `linksocio_inquiry_${profile.username}` : null

    let parsed = {}
    const stored = (idKey && localStorage.getItem(idKey)) || (userKey && localStorage.getItem(userKey))
    if (stored) {
      try {
        parsed = JSON.parse(stored)
      } catch (e) {}
    }

    // Determine active status: prioritize local toggle if set, else profile column, else default true
    let isEnabled = true
    if (parsed.enabled !== undefined) {
      isEnabled = Boolean(parsed.enabled)
    } else if (profile.inquiry_enabled !== undefined && profile.inquiry_enabled !== null) {
      isEnabled = Boolean(profile.inquiry_enabled)
    }

    return {
      enabled: isEnabled,
      whatsapp_number: parsed.whatsapp_number !== undefined ? parsed.whatsapp_number : (profile.whatsapp_number || ''),
      title: parsed.title || profile.inquiry_title || DEFAULT_SETTINGS.title,
      subtitle: parsed.subtitle || profile.inquiry_subtitle || DEFAULT_SETTINGS.subtitle,
      placeholder: parsed.placeholder || profile.inquiry_placeholder || DEFAULT_SETTINGS.placeholder,
      button_text: parsed.button_text || profile.inquiry_button_text || DEFAULT_SETTINGS.button_text,
      auto_open_whatsapp: parsed.auto_open_whatsapp ?? true,
    }
  } catch (e) {
    return DEFAULT_SETTINGS
  }
}

export function saveInquirySettingsLocally(profile, settings) {
  if (!profile) return
  try {
    const dataStr = JSON.stringify(settings)
    if (profile.id) {
      localStorage.setItem(`linksocio_inquiry_${profile.id}`, dataStr)
    }
    if (profile.username) {
      localStorage.setItem(`linksocio_inquiry_${profile.username}`, dataStr)
    }
  } catch (e) {}
}

export function getStoredLeads(profileUsername) {
  if (!profileUsername) return []
  try {
    const key = `linksocio_leads_${profileUsername}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

export function recordLeadLocally(profileUsername, lead) {
  if (!profileUsername) return null
  try {
    const key = `linksocio_leads_${profileUsername}`
    const existing = getStoredLeads(profileUsername)
    const newLead = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      status: 'new',
      ...lead,
    }
    const updated = [newLead, ...existing]
    localStorage.setItem(key, JSON.stringify(updated))
    return newLead
  } catch (e) {
    return null
  }
}

export default function InquiryTab({ profile, onUpdated }) {
  const [settings, setSettings] = useState(() => getInquirySettings(profile))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [copiedLeadId, setCopiedLeadId] = useState(null)

  useEffect(() => {
    if (profile) {
      setSettings(getInquirySettings(profile))
      loadLeads()
    }
  }, [profile])

  function loadLeads() {
    if (!profile?.username) return
    const stored = getStoredLeads(profile.username)
    setLeads(stored)
  }

  // Toggle handler that immediately saves and updates state
  async function handleToggleEnabled(newVal) {
    const updated = { ...settings, enabled: newVal }
    setSettings(updated)
    saveInquirySettingsLocally(profile, updated)

    try {
      await supabase.from('profiles').update({
        inquiry_enabled: newVal,
      }).eq('id', profile.id)
    } catch (err) {
      // Ignored if column doesn't exist
    }

    if (onUpdated) onUpdated()
  }

  async function handleSaveSettings(e) {
    e?.preventDefault()
    setSaving(true)
    saveInquirySettingsLocally(profile, settings)

    try {
      await supabase.from('profiles').update({
        inquiry_enabled: settings.enabled,
        whatsapp_number: settings.whatsapp_number,
        inquiry_title: settings.title,
        inquiry_subtitle: settings.subtitle,
      }).eq('id', profile.id)
    } catch (err) {
      // Supabase custom columns catch
    }

    setSaving(false)
    setSaved(true)
    try {
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } })
    } catch (e) {}
    if (onUpdated) onUpdated()
    setTimeout(() => setSaved(false), 2000)
  }

  function handleUpdateLeadStatus(leadId, newStatus) {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    setLeads(updated)
    localStorage.setItem(`linksocio_leads_${profile.username}`, JSON.stringify(updated))
  }

  function handleDeleteLead(leadId) {
    const updated = leads.filter((l) => l.id !== leadId)
    setLeads(updated)
    localStorage.setItem(`linksocio_leads_${profile.username}`, JSON.stringify(updated))
  }

  function handleExportCsv() {
    if (leads.length === 0) return
    const headers = ['Date', 'Name', 'Phone/WhatsApp', 'Message', 'Status']
    const rows = leads.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      l.status || 'new',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads_${profile.username}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredLeads = leads
    .filter((l) => {
      if (filter === 'new') return l.status === 'new'
      if (filter === 'replied') return l.status === 'replied'
      return true
    })
    .filter((l) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.message && l.message.toLowerCase().includes(q))
      )
    })

  const newLeadsCount = leads.filter((l) => l.status === 'new').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Settings Card */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: settings.enabled ? '#E6F7F5' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              💬
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Direct WhatsApp & Inquiry Box
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                {settings.enabled ? 'Enabled: Visitors can send you inquiries directly from your page.' : 'Disabled: The inquiry box is currently hidden from your page.'}
              </p>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: settings.enabled ? '#0D9488' : '#94A3B8' }}>
              {settings.enabled ? 'Active' : 'Disabled'}
            </span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: '#0D9488', cursor: 'pointer' }}
            />
          </label>
        </div>

        {settings.enabled && (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
            {/* WhatsApp Number */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Your WhatsApp Phone Number (with country code)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 15 }}>📞</span>
                <input
                  type="text"
                  placeholder="e.g. 212612345678 or +14155552671"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value.trim() })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94A3B8' }}>
                When visitors click send, their message will open directly in your WhatsApp with their name and details.
              </p>
            </div>

            {/* Title & Button Text */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Box Title
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Button Text
                </label>
                <input
                  type="text"
                  value={settings.button_text}
                  onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Subtitle Description
              </label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Quick Preset Ideas */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Quick Ideas:</span>
              {[
                { title: 'Send an Inquiry 💬', sub: 'Leave your message to chat directly on WhatsApp' },
                { title: 'Get a Free Quote 💼', sub: 'Leave your details to receive pricing and availability' },
                { title: 'Chat With Me Direct ⚡', sub: 'Have a quick question? Message me right away!' },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSettings({ ...settings, title: preset.title, subtitle: preset.sub })}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 11,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Received Leads & Messages Inbox */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              📬
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Received Inquiries & Leads Inbox
                </h3>
                {newLeadsCount > 0 && (
                  <span style={{ background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                    {newLeadsCount} New
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                Messages submitted by visitors on your LinkSocio page.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {leads.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>📥 Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
            {[
              { key: 'all', label: `All (${leads.length})` },
              { key: 'new', label: `New (${newLeadsCount})` },
              { key: 'replied', label: 'Replied' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  background: filter === f.key ? 'white' : 'transparent',
                  color: filter === f.key ? '#0F172A' : '#64748B',
                  border: 'none',
                  borderRadius: 8,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: filter === f.key ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: filter === f.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="🔍 Search inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 160,
              padding: '6px 12px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              fontSize: 12.5,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Leads List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredLeads.map((lead) => {
            const isNew = lead.status === 'new'
            const phoneClean = (lead.phone || '').replace(/[^0-9]/g, '')

            return (
              <div
                key={lead.id}
                style={{
                  border: isNew ? '1px solid #14B8A6' : '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '14px 16px',
                  background: isNew ? '#F0FDFA' : '#FAFAFA',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#0F172A',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {lead.name?.[0]?.toUpperCase() || '👤'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                        {lead.name || 'Anonymous Visitor'}
                      </p>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>
                        {lead.phone ? `📞 ${lead.phone}` : 'No phone provided'} · {new Date(lead.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleUpdateLeadStatus(lead.id, isNew ? 'replied' : 'new')}
                      style={{
                        background: isNew ? '#CCFBF1' : '#E2E8F0',
                        color: isNew ? '#0F766E' : '#475569',
                        border: 'none',
                        borderRadius: 100,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isNew ? '● New' : '✓ Replied'}
                    </button>
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      title="Delete inquiry"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        fontSize: 13,
                        padding: '2px 6px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: '#334155',
                    lineHeight: 1.5,
                    marginBottom: 10,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {lead.message || 'No message content.'}
                </div>

                {/* Quick Reply Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {phoneClean && (
                    <a
                      href={`https://wa.me/${phoneClean}?text=${encodeURIComponent(`Salam ${lead.name || ''}! Thank you for reaching out through my LinkSocio page.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleUpdateLeadStatus(lead.id, 'replied')}
                      style={{
                        background: '#22C55E',
                        color: 'white',
                        borderRadius: 8,
                        padding: '5px 12px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>💬 WhatsApp Reply</span>
                    </a>
                  )}

                  {phoneClean && (
                    <a
                      href={`tel:${phoneClean}`}
                      style={{
                        background: '#F1F5F9',
                        color: '#334155',
                        borderRadius: 8,
                        padding: '5px 12px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>📞 Call</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${lead.name} (${lead.phone}): ${lead.message}`)
                      setCopiedLeadId(lead.id)
                      setTimeout(() => setCopiedLeadId(null), 1500)
                    }}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedLeadId === lead.id ? '✓ Copied' : '📋 Copy Text'}
                  </button>
                </div>
              </div>
            )
          })}

          {filteredLeads.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 16px', background: '#FAFAFA', borderRadius: 14, border: '1px dashed #CBD5E1' }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>💬</span>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                No inquiries in inbox yet
              </p>
              <p style={{ margin: '4px 0 14px', fontSize: 12, color: '#64748B' }}>
                When visitors on your page use the Inquiry Box, their messages will appear here and in your WhatsApp.
              </p>
              <button
                type="button"
                onClick={() => {
                  recordLeadLocally(profile.username, {
                    name: 'Test Customer (Karim)',
                    phone: '+212612345678',
                    message: 'Salam! I loved your portfolio. Are you available for a project this month?',
                  })
                  loadLeads()
                }}
                style={{
                  background: 'white',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                + Add Sample Inquiry to Test
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
