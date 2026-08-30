import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getSocialIcon } from './LivePagePreview'

const QUICK_PRESETS = [
  { label: 'Instagram', prefix: 'https://instagram.com/', placeholder: 'username', icon: 'Instagram' },
  { label: 'WhatsApp', prefix: 'https://wa.me/', placeholder: 'phone with country code (e.g. 212600000000)', icon: 'WhatsApp' },
  { label: 'TikTok', prefix: 'https://tiktok.com/@', placeholder: 'username', icon: 'TikTok' },
  { label: 'YouTube', prefix: 'https://youtube.com/@', placeholder: 'channel', icon: 'YouTube' },
  { label: 'Store / Website', prefix: 'https://', placeholder: 'yourstore.com', icon: 'Globe' },
  { label: 'Telegram', prefix: 'https://t.me/', placeholder: 'channel or username', icon: 'Telegram' },
  { label: 'X (Twitter)', prefix: 'https://x.com/', placeholder: 'username', icon: 'Twitter' },
  { label: 'LinkedIn', prefix: 'https://linkedin.com/in/', placeholder: 'username', icon: 'LinkedIn' },
]

export default function LinksManager({
  profile,
  links,
  onLinksChanged,
  onProfileSaved,
  copied,
  copyLink,
  qrUrl,
  downloadQr,
}) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [activePreset, setActivePreset] = useState(null)
  const [presetInput, setPresetInput] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)

  // Edit Link modal/inline
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editUrl, setEditUrl] = useState('')

  async function addLink(e) {
    if (e) e.preventDefault()
    if (!label || !url) return
    setAdding(true)
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const { error } = await supabase.from('links').insert({
      user_id: profile.id,
      label: label.trim(),
      url: normalized.trim(),
      position: links.length,
      style: 'button',
    })
    setAdding(false)
    if (!error) {
      setLabel('')
      setUrl('')
      setActivePreset(null)
      setPresetInput('')
      onLinksChanged()
    }
  }

  function handlePresetSelect(preset) {
    setActivePreset(preset)
    setLabel(preset.label)
    setPresetInput('')
  }

  function handleApplyPreset() {
    if (!presetInput) return
    const cleanInput = presetInput.replace(/^@/, '')
    let fullUrl = ''
    if (activePreset.label === 'WhatsApp') {
      const cleanPhone = cleanInput.replace(/[^0-9]/g, '')
      fullUrl = `https://wa.me/${cleanPhone}`
    } else if (activePreset.prefix.startsWith('http')) {
      fullUrl = activePreset.prefix.endsWith('/') || activePreset.prefix.endsWith('@')
        ? `${activePreset.prefix}${cleanInput}`
        : `${activePreset.prefix}/${cleanInput}`
    }
    setUrl(fullUrl)
  }

  async function deleteLink(id) {
    await supabase.from('links').delete().eq('id', id)
    onLinksChanged()
  }

  async function toggleActive(link) {
    await supabase.from('links').update({ active: !link.active }).eq('id', link.id)
    onLinksChanged()
  }

  async function setStyle(link, style) {
    await supabase.from('links').update({ style }).eq('id', link.id)
    onLinksChanged()
  }

  async function setIconPosition(link, icon_position) {
    await supabase.from('links').update({ icon_position }).eq('id', link.id)
    onLinksChanged()
  }

  function startEdit(link) {
    setEditingId(link.id)
    setEditLabel(link.label)
    setEditUrl(link.url)
  }

  async function saveEdit(id) {
    if (!editLabel || !editUrl) return
    const normalized = /^https?:\/\//i.test(editUrl) ? editUrl : `https://${editUrl}`
    await supabase.from('links').update({ label: editLabel, url: normalized }).eq('id', id)
    setEditingId(null)
    onLinksChanged()
  }

  // Drag and drop reordering
  const handleDragStart = (idx) => {
    setDraggedIdx(idx)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx)
    }
  }

  const handleDrop = async (dropIdx) => {
    if (draggedIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null)
      setDragOverIdx(null)
      return
    }

    const reordered = [...links]
    const [movedItem] = reordered.splice(draggedIdx, 1)
    reordered.splice(dropIdx, 0, movedItem)

    // Update positions locally
    const updated = reordered.map((item, index) => ({
      ...item,
      position: index,
    }))

    setDraggedIdx(null)
    setDragOverIdx(null)

    // Save batch positions to Supabase
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('links').update({ position: i }).eq('id', updated[i].id)
    }
    onLinksChanged()
  }

  const moveUp = async (index) => {
    if (index === 0) return
    const reordered = [...links]
    const temp = reordered[index]
    reordered[index] = reordered[index - 1]
    reordered[index - 1] = temp
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('links').update({ position: i }).eq('id', reordered[i].id)
    }
    onLinksChanged()
  }

  const moveDown = async (index) => {
    if (index === links.length - 1) return
    const reordered = [...links]
    const temp = reordered[index]
    reordered[index] = reordered[index + 1]
    reordered[index + 1] = temp
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('links').update({ position: i }).eq('id', reordered[i].id)
    }
    onLinksChanged()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Bio Link header */}
      {profile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'white',
            border: '1px solid #E7EDEC',
            borderRadius: 16,
            padding: '14px 18px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#8A97A3', fontWeight: 600, letterSpacing: '0.04em' }}>YOUR LIVE PAGE</p>
            <a
              href={`/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 14.5, fontWeight: 600, color: '#0F172A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>linksocio.com/{profile.username}</span>
              <span style={{ fontSize: 12, color: '#14B8A6' }}>↗</span>
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowQrModal(true)}
              style={{
                flexShrink: 0,
                background: '#F1F5F9',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>🔲</span>
              <span>QR Code</span>
            </button>
            <button
              onClick={copyLink}
              style={{
                flexShrink: 0,
                background: copied ? '#E6F7F5' : '#0F172A',
                color: copied ? '#0D9488' : 'white',
                border: 'none',
                borderRadius: 10,
                padding: '9px 16px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{copied ? '✓ Copied' : '📋 Copy Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Code Quick Modal */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: '28px 24px',
              maxWidth: 360,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(15,23,42,0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
              }}
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              Your QR Code
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#64748B' }}>
              Scan to open <strong>@{profile?.username}</strong>
            </p>

            {qrUrl ? (
              <div
                style={{
                  background: '#F8FAFA',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                  display: 'inline-block',
                  margin: '0 auto 20px',
                }}
              >
                <img
                  src={qrUrl}
                  alt={`QR code for ${profile?.username}`}
                  style={{ width: 190, height: 190, display: 'block', borderRadius: 6 }}
                />
              </div>
            ) : (
              <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A97A3' }}>
                Loading QR Code...
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={downloadQr}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>📥 Download High-Res PNG</span>
              </button>
              <button
                onClick={copyLink}
                style={{
                  width: '100%',
                  background: '#F1F5F9',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Link Copied!' : '📋 Copy Profile URL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Social Presets Bar */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '18px 20px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
          ⚡ Quick Connect Bar
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A97A3' }}>
          Click an icon to quickly configure popular platforms with instant formatting:
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {QUICK_PRESETS.map((p) => {
            const isSelected = activePreset?.label === p.label
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePresetSelect(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isSelected ? '#0F172A' : '#F8FAFA',
                  color: isSelected ? '#FFFFFF' : '#0F172A',
                  border: isSelected ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {getSocialIcon(p.label, isSelected ? '#FFFFFF' : '#14B8A6', 15)}
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>

        {activePreset && (
          <div style={{ marginTop: 14, padding: 14, background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
              Add {activePreset.label} link:
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder={activePreset.placeholder}
                value={presetInput}
                onChange={(e) => setPresetInput(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={handleApplyPreset}
                style={{ background: '#14B8A6', color: 'white', border: 'none', borderRadius: 10, padding: '0 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Set URL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Link Card */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>+ Add Custom Link</p>
        <form onSubmit={addLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            placeholder="Link Title (e.g. My Portfolio, WhatsApp Chat, TikTok)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Destination URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={adding || !label || !url}
            style={{
              background: adding || !label || !url ? '#94A3B8' : '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: adding || !label || !url ? 'default' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {adding ? 'Adding...' : 'Add Link to Bio'}
          </button>
        </form>
      </div>

      {/* Reorderable Links List with Drag & Drop */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
            Your Links ({links.length})
          </p>
          <span style={{ fontSize: 11.5, color: '#8A97A3' }}>
            ↕ Drag handles or use arrows to reorder
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map((link, index) => {
            const isDragging = draggedIdx === index
            const isDragOver = dragOverIdx === index
            const isEditing = editingId === link.id

            return (
              <div
                key={link.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                style={{
                  background: 'white',
                  border: isDragOver ? '2px dashed #14B8A6' : '1px solid #E7EDEC',
                  borderRadius: 16,
                  padding: '14px 16px',
                  opacity: isDragging ? 0.4 : link.active === false ? 0.55 : 1,
                  transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Title"
                      style={inputStyle}
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="URL"
                      style={inputStyle}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ padding: '6px 12px', borderRadius: 8, background: '#F1F5F9', border: 'none', fontSize: 12, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(link.id)}
                        style={{ padding: '6px 14px', borderRadius: 8, background: '#14B8A6', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Drag handle */}
                      <div
                        style={{
                          cursor: 'grab',
                          color: '#94A3B8',
                          fontSize: 16,
                          padding: '0 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          userSelect: 'none',
                        }}
                        title="Drag to reorder"
                      >
                        <span style={{ lineHeight: 0.5 }}>⠿</span>
                      </div>

                      {/* Icon */}
                      <span
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: '#E6F7F5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#14B8A6',
                        }}
                      >
                        {getSocialIcon(link.label, '#14B8A6', 18)}
                      </span>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{link.label}</p>
                          <span style={{ fontSize: 11, color: '#0D9488', fontWeight: 600 }}>
                            {link.clicks || 0} clicks
                          </span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A97A3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {link.url}
                        </p>
                      </div>

                      {/* Up/Down buttons for accessible reordering */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 4, width: 22, height: 18, fontSize: 10, cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#CBD5E1' : '#475569' }}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === links.length - 1}
                          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 4, width: 22, height: 18, fontSize: 10, cursor: index === links.length - 1 ? 'default' : 'pointer', color: index === links.length - 1 ? '#CBD5E1' : '#475569' }}
                        >
                          ▼
                        </button>
                      </div>

                      {/* Edit */}
                      <button
                        onClick={() => startEdit(link)}
                        title="Edit link"
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', fontSize: 12, cursor: 'pointer', color: '#475569' }}
                      >
                        ✏️
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        onClick={() => toggleActive(link)}
                        title={link.active === false ? 'Hidden from public page' : 'Visible on public page'}
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', fontSize: 13, cursor: 'pointer' }}
                      >
                        {link.active === false ? '🙈' : '👁️'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteLink(link.id)}
                        title="Delete link"
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 8px', color: '#DC2626', fontSize: 12, cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Display Style Selector */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F2F4', fontSize: 11, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ color: '#8A97A3', fontSize: 11 }}>Display format:</span>
                      <button
                        onClick={() => setStyle(link, 'button')}
                        style={{ ...chipStyle, background: link.style !== 'icon' ? '#0F172A' : '#F1F2F4', color: link.style !== 'icon' ? 'white' : '#0F172A' }}
                      >
                        Full Button Card
                      </button>
                      <button
                        onClick={() => setStyle(link, 'icon')}
                        style={{ ...chipStyle, background: link.style === 'icon' ? '#0F172A' : '#F1F2F4', color: link.style === 'icon' ? 'white' : '#0F172A' }}
                      >
                        Social Icon Only
                      </button>

                      {link.style === 'icon' && (
                        <div style={{ display: 'inline-flex', gap: 4, marginLeft: 8, alignItems: 'center' }}>
                          <span style={{ color: '#8A97A3' }}>Position:</span>
                          <button
                            onClick={() => setIconPosition(link, 'top')}
                            style={{ ...chipStyle, background: link.icon_position !== 'bottom' ? '#14B8A6' : '#F1F2F4', color: link.icon_position !== 'bottom' ? 'white' : '#0F172A' }}
                          >
                            Top Header
                          </button>
                          <button
                            onClick={() => setIconPosition(link, 'bottom')}
                            style={{ ...chipStyle, background: link.icon_position === 'bottom' ? '#14B8A6' : '#F1F2F4', color: link.icon_position === 'bottom' ? 'white' : '#0F172A' }}
                          >
                            Bottom Footer
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {links.length === 0 && (
            <div style={{ textAlign: 'center', background: 'white', border: '1px dashed #CBD5E1', borderRadius: 16, padding: '32px 16px', color: '#8A97A3' }}>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 500, color: '#0F172A' }}>No links added yet</p>
              <p style={{ margin: 0, fontSize: 12 }}>Choose a preset above or add a custom link to get started.</p>
            </div>
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
  fontSize: 13.5,
  color: '#0F172A',
  outline: 'none',
}

const chipStyle = {
  border: 'none',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}
