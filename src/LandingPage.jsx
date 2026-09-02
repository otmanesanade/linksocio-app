import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { THEMES, FONTS, BUTTON_STYLES } from './themes'

// Social SVG Icons
const SocialIcon = ({ name, color = '#14B8A6', size = 18 }) => {
  const n = name.toLowerCase()
  if (n.includes('instagram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    )
  }
  if (n.includes('whatsapp')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    )
  }
  if (n.includes('tiktok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    )
  }
  if (n.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill={color} />
      </svg>
    )
  }
  if (n.includes('store') || n.includes('shop') || n.includes('digital')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// Preset creators for interactive preview showcase
const SHOWCASE_PROFILES = [
  {
    key: 'digital_creator',
    name: 'Otman Digital',
    handle: 'otman',
    bio: 'Digital Products & Online Masterclasses 🌍 Ebooks, Presets & 1-on-1 Mentorship',
    theme: 'midnight',
    font: 'outfit',
    buttonStyle: 'rounded',
    avatarLetter: 'O',
    links: [
      { id: 1, label: '💬 Direct WhatsApp VIP Support', url: 'https://wa.me/212600000000', icon: 'whatsapp', clicks: 2450 },
      { id: 2, label: '🗓️ Book 1-on-1 Strategy Call', url: 'https://example.com', icon: 'store', clicks: 1890 },
      { id: 3, label: '📷 Instagram Daily Tips', url: 'https://instagram.com', icon: 'instagram', clicks: 3100 },
    ],
    products: [
      { id: 1, name: 'Digital Creator Masterclass 2026', price: '$29.00', category: 'course', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&q=80' },
      { id: 2, name: 'Pro Lightroom Preset Pack (50+)', price: '$14.99', category: 'file', image: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=300&q=80' },
    ],
  },
  {
    key: 'restaurant',
    name: 'Le Bistro & Cafe',
    handle: 'lebistro',
    bio: 'Artisan Coffee, Gourmet Brunches & Table Reservations ☕🍽️',
    theme: 'gold',
    font: 'luxury',
    buttonStyle: 'shadow',
    avatarLetter: 'B',
    links: [
      { id: 1, label: '🍽️ Explore Interactive Food Menu', url: 'https://example.com', icon: 'store', clicks: 3200 },
      { id: 2, label: '🗓️ Reserve a Dinner Table', url: 'https://example.com', icon: 'store', clicks: 2100 },
      { id: 3, label: '💬 WhatsApp Table Inquiries', url: 'https://wa.me/212600000000', icon: 'whatsapp', clicks: 1750 },
    ],
    products: [
      { id: 1, name: 'Tasting Menu Voucher', price: '$45.00', category: 'voucher', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&q=80' },
      { id: 2, name: 'Signature Roasted Coffee Beans', price: '$18.00', category: 'physical', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&q=80' },
    ],
  },
  {
    key: 'agency',
    name: 'Nexus Studio',
    handle: 'nexus',
    bio: 'Web Design, Media Scaling & Direct Appointments 🚀',
    theme: 'aurora',
    font: 'playfair',
    buttonStyle: 'glass',
    avatarLetter: 'N',
    links: [
      { id: 1, label: '🗓️ Book 30-min Consultation', url: 'https://example.com', icon: 'store', clicks: 1420 },
      { id: 2, label: '💬 Instant WhatsApp Lead Message', url: 'https://wa.me/212600000000', icon: 'whatsapp', clicks: 980 },
      { id: 3, label: '📁 Agency Portfolio & Case Studies', url: 'https://example.com', icon: 'store', clicks: 650 },
    ],
    products: [
      { id: 1, name: 'Brand Identity Template Kit', price: '$49.00', category: 'template', image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=300&q=80' },
      { id: 2, name: 'UI/UX Component Pack', price: '$29.00', category: 'file', image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=300&q=80' },
    ],
  },
]

export default function LandingPage({ goToLogin, goToSignUp, goTo }) {
  const [claimHandle, setClaimHandle] = useState('')
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('shop')
  const [customTheme, setCustomTheme] = useState('midnight')
  const [faqOpen, setFaqOpen] = useState([0, 1])
  const [savedVcard, setSavedVcard] = useState(false)
  const [selectedProductCheckout, setSelectedProductCheckout] = useState(null)

  const currentProfile = SHOWCASE_PROFILES[selectedProfileIndex]
  const currentThemeObj = THEMES[customTheme] || THEMES.midnight
  const currentFontObj = FONTS[currentProfile.font] || FONTS.default
  const currentBtnStyle = BUTTON_STYLES[currentProfile.buttonStyle] || BUTTON_STYLES.rounded

  function handleClaimSubmit(e) {
    if (e) e.preventDefault()
    const clean = claimHandle.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '')
    if (clean) {
      sessionStorage.setItem('linksocio_claim_user', clean)
    }
    goToSignUp()
  }

  function toggleFaq(index) {
    if (faqOpen.includes(index)) {
      setFaqOpen(faqOpen.filter((i) => i !== index))
    } else {
      setFaqOpen([...faqOpen, index])
    }
  }

  function triggerVcardSimulation() {
    setSavedVcard(true)
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
    } catch (err) {}
    setTimeout(() => setSavedVcard(false), 2000)
  }

  function triggerTestCheckout(prod) {
    setSelectedProductCheckout(prod)
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } })
    } catch (err) {}
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFA',
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* 1. TOP STICKY NAVBAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(248, 250, 250, 0.94)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(231, 237, 236, 0.8)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
                animation: 'pulseGlow 3s infinite ease-in-out',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 46 46">
                <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
                <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#FFFFFF" strokeWidth="6" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>
                <span style={{ color: '#0F172A' }}>Link</span>
                <span style={{ color: '#14B8A6' }}>Socio</span>
              </span>
              <span style={{ display: 'block', fontSize: 10, color: '#8A97A3', fontWeight: 600, marginTop: -3, letterSpacing: '0.04em' }}>
                BIO LINK & DIGITAL COMMERCE
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="desktop-nav" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
            <a href="#digital-store" style={navLinkStyle}>Digital Store & Payouts</a>
            <a href="#features" style={navLinkStyle}>All Features</a>
            <a href="#demo" style={navLinkStyle}>Live Simulator</a>
            <a href="#pricing" style={navLinkStyle}>Pricing ($)</a>
            <a href="#faq" style={navLinkStyle}>FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={goToLogin}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
                padding: '8px 12px',
              }}
            >
              Log in
            </button>
            <button
              onClick={goToSignUp}
              style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
              className="btn-scale"
            >
              <span>Start 14-Days Free</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION WITH INTEGRATED INTERACTIVE PHONE SIMULATOR & FLOATING BADGES */}
      <section
        style={{
          position: 'relative',
          padding: '60px 20px 80px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Animated Gradient Background Orbs */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '20%',
            width: 500,
            height: 400,
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, rgba(248, 250, 250, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none',
            animation: 'floatingOrb 8s infinite alternate ease-in-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 140,
            right: '15%',
            width: 450,
            height: 400,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(248, 250, 250, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none',
            animation: 'floatingOrb 10s infinite alternate-reverse ease-in-out',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
            gap: 44,
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Value Prop & Handle Claim Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Release pill with 14-day free trial banner */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #E6F7F5 0%, #CCFBF1 100%)',
                border: '1px solid #99F6E4',
                borderRadius: 100,
                padding: '7px 16px',
                width: 'fit-content',
                boxShadow: '0 2px 8px rgba(20,184,166,0.12)',
              }}
            >
              <span style={{ fontSize: 14, animation: 'bounce 2s infinite' }}>🎁</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F766E' }}>
                14-Days Free Trial · Sell Digital Products & Collect Leads
              </span>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(34px, 4.4vw, 54px)',
                fontWeight: 800,
                lineHeight: 1.12,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Sell Digital Products, Take Bookings & Monetize in{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 50%, #6366F1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                One Link.
              </span>
            </h1>

            {/* Sub-headline */}
            <p
              style={{
                fontSize: 16.5,
                color: '#475569',
                lineHeight: 1.6,
                maxWidth: 540,
                margin: 0,
              }}
            >
              Turn your Instagram, TikTok, and social bio into an <strong>all-in-one hub</strong>. Sell ebooks, files & courses with automated delivery, take appointments, showcase restaurant menus, and capture direct WhatsApp leads with <strong>instant 91% creator revenue</strong>.
            </p>

            {/* Claim your handle input box */}
            <div
              style={{
                background: 'white',
                border: '2px solid #14B8A6',
                borderRadius: 20,
                padding: '8px 8px 8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 12px 32px -8px rgba(20,184,166,0.2)',
                maxWidth: 500,
                marginTop: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#14B8A6' }}>linksocio.com/</span>
                <input
                  type="text"
                  placeholder="yourname"
                  value={claimHandle}
                  onChange={(e) => setClaimHandle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClaimSubmit(e)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#0F172A',
                    width: '100%',
                    background: 'transparent',
                  }}
                />
              </div>
              <button
                onClick={handleClaimSubmit}
                style={{
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '13px 22px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(20, 184, 166, 0.4)',
                  transition: 'all 0.15s ease',
                }}
                className="btn-scale"
              >
                Claim Link (14-Day Free) →
              </button>
            </div>

            {/* Quick Benefits Checklist */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#14B8A6' }}>✓</span> 14-Days Free Trial
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#14B8A6' }}>✓</span> 91% Net Payout Split
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#14B8A6' }}>✓</span> Calendar Bookings & Leads
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#14B8A6' }}>✓</span> Restaurant Digital Menu
              </span>
            </div>

            {/* Trust & Social Proof stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', marginLeft: 8 }}>
                {['#14B8A6', '#0F172A', '#3B82F6', '#EC4899', '#EAB308'].map((bg, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: bg,
                      border: '2px solid white',
                      marginLeft: -8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {['O', 'S', 'M', 'K', 'Y'][idx]}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#F59E0B', fontSize: 14 }}>★★★★★</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>4.9/5 Rating (Active Creators & Businesses)</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                  Complete ecosystem for links, products, appointments & WhatsApp leads
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Device Phone Simulator with floating badges */}
          <div id="demo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {/* Floating Live Badge 1: 91% Split */}
            <div
              style={{
                position: 'absolute',
                top: 30,
                left: -35,
                background: 'white',
                border: '1px solid #CCFBF1',
                borderRadius: 16,
                padding: '8px 14px',
                boxShadow: '0 10px 25px -5px rgba(20,184,166,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                zIndex: 30,
                animation: 'floatBadge 4s infinite ease-in-out',
              }}
              className="desktop-only"
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#14B8A6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                💰
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0F766E' }}>INSTANT 91% PAYOUT</div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>+$26.39 Net Earned</div>
              </div>
            </div>

            {/* Floating Live Badge 2: Global Checkout */}
            <div
              style={{
                position: 'absolute',
                bottom: 80,
                right: -30,
                background: '#0F172A',
                color: 'white',
                borderRadius: 16,
                padding: '8px 14px',
                boxShadow: '0 10px 25px -5px rgba(15,23,42,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                zIndex: 30,
                animation: 'floatBadge 4.5s infinite alternate ease-in-out',
              }}
              className="desktop-only"
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#635BFF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                💳
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>CHECKOUT & WALLET</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF' }}>Card & PayPal Ready</div>
              </div>
            </div>

            {/* Quick Profile Preset Switcher */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: 4,
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              {SHOWCASE_PROFILES.map((p, idx) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setSelectedProfileIndex(idx)
                    setCustomTheme(p.theme)
                  }}
                  style={{
                    background: selectedProfileIndex === idx ? '#0F172A' : 'transparent',
                    color: selectedProfileIndex === idx ? 'white' : '#64748B',
                    border: 'none',
                    borderRadius: 10,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Phone Mockup Frame */}
            <div
              style={{
                width: 320,
                background: '#0F172A',
                borderRadius: 44,
                padding: '12px 10px',
                boxShadow: '0 25px 50px -12px rgba(15,23,42,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
                position: 'relative',
              }}
            >
              {/* Dynamic Island / Notch */}
              <div
                style={{
                  width: 80,
                  height: 18,
                  background: '#0F172A',
                  borderRadius: 100,
                  position: 'absolute',
                  top: 18,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                }}
              />

              {/* Inside Screen Container */}
              <div
                style={{
                  borderRadius: 34,
                  overflow: 'hidden',
                  ...(currentThemeObj.pageBg?.startsWith('linear-gradient')
                    ? {
                        backgroundImage: currentThemeObj.pageBg,
                        backgroundSize: 'cover',
                      }
                    : {
                        backgroundColor: currentThemeObj.pageBg || '#F8FAFA',
                      }),
                  color: currentThemeObj.textColor,
                  fontFamily: currentFontObj.fontFamily,
                  minHeight: 520,
                  padding: '36px 16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* Avatar Initial */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${currentThemeObj.accent}, #0F172A)`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 800,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {currentProfile.avatarLetter}
                </div>

                <p style={{ margin: '10px 0 2px', fontSize: 16, fontWeight: 800, color: currentThemeObj.textColor }}>
                  {currentProfile.name}
                </p>
                <p style={{ margin: 0, fontSize: 11.5, color: currentThemeObj.subTextColor, textAlign: 'center', lineHeight: 1.4, maxWidth: 220 }}>
                  {currentProfile.bio}
                </p>

                {/* Direct WhatsApp Quick Pill */}
                <a
                  href={currentProfile.links[0]?.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginTop: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#25D366',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <SocialIcon name="whatsapp" color="white" size={13} />
                  <span>Chat on WhatsApp</span>
                </a>

                {/* Tab Switcher (Store vs Links) */}
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 12,
                    padding: 3,
                    marginTop: 12,
                    marginBottom: 10,
                  }}
                >
                  <button
                    onClick={() => setActiveTab('shop')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 9,
                      border: 'none',
                      background: activeTab === 'shop' ? 'rgba(255,255,255,0.95)' : 'transparent',
                      color: activeTab === 'shop' ? '#0F172A' : currentThemeObj.subTextColor,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    🛍️ Store ({currentProfile.products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('links')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 9,
                      border: 'none',
                      background: activeTab === 'links' ? 'rgba(255,255,255,0.95)' : 'transparent',
                      color: activeTab === 'links' ? '#0F172A' : currentThemeObj.subTextColor,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    🔗 Links ({currentProfile.links.length})
                  </button>
                </div>

                {/* Tab Content: Store Products */}
                {activeTab === 'shop' && (
                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {currentProfile.products.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => triggerTestCheckout(p)}
                        style={{
                          background: currentThemeObj.cardBg || 'white',
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        }}
                      >
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: 75, objectFit: 'cover' }} />
                        <div style={{ padding: '8px 6px' }}>
                          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: currentThemeObj.textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: currentThemeObj.accent }}>
                              {p.price}
                            </span>
                            <span style={{ background: '#10B981', color: 'white', fontSize: 8.5, fontWeight: 800, padding: '2px 5px', borderRadius: 4 }}>
                              Buy ⚡
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab Content: Links List */}
                {activeTab === 'links' && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {currentProfile.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: currentThemeObj.cardBg || 'white',
                          color: currentThemeObj.textColor,
                          border: currentBtnStyle.border || '1px solid rgba(0,0,0,0.06)',
                          borderRadius: currentBtnStyle.borderRadius || 14,
                          boxShadow: currentBtnStyle.boxShadow || '0 2px 8px rgba(0,0,0,0.03)',
                          backdropFilter: currentThemeObj.backdrop,
                          padding: '10px 12px',
                          textDecoration: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'rgba(20, 184, 166, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <SocialIcon name={link.icon} color={currentThemeObj.accent} size={15} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {link.label}
                        </span>
                        <span style={{ fontSize: 11, color: currentThemeObj.subTextColor }}>↗</span>
                      </a>
                    ))}

                    {/* Interactive Save Contact Button */}
                    <button
                      onClick={triggerVcardSimulation}
                      style={{
                        marginTop: 4,
                        width: '100%',
                        background: savedVcard ? '#22C55E' : 'rgba(255,255,255,0.15)',
                        border: '1px dashed currentColor',
                        borderRadius: 12,
                        padding: '8px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: currentThemeObj.textColor,
                        cursor: 'pointer',
                      }}
                    >
                      {savedVcard ? '✓ vCard Saved to Contacts!' : '📇 Click to Test vCard Download'}
                    </button>
                  </div>
                )}

                {/* Mini Checkout Success Modal Demo Inside Phone */}
                {selectedProductCheckout && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 12,
                      background: 'rgba(15,23,42,0.92)',
                      borderRadius: 24,
                      padding: 16,
                      color: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      zIndex: 40,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>🎉</span>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 6 }}>
                      Instant 91% Digital Sale!
                    </div>
                    <p style={{ margin: '4px 0 10px', fontSize: 11, color: '#94A3B8' }}>
                      {selectedProductCheckout.name} ({selectedProductCheckout.price})
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', width: '100%', boxSizing: 'border-box', fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2DD4BF', fontWeight: 800 }}>
                        <span>Your 91% Net:</span>
                        <span>Direct to Wallet</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', marginTop: 2 }}>
                        <span>Platform fee:</span>
                        <span>9%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProductCheckout(null)}
                      style={{
                        marginTop: 12,
                        background: '#14B8A6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Close Demo Preview
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                  <span style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.04em' }}>POWERED BY LINKSOCIO</span>
                </div>
              </div>
            </div>

            {/* Quick Theme Switch Bar under Mockup */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>TEST THEMES:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'midnight', label: 'Dark', color: '#111827' },
                  { key: 'aurora', label: 'Aurora', color: '#7C3AED' },
                  { key: 'gold', label: 'Luxury Gold', color: '#EAB308' },
                  { key: 'default', label: 'Teal', color: '#14B8A6' },
                  { key: 'cyberpunk', label: 'Neon', color: '#EC4899' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setCustomTheme(t.key)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: t.color,
                      border: customTheme === t.key ? '2px solid #0F172A' : '2px solid white',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                    title={t.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DIGITAL STORE & 9% SPLIT HIGHLIGHT SECTION */}
      <section id="digital-store" style={{ background: 'linear-gradient(135deg, #090D16 0%, #172033 100%)', color: 'white', padding: '90px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 50px' }}>
            <span style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#2DD4BF', border: '1px solid rgba(20, 184, 166, 0.4)', fontSize: 12, fontWeight: 800, padding: '4px 14px', borderRadius: 100 }}>
              🌍 DIGITAL STORE & AUTOMATED SALES
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '14px 0 8px', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Sell Ebooks, Courses & Files with 91% Net Payouts
            </h2>
            <p style={{ fontSize: 16, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
              Upload your digital files, set your price in $, and let buyers purchase with card or PayPal. Instant file download for buyers, 91% net payout for you.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {/* Feature 1: Instant File Delivery */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '30px 24px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(20, 184, 166, 0.2)', color: '#2DD4BF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>
                ⚡
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Instant Automated File Delivery</h3>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Customers get immediate access to download their PDF guides, courses, or preset files the exact moment their purchase completes.
              </p>
            </div>

            {/* Feature 2: 91% / 9% Automated Split */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '30px 24px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99, 102, 241, 0.2)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>
                💰
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Fair 91% Creator Net Split</h3>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                You keep <strong>91% of every product sale</strong>. The platform retains only 9% for automated hosting, file security, and processing.
              </p>
            </div>

            {/* Feature 3: Creator Wallet & Withdrawals */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '30px 24px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>
                💼
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Dedicated Wallet & Payouts</h3>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Track your net earnings, sales breakdown, and request payouts straight from your built-in <strong>Wallet & 9% Fees</strong> dashboard tab.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES (ONLY FEATURES PRESENT IN LINKSOCIO DASHBOARD) */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 20px 70px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 50px' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0D9488', letterSpacing: '0.06em', background: '#E6F7F5', padding: '4px 12px', borderRadius: 100 }}>
            BUILT-IN LINKSOCIO TOOLS
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', marginTop: 12, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Everything you have in your dashboard.
          </h2>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
            Every tool designed to grow your business, showcase your products, and turn your bio link into a high-converting machine.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
          className="features-grid"
        >
          {/* 1. Links & Socials Manager */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#E0F2FE', color: '#0284C7' }}>🔗</div>
            <h3 style={featureTitleStyle}>Links & Socials Manager</h3>
            <p style={featureTextStyle}>
              Add unlimited social media icons and custom links. Reorder them with intuitive drag-and-drop handles and track live click counts.
            </p>
          </div>

          {/* 2. Store & Digital Products */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#FEF3C7', color: '#D97706' }}>🛍️</div>
            <h3 style={featureTitleStyle}>Store & Digital Products</h3>
            <p style={featureTextStyle}>
              Sell downloadable digital files, ebooks, templates, and courses with direct checkout and instant automated file delivery.
            </p>
          </div>

          {/* 3. Appointments & Calendar Booking */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#DCFCE7', color: '#16A34A' }}>🗓️</div>
            <h3 style={featureTitleStyle}>Appointments & Calendar</h3>
            <p style={featureTextStyle}>
              Let clients book 1-on-1 consultations, coaching calls, or services directly with customized time slots and booking limits.
            </p>
          </div>

          {/* 4. Messages & Lead Inquiries */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#FCE7F3', color: '#DB2777' }}>💬</div>
            <h3 style={featureTitleStyle}>Messages & Leads Capture</h3>
            <p style={featureTextStyle}>
              Collect custom lead messages, project inquiries, and client contact details directly to your dashboard inbox with export capabilities.
            </p>
          </div>

          {/* 5. Restaurant & Digital Menu */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#FFEDD5', color: '#C2410C' }}>🍽️</div>
            <h3 style={featureTitleStyle}>Restaurant & Digital Menu</h3>
            <p style={featureTextStyle}>
              Create a mouth-watering interactive digital menu with categories, item photos, dietary badges, and table reservation links.
            </p>
          </div>

          {/* 6. Appearance & 12+ Themes */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#EDE9FE', color: '#7C3AED' }}>🎨</div>
            <h3 style={featureTitleStyle}>Appearance & 12+ Themes</h3>
            <p style={featureTextStyle}>
              Personalize your page with curated themes (Midnight, Luxury Gold, Aurora, Pastel), Google Fonts, and custom button shadows.
            </p>
          </div>

          {/* 7. WhatsApp & Email Notification Alerts */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#DCFCE7', color: '#15803D' }}>🔔</div>
            <h3 style={featureTitleStyle}>WhatsApp & Sound Alerts</h3>
            <p style={featureTextStyle}>
              Get instant notification chimes and 1-tap WhatsApp redirection whenever a new booking or lead inquiry arrives.
            </p>
          </div>

          {/* 8. QR Code & Instant vCard */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#F1F5F9', color: '#334155' }}>🔲</div>
            <h3 style={featureTitleStyle}>Vector QR Code & vCard</h3>
            <p style={featureTextStyle}>
              Generate high-resolution vector QR codes for business cards and packaging, plus downloadable vCard contact saving.
            </p>
          </div>

          {/* 9. Real-Time Analytics */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#E6F7F5', color: '#0D9488' }}>📊</div>
            <h3 style={featureTitleStyle}>Live Conversion Analytics</h3>
            <p style={featureTextStyle}>
              Track page views, total link clicks, click-through rates (CTR), and top performing channels in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRICING PLANS ($0 14-DAYS FREE, $4.99 PRO, $11.99 BUSINESS) */}
      <section id="pricing" style={{ background: 'white', borderTop: '1px solid #E7EDEC', borderBottom: '1px solid #E7EDEC', padding: '90px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          {/* 14-Days Free Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 100,
              padding: '6px 16px',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13 }}>🎁</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#065F46' }}>
              14 DAYS FREE TRIAL ON ALL PLANS · NO CREDIT CARD REQUIRED
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>
            Simple, Transparent Pricing in USD ($)
          </h2>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 40px' }}>
            Start completely free for 14 days. Upgrade whenever you are ready to scale.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
              textAlign: 'left',
            }}
            className="pricing-grid"
          >
            {/* Plan 1: 14-Days Free Trial ($0) */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 24, padding: '32px 24px', background: '#F8FAFA', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', letterSpacing: '0.06em' }}>14-DAY FULL ACCESS</span>
              <p style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', margin: '10px 0 6px' }}>
                $0 <span style={{ fontSize: 13, fontWeight: 600, color: '#8A97A3' }}>/ 14 days free</span>
              </p>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 20px', minHeight: 36 }}>
                Full dashboard access to build your bio link, list products & test features.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26, flex: 1 }}>
                {[
                  '14 Days full feature access',
                  'Unlimited links & social icons',
                  'Direct 1-tap WhatsApp button',
                  'Digital store with 91% net split',
                  'Appointments & Booking form',
                  'Inquiry & Leads capture inbox',
                  'Downloadable Vector QR Code',
                  'Basic page view analytics',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0F172A' }}>
                    <span style={{ color: '#14B8A6', fontWeight: 800 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={goToSignUp}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                }}
                className="btn-scale"
              >
                Start 14-Days Free
              </button>
            </div>

            {/* Plan 2: Pro Creator ($4.99) */}
            <div
              style={{
                border: '2px solid #14B8A6',
                borderRadius: 24,
                padding: '32px 24px',
                background: 'white',
                position: 'relative',
                boxShadow: '0 12px 30px -8px rgba(20, 184, 166, 0.2)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: 20,
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                  color: 'white',
                  fontSize: 10.5,
                  fontWeight: 800,
                  borderRadius: 100,
                  padding: '4px 12px',
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
                }}
              >
                MOST POPULAR
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0D9488', letterSpacing: '0.06em' }}>PRO CREATOR</span>
              <p style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', margin: '10px 0 6px' }}>
                $4.99 <span style={{ fontSize: 13, fontWeight: 600, color: '#8A97A3' }}>/ month</span>
              </p>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 20px', minHeight: 36 }}>
                For individual creators, coaches & freelancers wanting a premium page.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26, flex: 1 }}>
                {[
                  'Includes everything in 14-Day Free',
                  'All 12+ Animated Themes & Google Fonts',
                  'Unlimited Digital Products sales',
                  'Instant automated file delivery',
                  'Restaurant interactive menu builder',
                  'WhatsApp & sound notification alerts',
                  'Remove LinkSocio watermark badge',
                  'Detailed traffic & click conversion logs',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0F172A' }}>
                    <span style={{ color: '#14B8A6', fontWeight: 800 }}>✓</span>
                    <span style={{ fontWeight: 600 }}>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={goToSignUp}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(20, 184, 166, 0.3)',
                }}
                className="btn-scale"
              >
                Get Started ($4.99/mo) 🚀
              </button>
            </div>

            {/* Plan 3: Business & Agency ($11.99) */}
            <div style={{ border: '1px solid #CBD5E1', borderRadius: 24, padding: '32px 24px', background: '#F8FAFA', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#6366F1', letterSpacing: '0.06em' }}>BUSINESS & AGENCY</span>
              <p style={{ fontSize: 34, fontWeight: 800, color: '#0F172A', margin: '10px 0 6px' }}>
                $11.99 <span style={{ fontSize: 13, fontWeight: 600, color: '#8A97A3' }}>/ month</span>
              </p>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 20px', minHeight: 36 }}>
                For high-volume stores, restaurant chains, and commercial agencies.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26, flex: 1 }}>
                {[
                  'Everything included in Pro Creator',
                  'Priority booking slots & leads handling',
                  'Multi-category large restaurant menus',
                  'Highest digital file upload capacity',
                  'Priority instant payout processing',
                  'Advanced export for leads (CSV / Excel)',
                  'VIP 24/7 dedicated support',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0F172A' }}>
                    <span style={{ color: '#6366F1', fontWeight: 800 }}>✓</span>
                    <span style={{ fontWeight: 600 }}>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={goToSignUp}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                }}
                className="btn-scale"
              >
                Choose Business ($11.99/mo)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section id="faq" style={{ maxWidth: 800, margin: '0 auto', padding: '90px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: 14.5, color: '#64748B', margin: 0 }}>
            Everything you need to know about the 14-day free trial, features, and pricing.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              q: 'How does the 14-day free trial work?',
              a: 'You can sign up today and enjoy all features — including all luxury themes, digital product listings, direct WhatsApp ordering, appointment calendar, and analytics — completely free for 14 days without any credit card required.',
            },
            {
              q: 'What are the pricing options after the 14 days?',
              a: 'You can continue with the Pro Creator plan at $4.99/month, or the Business plan at $11.99/month for higher volume and advanced capabilities.',
            },
            {
              q: 'How do digital product sales and payouts work?',
              a: 'When you list a digital file (PDF, ebook, template, course), buyers can purchase directly. The buyer gets instant download access, and 91% net revenue is recorded directly to your Wallet with a 9% platform fee.',
            },
            {
              q: 'How does the direct WhatsApp feature work?',
              a: 'When you configure your WhatsApp link or phone number, LinkSocio creates a direct wa.me link. Visitors tap it from your page and immediately start a conversation without needing to manually save your number.',
            },
            {
              q: 'Can I manage restaurant menus and table bookings?',
              a: 'Yes! The built-in Restaurant & Menu tab allows you to showcase categorized dishes, add prices and photos, and let visitors reserve tables or send inquiries directly.',
            },
          ].map((item, idx) => {
            const isOpen = faqOpen.includes(idx)
            return (
              <div
                key={idx}
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: 18,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.q}</span>
                  <span style={{ fontSize: 18, color: '#14B8A6', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 7. BOTTOM HIGH-CONVERSION CTA */}
      <section style={{ background: '#0F172A', color: 'white', padding: '80px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 300,
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(15, 23, 42, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <span style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#2DD4BF', border: '1px solid rgba(20, 184, 166, 0.4)', fontSize: 12, fontWeight: 800, padding: '4px 14px', borderRadius: 100 }}>
            ⚡ 14-DAYS FREE TRIAL
          </span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '14px 0 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Ready to claim your corner of the internet?
          </h2>
          <p style={{ fontSize: 16, color: '#94A3B8', marginTop: 12, marginBottom: 30 }}>
            Join creators, brands, and businesses who connect and monetize with LinkSocio.
          </p>

          <form
            onSubmit={handleClaimSubmit}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: '6px 6px 6px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: 460,
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: 14, color: '#94A3B8', fontWeight: 700 }}>linksocio.com/</span>
            <input
              type="text"
              placeholder="yourname"
              value={claimHandle}
              onChange={(e) => setClaimHandle(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                flex: 1,
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              className="btn-scale"
            >
              Get Started →
            </button>
          </form>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer style={{ background: '#090D16', color: '#64748B', padding: '40px 20px', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#FFFFFF" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>LinkSocio</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>— Bio Link & Digital Store.</span>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => goTo && goTo('privacy')} style={{ background: 'none', border: 'none', color: '#8A97A3', fontSize: 13, cursor: 'pointer', padding: 0 }}>
              Privacy Policy
            </button>
            <button onClick={() => goTo && goTo('terms')} style={{ background: 'none', border: 'none', color: '#8A97A3', fontSize: 13, cursor: 'pointer', padding: 0 }}>
              Terms of Service
            </button>
            <span style={{ color: '#475569' }}>© 2026 LinkSocio. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Smooth CSS Keyframe Animations & Responsive Media Queries */}
      <style>{`
        @keyframes floatBadge {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes floatingOrb {
          0% { transform: scale(1) translate(0px, 0px); }
          100% { transform: scale(1.15) translate(30px, 20px); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
          50% { box-shadow: 0 4px 20px rgba(20,184,166,0.35); }
          100% { box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
        }
        .btn-scale {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-scale:hover {
          transform: translateY(-2px);
        }
        .btn-scale:active {
          transform: translateY(0px);
        }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
          .hero-grid > div:first-child { align-items: center !important; }
          .hero-grid p { text-align: center !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .desktop-nav { display: none !important; }
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  )
}

const navLinkStyle = {
  fontSize: 13.5,
  fontWeight: 600,
  color: '#475569',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
}

const featureCardStyle = {
  background: 'white',
  border: '1px solid #E7EDEC',
  borderRadius: 24,
  padding: '30px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
}

const iconBadgeStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  marginBottom: 4,
}

const featureTitleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#0F172A',
  margin: 0,
}

const featureTextStyle = {
  fontSize: 13.5,
  color: '#64748B',
  lineHeight: 1.55,
  margin: 0,
}
