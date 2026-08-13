import { useState } from 'react'
import { supabase } from './supabaseClient'

const COLORS = [
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Coral', value: '#F97362' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Slate', value: '#475569' },
]

export default function ThemeTab({ user, profile, onUpdated }) {
  const [selected, setSelected] = useState(profile?.theme_color || '#14B8A6')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function choose(color) {
    setSelected(color)
    setSaving(true)
    await supabase.from('profiles').update({ theme_color: color }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    onUpdated()
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
      <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Page color</p>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8A97A3' }}>
        Choose the accent color for your public page.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => choose(c.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: c.value,
                border: selected === c.value ? '3px solid #0F172A' : '3px solid transparent',
                boxShadow: selected === c.value ? '0 0 0 2px white, 0 0 0 4px #E7EDEC' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected === c.value && <span style={{ color: 'white', fontSize: 15 }}>✓</span>}
            </span>
            <span style={{ fontSize: 11, color: '#8A97A3' }}>{c.name}</span>
          </button>
        ))}
      </div>

      {saved && (
        <p style={{ marginTop: 16, fontSize: 12.5, color: '#0D9488', fontWeight: 500 }}>✓ Color updated</p>
      )}
    </div>
  )
}
