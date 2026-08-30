import { useState } from 'react'
import confetti from 'canvas-confetti'
import { downloadVCard } from '../utils/walletPass'

export default function WalletPassModal({ profile, qrUrl, whatsappPhone = '', onClose }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [showAppleGuide, setShowAppleGuide] = useState(false)
  const [showGoogleGuide, setShowGoogleGuide] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const fullUrl = `${origin}/${profile?.username || ''}`

  function handleSaveContact() {
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
    } catch (e) {}
    downloadVCard(profile, whatsappPhone)
  }

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.8)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          padding: '24px 20px',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #0F172A, #334155)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              margin: '0 auto 10px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.2)',
            }}
          >
            💳
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
            Digital Wallet & Contact Card
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
            Add @{profile?.username} to Apple Wallet, Google Wallet & Phone Contacts
          </p>
        </div>

        {/* Mini Preview Pass Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            borderRadius: 18,
            padding: '16px',
            color: 'white',
            marginBottom: 20,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 25px -5px rgba(15,23,42,0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#14B8A6' }}>LINKSOCIO PASS</span>
            </div>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 100 }}>
              VERIFIED
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {qrUrl ? (
              <div style={{ background: 'white', padding: 6, borderRadius: 10, flexShrink: 0 }}>
                <img src={qrUrl} alt="QR" style={{ width: 68, height: 68, display: 'block', borderRadius: 4 }} />
              </div>
            ) : null}

            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.display_name || profile?.username || 'Creator'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>
                @{profile?.username}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#14B8A6', wordBreak: 'break-all' }}>
                linksocio.com/{profile?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Apple & Google Wallet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 1. Apple Wallet Card */}
          <button
            onClick={() => {
              handleSaveContact()
              setShowAppleGuide(true)
            }}
            style={{
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 14,
              padding: '12px 16px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              transition: 'transform 0.1s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Add to Apple Wallet & Contacts</div>
                <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 500 }}>Save smart card on iPhone / iOS</div>
              </div>
            </div>
            <span style={{ fontSize: 14 }}>📥</span>
          </button>

          {/* 2. Google Wallet / Android */}
          <button
            onClick={() => {
              handleSaveContact()
              setShowGoogleGuide(true)
            }}
            style={{
              background: '#FFFFFF',
              color: '#1F2937',
              border: '1.5px solid #E5E7EB',
              borderRadius: 14,
              padding: '12px 16px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>💳</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Save to Google Wallet & Contacts</div>
                <div style={{ fontSize: 10.5, color: '#6B7280', fontWeight: 500 }}>For Android & Google Contacts</div>
              </div>
            </div>
            <span style={{ fontSize: 14 }}>📥</span>
          </button>

          {/* 3. Direct Contact Card File (.vcf) */}
          <button
            onClick={handleSaveContact}
            style={{
              background: '#F0FDFA',
              color: '#0D9488',
              border: '1px solid #99F6E4',
              borderRadius: 14,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>📇</span>
            <span>Download .vcf Business Card</span>
          </button>
        </div>

        {/* Apple Wallet Instructions tip */}
        {showAppleGuide && (
          <div style={{ marginTop: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
            <strong> iPhone Tip:</strong> After downloading, tap the file in your Safari / Downloads to instantly create a Contact with direct LinkSocio and WhatsApp links!
          </div>
        )}

        {showGoogleGuide && (
          <div style={{ marginTop: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
            <strong>💳 Android Tip:</strong> Open the downloaded contact file to sync directly to your Google Account contacts.
          </div>
        )}

        {/* Copy Link fallback */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Quick profile link:</span>
          <button
            onClick={handleCopy}
            style={{
              background: copiedLink ? '#E6F7F5' : '#F1F5F9',
              color: copiedLink ? '#0D9488' : '#334155',
              border: 'none',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copiedLink ? '✓ Copied' : '📋 Copy URL'}
          </button>
        </div>
      </div>
    </div>
  )
}
