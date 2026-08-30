import React from 'react'

export default function Analytics({ links = [] }) {
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0)
  const maxClicks = Math.max(1, ...links.map((l) => l.clicks || 0))
  const sorted = [...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
  const activeCount = links.filter((l) => l.active !== false).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={{ background: '#0F172A', borderRadius: 20, padding: '20px 18px', textAlign: 'center', color: 'white' }}>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#2DD4BF' }}>{totalClicks}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Total Link Clicks</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '20px 18px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#0F172A' }}>{activeCount}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B', fontWeight: 500 }}>Active Links</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '20px 18px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#F59E0B' }}>
            {sorted[0]?.clicks || 0}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B', fontWeight: 500 }}>Top Performer</p>
        </div>
      </div>

      {/* Clicks breakdown */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#0F172A' }}>Click Performance by Link</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8A97A3' }}>Real-time traffic breakdown across your channels</p>
          </div>
          <span style={{ fontSize: 11.5, background: '#F1F5F9', padding: '4px 10px', borderRadius: 8, color: '#475569', fontWeight: 600 }}>
            Ranked by visits
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((link, idx) => {
            const percentage = Math.round(((link.clicks || 0) / maxClicks) * 100)
            return (
              <div key={link.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? '#14B8A6' : '#94A3B8', width: 16 }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{link.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11.5, color: '#64748B' }}>{percentage}%</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0D9488' }}>
                      {link.clicks || 0} <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>clicks</span>
                    </span>
                  </div>
                </div>
                <div style={{ background: '#F1F5F9', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${percentage}%`,
                      background: idx === 0 ? 'linear-gradient(90deg, #14B8A6, #2DD4BF)' : '#14B8A6',
                      height: '100%',
                      borderRadius: 8,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <p style={{ textAlign: 'center', color: '#8A97A3', fontSize: 13, padding: '24px 0' }}>
              No click data yet. Share your LinkSocio page to start tracking visits.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
