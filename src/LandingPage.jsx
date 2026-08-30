import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { THEMES, FONTS, BUTTON_STYLES } from './themes'

// Social SVG Icons for High-End Visuals
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
  if (n.includes('store') || n.includes('shop')) {
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
    key: 'agency',
    name: 'Otman Studio',
    handle: 'otman',
    bio: 'Creative Director & E-commerce Brand Builder 🇲🇦 ✨',
    theme: 'midnight',
    font: 'outfit',
    buttonStyle: 'rounded',
    avatarLetter: 'O',
    links: [
      { id: 1, label: '💬 Direct WhatsApp Chat', url: 'https://wa.me/212600000000', icon: 'whatsapp', clicks: 1420 },
      { id: 2, label: '📷 Instagram Portfolio', url: 'https://instagram.com', icon: 'instagram', clicks: 980 },
      { id: 3, label: '🌐 Agency Website & Works', url: 'https://example.com', icon: 'store', clicks: 650 },
    ],
    products: [
      { id: 1, name: 'Brand Identity Design', price: '4500 DH', image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=300&q=80' },
      { id: 2, name: 'E-commerce UI Template', price: '899 DH', image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=300&q=80' },
    ],
  },
  {
    key: 'creator',
    name: 'Sarah Lifestyle',
    handle: 'sarah.vlog',
    bio: 'Fashion, Travel & Daily Wellness Tips 🌸 Dubai & Paris',
    theme: 'aurora',
    font: 'playfair',
    buttonStyle: 'glass',
    avatarLetter: 'S',
    links: [
      { id: 1, label: '🎵 My TikTok Daily Outfits', url: 'https://tiktok.com', icon: 'tiktok', clicks: 3120 },
      { id: 2, label: '▶️ Weekly YouTube Vlogs', url: 'https://youtube.com', icon: 'youtube', clicks: 1840 },
      { id: 3, label: '💬 Brand Collaborations WhatsApp', url: 'https://wa.me/97150000000', icon: 'whatsapp', clicks: 740 },
    ],
    products: [
      { id: 1, name: 'Preset Pack Lightroom 2026', price: '$24.99', image: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=300&q=80' },
      { id: 2, name: 'Travel Guide: Morocco & Alps', price: '$18.00', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&q=80' },
    ],
  },
  {
    key: 'ecommerce',
    name: 'Artisan Cuir Maroc',
    handle: 'artisancuir',
    bio: 'Authentic Handmade Leather Goods · Worldwide Express Shipping 📦',
    theme: 'gold',
    font: 'luxury',
    buttonStyle: 'shadow',
    avatarLetter: 'A',
    links: [
      { id: 1, label: '🛍️ Official Storefront', url: 'https://shop.com', icon: 'store', clicks: 4200 },
      { id: 2, label: '💬 Instant Order via WhatsApp', url: 'https://wa.me/212611111111', icon: 'whatsapp', clicks: 3800 },
      { id: 3, label: '📷 Customer Reviews on IG', url: 'https://instagram.com', icon: 'instagram', clicks: 1100 },
    ],
    products: [
      { id: 1, name: 'Vintage Leather Weekender Bag', price: '1200 DH', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=80' },
      { id: 2, name: 'Handcrafted Minimalist Wallet', price: '350 DH', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&q=80' },
    ],
  },
]

export default function LandingPage({ goToLogin, goToSignUp, goTo }) {
  const [claimHandle, setClaimHandle] = useState('')
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('links')
  const [customTheme, setCustomTheme] = useState('midnight')
  const [faqOpen, setFaqOpen] = useState([0]) // first FAQ open by default
  const [savedVcard, setSavedVcard] = useState(false)

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
          background: 'rgba(248, 250, 250, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(231, 237, 236, 0.8)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
                ONE TAP BIO & STORE
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="desktop-nav" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <a href="#features" style={navLinkStyle}>Features</a>
            <a href="#demo" style={navLinkStyle}>Interactive Demo</a>
            <a href="#themes" style={navLinkStyle}>Themes & Styles</a>
            <a href="#pricing" style={navLinkStyle}>Pricing</a>
            <a href="#faq" style={navLinkStyle}>FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={goToLogin}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
                padding: '8px 14px',
              }}
            >
              Log in
            </button>
            <button
              onClick={goToSignUp}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                padding: '10px 20px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
                transition: 'transform 0.15s ease',
              }}
            >
              Create Free Page 🚀
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION WITH INTEGRATED INTERACTIVE PHONE SIMULATOR */}
      <section
        style={{
          position: 'relative',
          padding: '60px 20px 80px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Subtle background glow circle */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, rgba(248, 250, 250, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
            gap: 48,
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Value Prop & Handle Claim Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Release pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#E6F7F5',
                border: '1px solid #CCFBF1',
                borderRadius: 100,
                padding: '6px 16px',
                width: 'fit-content',
              }}
            >
              <span style={{ fontSize: 13 }}>⚡</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0D9488' }}>
                Next-Gen Bio Link & Storefront for Creators & Businesses
              </span>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(34px, 4.5vw, 54px)',
                fontWeight: 800,
                lineHeight: 1.12,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Your Entire Online Universe in{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                One Powerful Link.
              </span>
            </h1>

            {/* Sub-headline */}
            <p
              style={{
                fontSize: 16.5,
                color: '#64748B',
                lineHeight: 1.6,
                maxWidth: 540,
                margin: 0,
              }}
            >
              Connect your Instagram, TikTok, and get <strong>direct 1-tap WhatsApp chats</strong>. Showcase digital products, collect orders, and customize your aesthetic with luxury themes — zero coding required.
            </p>

            {/* Claim your handle input box */}
            <div
              style={{
                background: 'white',
                border: '2px solid #E2E8F0',
                borderRadius: 20,
                padding: '8px 8px 8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 10px 30px -10px rgba(15,23,42,0.08)',
                maxWidth: 480,
                marginTop: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>linksocio.com/</span>
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
                    fontWeight: 700,
                    color: '#0F172A',
                    width: '100%',
                    background: 'transparent',
                  }}
                />
              </div>
              <button
                onClick={handleClaimSubmit}
                style={{
                  background: '#14B8A6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                Claim Link →
              </button>
            </div>

            {/* Trust & Social Proof stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>4.9/5 Rating</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#8A97A3' }}>
                  Used by 10,000+ creators, merchants & freelancers
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Device Phone Simulator */}
          <div id="demo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
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
                    fontWeight: 600,
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
                boxShadow: '0 25px 50px -12px rgba(15,23,42,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
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
                    fontWeight: 700,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {currentProfile.avatarLetter}
                </div>

                <p style={{ margin: '10px 0 2px', fontSize: 16, fontWeight: 700, color: currentThemeObj.textColor }}>
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
                    marginTop: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#25D366',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <SocialIcon name="whatsapp" color="white" size={13} />
                  <span>Chat on WhatsApp</span>
                </a>

                {/* Tab Switcher (Links vs Store) */}
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 12,
                    padding: 3,
                    marginTop: 14,
                    marginBottom: 12,
                  }}
                >
                  <button
                    onClick={() => setActiveTab('links')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 9,
                      border: 'none',
                      background: activeTab === 'links' ? 'rgba(255,255,255,0.9)' : 'transparent',
                      color: activeTab === 'links' ? '#0F172A' : currentThemeObj.subTextColor,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🔗 Links ({currentProfile.links.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('shop')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 9,
                      border: 'none',
                      background: activeTab === 'shop' ? 'rgba(255,255,255,0.9)' : 'transparent',
                      color: activeTab === 'shop' ? '#0F172A' : currentThemeObj.subTextColor,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🛍️ Store ({currentProfile.products.length})
                  </button>
                </div>

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
                          transition: 'transform 0.15s ease',
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

                {/* Tab Content: Store Products */}
                {activeTab === 'shop' && (
                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {currentProfile.products.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          background: currentThemeObj.cardBg || 'white',
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: 75, objectFit: 'cover' }} />
                        <div style={{ padding: '8px 6px' }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: currentThemeObj.textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: currentThemeObj.accent }}>
                            {p.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <span style={{ fontSize: 9.5, opacity: 0.6, letterSpacing: '0.04em' }}>POWERED BY LINKSOCIO</span>
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

      {/* 3. LOGOS & COMMUNITY BANNER */}
      <section style={{ borderTop: '1px solid #E7EDEC', borderBottom: '1px solid #E7EDEC', background: 'white', padding: '24px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#8A97A3', letterSpacing: '0.08em' }}>
            ENGINEERED FOR MODERN CREATORS, SELLERS & AGENCIES WORLDWIDE
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 32,
              flexWrap: 'wrap',
              fontSize: 14,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            <span>🛍️ E-Commerce Brands</span>
            <span>·</span>
            <span>📱 Content Creators</span>
            <span>·</span>
            <span>💼 Creative Agencies</span>
            <span>·</span>
            <span>🎨 Graphic Designers</span>
            <span>·</span>
            <span>🏋️ Coaches & Consultants</span>
            <span>·</span>
            <span>📦 Artisan Sellers</span>
          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES BENTO GRID */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 20px 70px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 50px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', letterSpacing: '0.06em', background: '#E6F7F5', padding: '4px 12px', borderRadius: 100 }}>
            WHY LINKSOCIO?
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', marginTop: 12, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Everything you need to turn visitors into buyers.
          </h2>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
            Traditional bio links are boring and limited. LinkSocio gives you an interactive storefront, direct messaging, and high-conversion widgets.
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
          {/* Card 1: Direct WhatsApp Chat */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#DCFCE7', color: '#16A34A' }}>💬</div>
            <h3 style={featureTitleStyle}>Direct 1-Tap WhatsApp Chat</h3>
            <p style={featureTextStyle}>
              Say goodbye to lost leads. Add your phone number and let visitors start a direct WhatsApp conversation with a single tap — no typing, no contacts saving.
            </p>
          </div>

          {/* Card 2: Digital Storefront */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#FEF3C7', color: '#D97706' }}>🛍️</div>
            <h3 style={featureTitleStyle}>Digital Storefront & Auto-Fetch</h3>
            <p style={featureTextStyle}>
              Paste a link from Shopify, Amazon, Etsy, or Gumroad. We automatically grab the title, image, and price to showcase your merchandise beautifully.
            </p>
          </div>

          {/* Card 3: Dynamic Themes & Animations */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#EDE9FE', color: '#7C3AED' }}>🎨</div>
            <h3 style={featureTitleStyle}>12+ Animated Themes & Fonts</h3>
            <p style={featureTextStyle}>
              Express your brand with Glassmorphism, 3D Brutalism, Neon Glows, and Google Fonts (including Arabic & Latin typography like Tajawal).
            </p>
          </div>

          {/* Card 4: Drag & Drop Organization */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#E0F2FE', color: '#0284C7' }}>↕️</div>
            <h3 style={featureTitleStyle}>Drag-and-Drop Organization</h3>
            <p style={featureTextStyle}>
              Easily rearrange your links and store products with smooth drag-and-drop handles. Put your most important offer at the top in seconds.
            </p>
          </div>

          {/* Card 5: Instant vCard & QR Code */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#FCE7F3', color: '#DB2777' }}>📇</div>
            <h3 style={featureTitleStyle}>Instant QR Code & vCard Contact</h3>
            <p style={featureTextStyle}>
              Generate high-res vector QR codes for your restaurant tables, packaging, and business cards. Visitors can save your entire contact with 1 tap.
            </p>
          </div>

          {/* Card 6: Real-Time Click Analytics */}
          <div style={featureCardStyle}>
            <div style={{ ...iconBadgeStyle, background: '#E6F7F5', color: '#0D9488' }}>📊</div>
            <h3 style={featureTitleStyle}>Real-Time Conversion Analytics</h3>
            <p style={featureTextStyle}>
              Track exact click counts across every single channel. Discover which links generate real revenue and optimize your social traffic.
            </p>
          </div>
        </div>
      </section>

      {/* 5. COMPARISON SECTION (LinkSocio vs Others) */}
      <section style={{ background: 'white', borderTop: '1px solid #E7EDEC', borderBottom: '1px solid #E7EDEC', padding: '80px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Why creators switch to LinkSocio
            </h2>
            <p style={{ fontSize: 14.5, color: '#64748B', marginTop: 8 }}>
              Compare LinkSocio with traditional, outdated link-in-bio tools.
            </p>
          </div>

          <div
            style={{
              background: '#F8FAFA',
              border: '1px solid #E2E8F0',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', padding: '16px 20px', background: '#0F172A', color: 'white', fontWeight: 700, fontSize: 13 }}>
              <span>Feature</span>
              <span style={{ color: '#2DD4BF', textAlign: 'center' }}>LinkSocio (You)</span>
              <span style={{ color: '#94A3B8', textAlign: 'center' }}>Old Bio Tools</span>
            </div>

            {[
              { f: 'Direct 1-Tap WhatsApp Lead Button', ls: '✅ Free & Instant', other: '❌ Not Supported' },
              { f: 'Digital Storefront Catalog', ls: '✅ Included (0% fee)', other: '❌ High fees / Paid only' },
              { f: 'Animated Gradients & Luxury Themes', ls: '✅ 12+ Presets', other: '❌ Generic templates' },
              { f: 'Instant vCard & Phonebook Sync', ls: '✅ Built-in', other: '❌ Missing' },
              { f: 'Auto-Fetch Info for External Links', ls: '✅ Automatic', other: '❌ Manual entry' },
              { f: 'Downloadable Custom QR Code', ls: '✅ High-Res Vector', other: '❌ Paid feature' },
            ].map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr',
                  padding: '14px 20px',
                  borderTop: '1px solid #E2E8F0',
                  fontSize: 13.5,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{row.f}</span>
                <span style={{ color: '#0D9488', fontWeight: 700, textAlign: 'center' }}>{row.ls}</span>
                <span style={{ color: '#94A3B8', textAlign: 'center' }}>{row.other}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS (3 Simple Steps) */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '90px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', letterSpacing: '0.06em', background: '#E6F7F5', padding: '4px 12px', borderRadius: 100 }}>
            3-MINUTE SETUP
          </span>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', marginTop: 12, margin: 0 }}>
            Go live in three simple steps.
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
          className="steps-grid"
        >
          {[
            { num: '01', title: 'Claim Your Custom Handle', text: 'Pick your unique link name (e.g. linksocio.com/yourname) in under 30 seconds.' },
            { num: '02', title: 'Add Links & Showcase Merch', text: 'Connect WhatsApp, TikTok, Instagram, and add your store products with zero code.' },
            { num: '03', title: 'Share & Grow Everywhere', text: 'Paste your link in your social bios, printed menus, or business cards and watch conversions soar.' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                background: 'white',
                border: '1px solid #E7EDEC',
                borderRadius: 24,
                padding: '32px 24px',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 900, color: '#CCFBF1', display: 'block', marginBottom: 12 }}>
                {s.num}
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. PRICING PLANS */}
      <section id="pricing" style={{ background: 'white', borderTop: '1px solid #E7EDEC', borderBottom: '1px solid #E7EDEC', padding: '90px 20px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', letterSpacing: '0.06em', background: '#E6F7F5', padding: '4px 12px', borderRadius: 100 }}>
            TRANSPARENT PRICING
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '12px 0 6px' }}>
            Simple, fair pricing for everyone.
          </h2>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 40px' }}>
            Start for free. No credit card required. Upgrade when you scale.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
              textAlign: 'left',
            }}
            className="pricing-grid"
          >
            {/* Free Plan */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 28, padding: '36px 30px', background: '#F8FAFA' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em' }}>FREE FOREVER</span>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', margin: '10px 0 16px' }}>
                €0 <span style={{ fontSize: 14, fontWeight: 500, color: '#8A97A3' }}>/ lifetime</span>
              </p>
              <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 20px' }}>
                Perfect for creators, beginners, and small shops getting started.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {[
                  'Unlimited social & website links',
                  'Direct WhatsApp chat button',
                  'Digital storefront with auto-fetch',
                  'Custom downloadable QR code',
                  'Instant vCard contact card',
                  'Basic click analytics',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0F172A' }}>
                    <span style={{ color: '#14B8A6', fontWeight: 700 }}>✓</span>
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
                  padding: '13px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                }}
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Creator Plan */}
            <div
              style={{
                border: '2px solid #14B8A6',
                borderRadius: 28,
                padding: '36px 30px',
                background: 'white',
                position: 'relative',
                boxShadow: '0 12px 30px -8px rgba(20, 184, 166, 0.15)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: 24,
                  background: '#14B8A6',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 100,
                  padding: '4px 14px',
                  letterSpacing: '0.04em',
                }}
              >
                MOST POPULAR
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', letterSpacing: '0.06em' }}>PRO CREATOR</span>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', margin: '10px 0 16px' }}>
                €4.99 <span style={{ fontSize: 14, fontWeight: 500, color: '#8A97A3' }}>/ month</span>
              </p>
              <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 20px' }}>
                For power creators, businesses & brands that want premium branding.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {[
                  'Everything in Free Plan',
                  'All 12+ Animated Luxury Themes',
                  'Custom Domain Connection (yourdomain.com)',
                  'Remove LinkSocio watermark badge',
                  'Detailed traffic source analytics',
                  'Priority 24/7 VIP creator support',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0F172A' }}>
                    <span style={{ color: '#14B8A6', fontWeight: 700 }}>✓</span>
                    <span style={{ fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={goToSignUp}
                style={{
                  width: '100%',
                  background: '#14B8A6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '13px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)',
                }}
              >
                Try Pro 14-Days Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section id="faq" style={{ maxWidth: 800, margin: '0 auto', padding: '90px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: 14.5, color: '#64748B', margin: 0 }}>
            Got questions? We have clear answers.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              q: 'How does the direct WhatsApp feature work?',
              a: 'When you configure your WhatsApp link or phone number, LinkSocio creates a direct wa.me link with instant clickability. When visitors tap it from your profile, it opens a WhatsApp conversation directly without needing them to manually save your number.',
            },
            {
              q: 'Is the Free plan truly free forever?',
              a: 'Yes! You can create your custom LinkSocio page, add unlimited links, list products, download your QR code, and track basic clicks completely free with no expiration date.',
            },
            {
              q: 'Can I sell physical or digital products?',
              a: 'Absolutely. You can showcase external products, affiliate links, course URLs, PDF downloads, or merchandise. Visitors can view prices and images and jump straight to your checkout or contact you via WhatsApp.',
            },
            {
              q: 'Can I customize the themes, fonts, and colors?',
              a: 'Yes, LinkSocio offers multiple themes including Midnight Dark, Animated Aurora Glow, Luxury Gold, and Neo-Brutalist styling with customizable Google Fonts.',
            },
            {
              q: 'How do I download my QR Code?',
              a: 'Inside your LinkSocio dashboard, you will find a dedicated high-definition QR code that automatically links to your profile. You can download it with one click and print it on stickers, business cards, flyers, or store receipts.',
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

      {/* 9. BOTTOM HIGH-CONVERSION CTA */}
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
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Ready to claim your corner of the internet?
          </h2>
          <p style={{ fontSize: 16, color: '#94A3B8', marginTop: 14, marginBottom: 32 }}>
            Join thousands of creators, brands, and businesses who connect smarter with LinkSocio.
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
              maxWidth: 440,
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>linksocio.com/</span>
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
                background: '#14B8A6',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Get Started →
            </button>
          </form>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer style={{ background: '#090D16', color: '#64748B', padding: '40px 20px', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 46 46">
              <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
              <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#FFFFFF" strokeWidth="6" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>LinkSocio</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>— One Tap. Instant Connection.</span>
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

      {/* Responsive Media Query Styles */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
          .hero-grid > div:first-child { align-items: center !important; }
          .hero-grid p { text-align: center !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .desktop-nav { display: none !important; }
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
