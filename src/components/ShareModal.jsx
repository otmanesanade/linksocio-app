import { useState } from 'react'
import confetti from 'canvas-confetti'
import { getSocialIcon } from './LivePagePreview'

export default function ShareModal({ profile, isOpen, onClose, onOpenQr }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const username = profile?.username || ''
  const pageUrl = `${origin}/${username}`
  const displayName = profile?.display_name || profile?.username || 'Creator'
  const shareText = `Check out ${displayName}'s page, links, and products on LinkSocio!`

  function handleCopy() {
    navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    try {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } })
    } catch (e) {}
    setTimeout(() => setCopied(false), 2200)
  }

  const shareTargets = [
    {
      name: 'WhatsApp',
      color: '#25D366',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} 👉 ${pageUrl}`)}`,
    },
    {
      name: 'X (Twitter)',
      color: '#000000',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: 'Facebook',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: 'LinkedIn',
      color: '#0A66C2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: 'Email',
      color: '#475569',
      url: `mailto:?subject=${encodeURIComponent(`${displayName}'s Profile on LinkSocio`)}&body=${encodeURIComponent(`${shareText}\n\n${pageUrl}`)}`,
    },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          maxWidth: 380,
          width: '100%',
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          textAlign: 'center',
          position: 'relative',
          animation: 'shareModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#F1F5F9',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Profile Avatar Badge */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: profile?.avatar_url
              ? '#F1F5F9'
              : `linear-gradient(135deg, ${profile?.theme_color || '#14B8A6'}, #0F172A)`,
            margin: '0 auto 10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            border: '3px solid white',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            displayName[0]?.toUpperCase() || '?'
          )}
        </div>

        <h3 style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
          Share this Profile
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#64748B' }}>
          @{username} • linksocio.com/{username}
        </p>

        {/* Quick Copy Link Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '4px 6px 4px 12px',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 12,
              color: '#334155',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              fontFamily: 'monospace',
            }}
          >
            {pageUrl}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#10B981' : '#0F172A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '7px 14px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Social Share Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 18 }}>
          {shareTargets.map((target) => (
            <a
              key={target.name}
              href={target.url}
              target="_blank"
              rel="noreferrer"
              title={`Share on ${target.name}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: target.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {getSocialIcon(target.name, '#FFFFFF', 20)}
              </div>
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{target.name.split(' ')[0]}</span>
            </a>
          ))}
        </div>

        {/* View QR Code Button */}
        {onOpenQr && (
          <button
            onClick={() => {
              onClose()
              onOpenQr()
            }}
            style={{
              width: '100%',
              background: '#F1F5F9',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '10px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <span>🔲</span>
            <span>Show QR Code & Scan</span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes shareModalPop {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
