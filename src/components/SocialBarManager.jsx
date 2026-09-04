import { useState, useEffect } from 'react'
import { SOCIAL_PLATFORMS, getStoredSocials, saveStoredSocials } from '../utils/socialPlatforms'
import { getSocialIcon } from './LivePagePreview'
import confetti from 'canvas-confetti'

export default function SocialBarManager({ profile, user, onSocialsChanged }) {
  const [socials, setSocials] = useState([])
  const [addingPlatform, setAddingPlatform] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [savedToast, setSavedToast] = useState(false)

  const username = profile?.username || ''
  const userId = profile?.id || user?.id || ''

  useEffect(() => {
    const loaded = getStoredSocials(username, userId)
    setSocials(loaded)
  }, [username, userId])

  function persist(newSocials) {
    setSocials(newSocials)
    saveStoredSocials(username, userId, newSocials)
    if (onSocialsChanged) onSocialsChanged(newSocials)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  function handleAdd(platform) {
    if (!inputValue.trim()) return
    const formattedUrl = platform.formatUrl(inputValue.trim())
    if (!formattedUrl) return

    // Remove existing if any, add new
    const filtered = socials.filter((s) => s.platformId !== platform.id)
    const newEntry = {
      platformId: platform.id,
      name: platform.name,
      url: formattedUrl,
      rawHandle: inputValue.trim(),
      active: true,
    }
    const updated = [...filtered, newEntry]
    persist(updated)

    try {
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.6 } })
    } catch (e) {}

    setAddingPlatform(null)
    setInputValue('')
  }

  function handleToggle(platformId) {
    const updated = socials.map((s) => (s.platformId === platformId ? { ...s, active: !s.active } : s))
    persist(updated)
  }

  function handleDelete(platformId) {
    const updated = socials.filter((s) => s.platformId !== platformId)
    persist(updated)
  }

  const existingIds = new Set(socials.map((s) => s.platformId))
  const availablePlatforms = SOCIAL_PLATFORMS.filter((p) => !existingIds.has(p.id))

  return (
    <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', padding: '3px 10px', borderRadius: 100, marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>⚡</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB' }}>HEADER SOCIAL ICONS BAR</span>
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
            Social Media Icons (Top Bar)
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
            Display high-contrast circular social icons directly below your Bio for instant 1-tap connection.
          </p>
        </div>

        {savedToast && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '4px 10px', borderRadius: 8 }}>
            ✓ Saved Live!
          </span>
        )}
      </div>

      {/* Active Socials List */}
      {socials.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {socials.map((item) => {
            const platform = SOCIAL_PLATFORMS.find((p) => p.id === item.platformId) || { name: item.name, brandColor: '#0F172A' }
            return (
              <div
                key={item.platformId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: item.active ? '#F8FAFC' : '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '10px 14px',
                  opacity: item.active ? 1 : 0.6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: platform.brandColor || '#0F172A',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getSocialIcon(item.name || platform.name, '#FFFFFF', 18)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                      {platform.name}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        margin: 0,
                        fontSize: 11.5,
                        color: '#64748B',
                        textDecoration: 'none',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.rawHandle || item.url} ↗
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.platformId)}
                    title={item.active ? 'Hide from page' : 'Show on page'}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: item.active ? '#E0F2FE' : 'white',
                      color: item.active ? '#0369A1' : '#64748B',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.active ? 'Active' : 'Hidden'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.platformId)}
                    title="Remove social icon"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: '1px solid #FCA5A5',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            background: '#F8FAFC',
            border: '2px dashed #CBD5E1',
            borderRadius: 16,
            padding: '24px 16px',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🌐</span>
          <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
            No social icons added yet
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
            Pick a platform below (Instagram, WhatsApp, TikTok, etc.) to display its icon on your profile.
          </p>
        </div>
      )}

      {/* Adding Input Modal / Bar */}
      {addingPlatform ? (
        <div
          style={{
            background: '#F8FAFC',
            border: '2px solid #2563EB',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: addingPlatform.brandColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              {getSocialIcon(addingPlatform.name, '#FFFFFF', 16)}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                Add {addingPlatform.name}
              </p>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>
                {addingPlatform.placeholder}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              autoFocus
              placeholder={addingPlatform.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd(addingPlatform)
                if (e.key === 'Escape') setAddingPlatform(null)
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: '1.5px solid #CBD5E1',
                borderRadius: 10,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => handleAdd(addingPlatform)}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Add Icon
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingPlatform(null)
                setInputValue('')
              }}
              style={{
                background: '#E2E8F0',
                color: '#475569',
                border: 'none',
                borderRadius: 10,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Available Platforms Grid */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          + Add Platform Icon:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {availablePlatforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => {
                setAddingPlatform(platform)
                setInputValue('')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 100,
                padding: '6px 13px',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = platform.brandColor
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: platform.brandColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getSocialIcon(platform.name, '#FFFFFF', 10)}
              </div>
              <span>{platform.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
