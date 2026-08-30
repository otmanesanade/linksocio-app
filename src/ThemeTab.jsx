import { useState } from 'react'
import { supabase } from './supabaseClient'
import { THEMES, FONTS, BUTTON_STYLES } from './themes'
import AvatarUpload from './components/AvatarUpload'

export default function ThemeTab({ user, profile, onUpdated }) {
  const [selectedTheme, setSelectedTheme] = useState(profile?.theme_preset || 'default')
  const [selectedFont, setSelectedFont] = useState(profile?.font_family || 'default')
  const [selectedButtonStyle, setSelectedButtonStyle] = useState(profile?.button_style || 'rounded')
  const [activeSubTab, setActiveSubTab] = useState('themes')
  const [saved, setSaved] = useState(false)

  async function updateSetting(field, value) {
    if (field === 'theme_preset') setSelectedTheme(value)
    if (field === 'font_family') setSelectedFont(value)
    if (field === 'button_style') setSelectedButtonStyle(value)

    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Themes & Backgrounds</p>
                <p style={{ margin: 0, fontSize: 13, color: '#8A97A3' }}>
                  Includes dark luxury palettes, minimal cards, and animated glowing gradients.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {Object.entries(THEMES).map(([key, theme]) => {
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
                        height: 100,
                        borderRadius: 14,
                        background: theme.swatch,
                        border: isSelected ? '3px solid #0F172A' : '1px solid #E7EDEC',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: 10,
                        boxSizing: 'border-box',
                        position: 'relative',
                        boxShadow: isSelected ? '0 4px 14px rgba(15,23,42,0.18)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {theme.badge ? (
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: theme.accent, color: '#fff' }}>
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
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      {/* Mini preview elements */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ width: '40%', height: 6, borderRadius: 3, background: theme.textColor, opacity: 0.7 }} />
                        <div style={{ width: '80%', height: 14, borderRadius: 6, background: theme.cardBg, border: '1px solid rgba(0,0,0,0.08)' }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, color: '#0F172A', fontWeight: isSelected ? 600 : 500 }}>{theme.name}</span>
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

        {saved && (
          <div style={{ marginTop: 18, padding: '8px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#059669', fontWeight: 600 }}>
            <span>✓</span> Design updated in real-time
          </div>
        )}
      </div>
    </div>
  )
}
