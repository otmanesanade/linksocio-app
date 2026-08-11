import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Analytics({ user, goBack }) {
  const [links, setLinks] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('clicks', { ascending: false })
    setLinks(data || [])
  }

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0)
  const maxClicks = Math.max(1, ...links.map((l) => l.clicks || 0))

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#F8FAFA',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        padding: '32px 16px 64px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={goBack}
            style={{
              background: 'none',
              border: '1px solid #E7EDEC',
              borderRadius: 10,
              padding: '7px 11px',
              fontSize: 14,
              color: '#0F172A',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: 0 }}>Analytics</h1>
        </div>

        {/* Total clicks */}
        <div
          style={{
            background: '#0F172A',
            borderRadius: 20,
            padding: '24px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: 'white' }}>{totalClicks}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8A97A3' }}>total clicks across all links</p>
        </div>

        {/* Per-link breakdown */}
        <div
          style={{
            background: 'white',
            border: '1px solid #E7EDEC',
            borderRadius: 20,
            padding: 20,
          }}
        >
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Clicks per link</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {links.map((link) => (
              <div key={link.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{link.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0D9488' }}>{link.clicks || 0}</span>
                </div>
                <div style={{ background: '#F1F2F4', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${((link.clicks || 0) / maxClicks) * 100}%`,
                      background: '#14B8A6',
                      height: '100%',
                      borderRadius: 8,
                    }}
                  />
                </div>
              </div>
            ))}
            {links.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8A97A3', fontSize: 13 }}>No links yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
