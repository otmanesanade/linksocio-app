import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { THEMES, FONTS, BUTTON_STYLES } from './themes'
import AvatarUpload from './components/AvatarUpload'

export default function ThemeTab({ user, profile, onUpdated }) {
  const [selectedTheme, setSelectedTheme] = useState(profile?.theme_preset || 'default')
  const [selectedFont, setSelectedFont] = useState(profile?.font_family || 'default')
  const [selectedButtonStyle, setSelectedButtonStyle] = useState(profile?.button_style || 'rounded')
  const [hideBranding, setHideBranding] = useState(() => {
    if (profile?.hide_branding !== undefined) return Boolean(profile.hide_branding)
    if (profile?.username && typeof window !== 'undefined') {
      return localStorage.getItem(`linksocio_hide_branding_${profile.username}`) === 'true'
    }
    return false
  })
  const [activeSubTab, setActiveSubTab] = useState('themes')
  const [themeCategory, setThemeCategory] = useState('all')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile?.hide_branding !== undefined) {
      setHideBranding(Boolean(profile.hide_branding))
    }
  }, [profile?.hide_branding])

  async function updateSetting(field, value) {
    if (field === 'theme_preset') {
      setSelectedTheme(value)
      if (profile?.username) localStorage.setItem(`linksocio_theme_preset_${profile.username}`, value)
      if (user?.id) localStorage.setItem(`linksocio_theme_preset_${user.id}`, value)
    }
    if (field === 'font_family') setSelectedFont(value)
    if (field === 'button_style') setSelectedButtonStyle(value)
    if (field === 'hide_branding') {
      setHideBranding(value)
      if (profile?.username) {
        localStorage.setItem(`linksocio_hide_branding_${profile.username}`, String(value))
      }
      if (user?.id) {
        localStorage.setItem(`linksocio_hide_branding_${user.id}`, String(value))
      }
    }

    try {
      await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
    } catch (e) {}

    onUpdated()
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Branding & Avatar Upload */}
      <AvatarUpload user={user} profile={profile} onUpdated={onUpdated} />

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 8, background: '#E2E8F0', padding: 4, borderRadius: 14 }}>
        {[
          { key: 'themes', label: '🎨 Color Themes' },
          { key: 'fonts', label: '🔤 Typography & Fonts' },
          { key: 'buttons', label: '✨ Button & Card Effects' },
          { key: 'branding', label: '🛡️ Watermark & Badge' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13,
              fontWeight: activeSubTab === tab.key ? 600 : 500,
              background: activeSubTab === tab.key ? 'white' : 'transparent',
              color: activeSubTab === tab.key ? '#0F172A' : '#64748B',
              boxShadow: activeSubTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
        {activeSubTab === 'themes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Themes & Visual Styling</p>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                  Choose from high-end photo showcase themes, dark luxury palettes, and glowing gradients.
                </p>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { id: 'all', label: 'All Themes' },
                { id: 'photo', label: '📸 Photo Focus (New)' },
                { id: 'luxury', label: '👑 Luxury & VIP' },
                { id: 'animated', label: '⚡ Animated Glow' },
                { id: 'minimal', label: '✨ Minimal & Clean' },
              ].map((cat) => {
                const isActive = themeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setThemeCategory(cat.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      border: isActive ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                      background: isActive ? '#0F172A' : '#F8FAFC',
                      color: isActive ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {Object.entries(THEMES)
                .filter(([key, theme]) => {
                  if (themeCategory === 'all') return true
                  if (themeCategory === 'photo') return theme.category === 'Photo Focus' || theme.badge?.includes('Photo')
                  if (themeCategory === 'luxury') return theme.category === 'Luxury' || theme.category === 'Photo Focus' || key.includes('gold') || key.includes('monaco') || key.includes('sapphire')
                  if (themeCategory === 'animated') return theme.isAnimated || theme.category === 'Animated Gradient' || key.includes('cyber') || key.includes('aurora') || key.includes('cosmic')
                  if (themeCategory === 'minimal') return theme.category === 'Minimal' || theme.category === 'Pastel'
                  return true
                })
                .map(([key, theme]) => {
                  const isSelected = selectedTheme === key
                  return (
                    <button
                      key={key}
                      onClick={() => updateSetting('theme_preset', key)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 108,
                          borderRadius: 14,
                          background: theme.swatch,
                          border: isSelected ? '3px solid #0F172A' : '1px solid #E7EDEC',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: 10,
                          boxSizing: 'border-box',
                          position: 'relative',
                          boxShadow: isSelected ? '0 6px 18px rgba(15,23,42,0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          {theme.badge ? (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2.5px 7px', borderRadius: 6, background: theme.accent, color: '#fff', letterSpacing: '0.02em' }}>
                              {theme.badge}
                            </span>
                          ) : (
                            <span />
                          )}
                          {isSelected && (
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: '#0F172A',
                                color: 'white',
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Mini realistic avatar & layout preview */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: theme.avatarShape === 'squircle' ? 8 : '50%',
                              background: profile?.avatar_url ? '#FFF' : `linear-gradient(135deg, ${theme.accent}, #0F172A)`,
                              border: theme.avatarBorder || '2px solid white',
                              boxShadow: theme.avatarRing ? '0 0 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.15)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: 10, color: 'white', fontWeight: 800 }}>
                                {profile?.display_name?.[0]?.toUpperCase() || 'P'}
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                            <div style={{ width: '50%', height: 5, borderRadius: 3, background: theme.textColor, opacity: 0.85 }} />
                            <div style={{ width: '90%', height: 12, borderRadius: 5, background: theme.cardBg, border: '1px solid rgba(0,0,0,0.08)' }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: '#0F172A', fontWeight: isSelected ? 700 : 500 }}>{theme.name}</span>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>{theme.category}</span>
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {activeSubTab === 'fonts' && (
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Font Selection</p>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8A97A3' }}>
              Choose the typographic personality that matches your brand and bio.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {Object.entries(FONTS).map(([key, f]) => {
                const isSelected = selectedFont === key
                return (
                  <button
                    key={key}
                    onClick={() => updateSetting('font_family', key)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #14B8A6' : '1px solid #E7EDEC',
                      background: isSelected ? '#F0FDFA' : '#FAFAFA',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                        {f.name}
                      </span>
                      <span style={{ display: 'block', fontSize: 15, color: '#475569', fontFamily: f.fontFamily }}>
                        Aa Bb Cc 123 · رابط البايو
                      </span>
                    </div>
                    {isSelected && (
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#14B8A6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeSubTab === 'buttons' && (
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Button & Link Card Styles</p>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8A97A3' }}>
              Select button geometry, glassmorphism transparency, 3D brutalist shadows, or neon effects.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {Object.entries(BUTTON_STYLES).map(([key, b]) => {
                const isSelected = selectedButtonStyle === key
                return (
                  <button
                    key={key}
                    onClick={() => updateSetting('button_style', key)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #14B8A6' : '1px solid #E7EDEC',
                      background: isSelected ? '#F0FDFA' : '#FAFAFA',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{b.name}</span>
                      {isSelected && (
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#14B8A6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Visual sample button */}
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: b.borderRadius,
                        background: b.effect === 'glass' ? 'rgba(20, 184, 166, 0.12)' : b.effect === 'minimal' ? 'transparent' : '#FFFFFF',
                        border: b.border || '1px solid #E2E8F0',
                        boxShadow: b.boxShadow,
                        backdropFilter: b.backdropFilter,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: '#0F172A',
                      }}
                    >
                      <span>🔥 My Latest Content</span>
                      <span>↗</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeSubTab === 'branding' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>LinkSocio Branding & Watermark</p>
                <p style={{ margin: 0, fontSize: 13, color: '#8A97A3' }}>
                  Control whether the "LinkSocio · Build your audience" badge appears at the bottom of your public page.
                </p>
              </div>
              <span
                style={{
                  background: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 100,
                }}
              >
                PRO FEATURE ⚡
              </span>
            </div>

            {/* Toggle Card */}
            <div
              style={{
                background: '#F8FAFA',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: hideBranding ? '#0F172A' : '#E2E8F0',
                    color: hideBranding ? '#2DD4BF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {hideBranding ? '🛡️' : '🏷️'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    Remove LinkSocio Watermarks & Badges
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                    {hideBranding
                      ? 'All LinkSocio badges (top-left badge and footer watermark) are hidden for a 100% white-label page.'
                      : 'Show the LinkSocio brand badge at the top-left and footer credit watermark.'}
                  </p>
                </div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={hideBranding}
                  onChange={(e) => updateSetting('hide_branding', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: hideBranding ? '#14B8A6' : '#CBD5E1',
                    transition: '.3s',
                    borderRadius: 26,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: 20,
                      width: 20,
                      left: hideBranding ? 24 : 4,
                      bottom: 3,
                      backgroundColor: 'white',
                      transition: '.3s',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Preview comparison note */}
            <div
              style={{
                marginTop: 16,
                padding: '14px 18px',
                borderRadius: 14,
                background: hideBranding ? '#F0FDFA' : '#FAFAFA',
                border: hideBranding ? '1px solid #99F6E4' : '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>{hideBranding ? '✨' : '👀'}</span>
              <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                {hideBranding ? (
                  <span>
                    <strong>White-label Mode Active:</strong> Your visitors will only see your brand, products, and links without any platform footer.
                  </span>
                ) : (
                  <span>
                    <strong>Standard Badge:</strong> Displays "LinkSocio · Build your audience" at the footer. Toggle the switch above to remove it anytime.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {saved && (
          <div style={{ marginTop: 18, padding: '8px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#059669', fontWeight: 600 }}>
            <span>✓</span> Design updated in real-time
          </div>
        )}
      </div>
    </div>
  )
}
