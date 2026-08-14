import { useState } from 'react'
import { supabase } from './supabaseClient'
import { THEMES } from './themes'

export default function ThemeTab({ user, profile, onUpdated }) {
  const [selected, setSelected] = useState(profile?.theme_preset || 'default')
  const [saved, setSaved] = useState(false)

  async function choose(key) {
    setSelected(key)
    await supabase.from('profiles').update({ theme_preset: key }).eq('id', user.id)
    onUpdated()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
      <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Page theme</p>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8A97A3' }}>
        Pick a look for your public page.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {Object.entries(THEMES).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => choose(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                width: '100%',
                aspectRatio: '0.8',
                borderRadius: 14,
                background: theme.swatch,
                border: selected === key ? '3px solid #0F172A' : '1px solid #E7EDEC',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: 8,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {selected === key && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#0F172A',
                    color: 'white',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✓
                </span>
              )}
              <span
                style={{
                  width: '70%',
                  height: 12,
                  borderRadius: 8,
                  background: theme.cardBg,
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              />
            </span>
            <span style={{ fontSize: 11.5, color: '#0F172A', fontWeight: 500 }}>{theme.name}</span>
          </button>
        ))}
      </div>

      {saved && <p style={{ marginTop: 18, fontSize: 12.5, color: '#0D9488', fontWeight: 500 }}>✓ Theme updated</p>}
    </div>
  )
}
