import { useState } from 'react'
import confetti from 'canvas-confetti'
import { downloadVCard } from '../utils/walletPass'
import { openWalletDirect } from '../utils/passGenerator'

export default function WalletPassModal({ profile, qrUrl, whatsappPhone = '', onClose }) {
  const [activeTab, setActiveTab] = useState('apple') // 'apple' | 'google' | 'card'
  const [copiedLink, setCopiedLink] = useState(false)
  const [downloading, setDownloading] = useState(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const fullUrl = `${origin}/${profile?.username || ''}`
  const name = profile?.display_name || profile?.username || 'Creator'

  function triggerDirectAppleWallet() {
    setDownloading('apple')
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } })
    } catch (e) {}
    openWalletDirect('apple', profile, qrUrl)
    setTimeout(() => setDownloading(null), 1200)
  }

  function triggerDirectGoogleWallet() {
    setDownloading('google')
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } })
    } catch (e) {}
    openWalletDirect('google', profile, qrUrl)
    setTimeout(() => setDownloading(null), 1200)
  }

  function handleSaveContact() {
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } })
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
        background: 'rgba(15,23,42,0.85)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          padding: '24px 20px',
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          position: 'relative',
          maxHeight: '92vh',
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

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>💳</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
            Direct Wallet Pass
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
            Add @{profile?.username} directly to your phone’s Wallet
          </p>
        </div>

        {/* Live Wallet Card Mockup */}
        <div
          style={{
            background: activeTab === 'apple' 
              ? 'linear-gradient(145deg, #18181B 0%, #09090B 100%)' 
              : 'linear-gradient(145deg, #1E3A8A 0%, #172554 100%)',
            borderRadius: 20,
            padding: 18,
            color: 'white',
            marginBottom: 18,
            boxShadow: '0 12px 30px -8px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.12)',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Card Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>{activeTab === 'apple' ? '' : '💳'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#38BDF8' }}>
                {activeTab === 'apple' ? 'APPLE WALLET PASS' : 'GOOGLE WALLET PASS'}
              </span>
            </div>
            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 100 }}>
              VERIFIED
            </span>
          </div>

          {/* Card Content & QR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            {qrUrl && (
              <div style={{ background: 'white', padding: 6, borderRadius: 12, flexShrink: 0 }}>
                <img src={qrUrl} alt="QR Code" style={{ width: 74, height: 74, display: 'block', borderRadius: 4 }} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                CREATOR / BUSINESS
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
              </div>
              <div style={{ fontSize: 12, color: '#38BDF8', fontWeight: 600 }}>
                @{profile?.username}
              </div>
              <div style={{ fontSize: 10.5, color: '#CBD5E1', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                linksocio.com/{profile?.username}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#94A3B8' }}>
            <span>TAP TO SCAN & CONNECT</span>
            <span style={{ color: '#F8FAFC' }}>LinkSocio Verified</span>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 1. Direct Apple Wallet */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('apple')
              triggerDirectAppleWallet()
            }}
            style={{
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 14,
              padding: '13px 18px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {downloading === 'apple' ? 'Opening in Wallet...' : 'Add to Apple Wallet'}
                </div>
                <div style={{ fontSize: 10.5, color: '#94A3B8' }}>Opens directly on iPhone & Apple Watch</div>
              </div>
            </div>
            <span style={{ fontSize: 14 }}>➔</span>
          </button>

          {/* 2. Direct Google Wallet */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('google')
              triggerDirectGoogleWallet()
            }}
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              border: '2px solid #E2E8F0',
              borderRadius: 14,
              padding: '12px 18px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>💳</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {downloading === 'google' ? 'Connecting to Google...' : 'Add to Google Wallet'}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B' }}>Direct link for Android phones</div>
              </div>
            </div>
            <span style={{ fontSize: 14 }}>➔</span>
          </button>

          {/* 3. Direct Contact File */}
          <button
            type="button"
            onClick={handleSaveContact}
            style={{
              background: '#F0FDFA',
              color: '#0D9488',
              border: '1px solid #99F6E4',
              borderRadius: 14,
              padding: '11px 16px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>📇</span>
            <span>Save to Phone Contacts (vCard)</span>
          </button>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Link: /{profile?.username}</span>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: copiedLink ? '#E6F7F5' : '#F1F5F9',
              color: copiedLink ? '#0D9488' : '#334155',
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copiedLink ? '✓ Copied' : '📋 Copy Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
