import { useState } from 'react'
import confetti from 'canvas-confetti'
import { downloadVCard } from '../utils/walletPass'
import WalletPassModal from './WalletPassModal'

export default function QrTab({ profile, qrUrl, downloadQr }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const fullUrl = `${currentOrigin}/${profile?.username || ''}`

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(true)
    try {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } })
    } catch (e) {}
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function handleDownloadVCard() {
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } })
    } catch (e) {}
    downloadVCard(profile, profile?.whatsapp_number || '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Official Digital Wallet Pass Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 24,
          padding: '24px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px -10px rgba(15,23,42,0.3)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 100, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}> 💳</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, color: '#2DD4BF' }}>
              APPLE & GOOGLE WALLET PASS
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>
            Smart Digital Business Card
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94A3B8', maxWidth: 480, lineHeight: 1.5 }}>
            Allow your followers and clients to add your profile, contact details, and QR code directly into their <strong>Apple Wallet</strong> and <strong>Google Wallet</strong> apps.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: 'none',
                borderRadius: 12,
                padding: '11px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(255,255,255,0.15)',
              }}
            >
              <span>💳</span>
              <span>Preview & Export Wallet Pass</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadVCard}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '11px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📇</span>
              <span>Download .VCF Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Official QR Code Card Section */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E7EDEC',
          borderRadius: 20,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E6F7F5', padding: '4px 12px', borderRadius: 100, marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>🔲</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488' }}>HIGH RESOLUTION QR CODE</span>
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
            Print & Shareable QR Code
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
            Print this high-resolution QR code on stickers, restaurant menus, packaging bags, business cards, or storefront posters.
          </p>
        </div>

        {/* QR Code Card Display */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
            border: '2px solid #E2E8F0',
            borderRadius: 24,
            padding: '32px 24px',
            position: 'relative',
          }}
        >
          {qrUrl ? (
            <div
              style={{
                background: 'white',
                padding: 16,
                borderRadius: 20,
                boxShadow: '0 12px 30px -8px rgba(15,23,42,0.15)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src={qrUrl}
                alt={`QR Code for ${profile?.username}`}
                style={{ width: 220, height: 220, display: 'block', borderRadius: 8 }}
              />
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  @{profile?.username}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>
                  linksocio.com/{profile?.username}
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                background: '#E2E8F0',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                fontSize: 13,
              }}
            >
              Generating QR Code...
            </div>
          )}

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={downloadQr}
              disabled={!qrUrl}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                padding: '12px 24px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: qrUrl ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(15,23,42,0.18)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📥</span>
              <span>Download PNG QR Code</span>
            </button>

            <button
              onClick={handleCopy}
              style={{
                background: copiedLink ? '#E6F7F5' : 'white',
                color: copiedLink ? '#0D9488' : '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: 14,
                padding: '12px 20px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{copiedLink ? '✓ Copied' : '📋 Copy Profile Link'}</span>
            </button>
          </div>
        </div>

        {/* Tips list */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            💡 Best Practices for QR Codes:
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#64748B', lineHeight: 1.6 }}>
            <li>Print with high contrast (dark on white) for instant scanning on any phone camera.</li>
            <li>Ideal size for packaging & business cards: at least 3cm × 3cm (1.2 in).</li>
            <li>Your QR code never expires — update your links anytime and it always points to your newest offers!</li>
          </ul>
        </div>
      </div>

      {/* Wallet Pass Modal */}
      {showWalletModal && (
        <WalletPassModal
          profile={profile}
          qrUrl={qrUrl}
          whatsappPhone={profile?.whatsapp_number || ''}
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </div>
  )
}
