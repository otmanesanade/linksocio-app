import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getTheme, getFont, getButtonStyle } from '../themes'
import confetti from 'canvas-confetti'
import QRCode from 'qrcode'
import InquiryCard from './InquiryCard'
import MediaEmbedCard from './MediaEmbedCard'
import WalletPassModal from './WalletPassModal'
import { getMediaEmbedInfo } from '../utils/mediaEmbed'
import { downloadVCard } from '../utils/walletPass'

// SVG Social Icons
const IconInstagram = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none" />
  </svg>
)
const IconWhatsapp = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)
const IconTiktok = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)
const IconYoutube = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="M10 9.5v5l4.5-2.5z" fill={color} stroke="none" />
  </svg>
)
const IconTwitter = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
)
const IconLinkedin = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <path d="M7 11v6M11 11v6M11 13.5c0-1.5 1-2.5 2.5-2.5S16 12 16 13.5V17" />
  </svg>
)
const IconFacebook = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)
const IconSnapchat = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0-6 6c0 2 .5 3.5 1 4.5-.5 1-2 1.5-2.5 2 0 1 2 1.5 3.5 1.5 1 0 1.5.5 2 1.5 1 0 2-.5 2-.5s1 .5 2 .5c.5-1 1-1.5 2-1.5 1.5 0 3.5-.5 3.5-1.5-.5-.5-2-1-2.5-2 .5-1 1-2.5 1-4.5a6 6 0 0 0-6-6z" />
  </svg>
)
const IconSpotify = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 11.5c2.5-.8 5.5-.6 8 .6M7 14.5c2.2-.6 4.8-.4 7 .6M9 8.5c3-1 6.8-.8 9.8.7" />
  </svg>
)
const IconTelegram = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 5L2 12.5l7 2.5 2 6 3.5-4 4.5 3.5L21 5z" />
  </svg>
)
const IconGlobe = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
const IconLink = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
)

export const getSocialIcon = (label = '', color, size = 18) => {
  const l = label.toLowerCase()
  if (l.includes('instagram') || l.includes('insta')) return <IconInstagram color={color} size={size} />
  if (l.includes('whatsapp') || l.includes('wa.me')) return <IconWhatsapp color={color} size={size} />
  if (l.includes('tiktok')) return <IconTiktok color={color} size={size} />
  if (l.includes('youtube')) return <IconYoutube color={color} size={size} />
  if (l.includes('twitter') || l.includes('x.com')) return <IconTwitter color={color} size={size} />
  if (l.includes('linkedin')) return <IconLinkedin color={color} size={size} />
  if (l.includes('facebook') || l.includes('fb.me')) return <IconFacebook color={color} size={size} />
  if (l.includes('snapchat')) return <IconSnapchat color={color} size={size} />
  if (l.includes('spotify')) return <IconSpotify color={color} size={size} />
  if (l.includes('telegram') || l.includes('t.me')) return <IconTelegram color={color} size={size} />
  if (l.includes('website') || l.includes('store') || l.includes('shop')) return <IconGlobe color={color} size={size} />
  return <IconLink color={color} size={size} />
}

export function LivePagePreview({ profile, links = [], products = [], isEmbedded = false, activeTabOverride = null }) {
  const [tab, setTab] = useState(activeTabOverride || 'links')
  const [pressedId, setPressedId] = useState(null)
  const [copiedContact, setCopiedContact] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [publicQrUrl, setPublicQrUrl] = useState(null)

  useEffect(() => {
    if (activeTabOverride) setTab(activeTabOverride)
  }, [activeTabOverride])

  useEffect(() => {
    if (profile?.username) {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
      const pageUrl = `${currentOrigin}/${profile.username}`
      QRCode.toDataURL(pageUrl, {
        width: 380,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      })
        .then((url) => setPublicQrUrl(url))
        .catch(() => {})
    }
  }, [profile?.username])

  const themeKey = profile?.theme_preset || 'default'
  const fontKey = profile?.font_family || 'default'
  const buttonKey = profile?.button_style || 'rounded'

  const theme = getTheme(themeKey)
  const font = getFont(fontKey)
  const btnStyle = getButtonStyle(buttonKey)

  const color = theme.accent || '#14B8A6'
  const tint = theme.buttonBg || `${color}1A`

  const activeLinks = links.filter((l) => l.active !== false)
  const buttonLinks = activeLinks.filter((l) => l.style !== 'icon')
  const topIcons = activeLinks.filter((l) => l.style === 'icon' && l.icon_position !== 'bottom')
  const bottomIcons = activeLinks.filter((l) => l.style === 'icon' && l.icon_position === 'bottom')
  const hasShop = products.length > 0

  const handleLinkClick = (link, e) => {
    if (isEmbedded) return
    const key = `linksocio_clicked_${link.id}`
    const lastClick = sessionStorage.getItem(key)
    const now = Date.now()

    if (!lastClick || now - parseInt(lastClick, 10) >= 10000) {
      sessionStorage.setItem(key, String(now))
      supabase.from('links').update({ clicks: (link.clicks || 0) + 1 }).eq('id', link.id).then(() => {})
    }
  }

  // Quick WhatsApp Direct Floating button detection
  const whatsappLink = activeLinks.find(
    (l) => l.label.toLowerCase().includes('whatsapp') || l.url.includes('wa.me') || l.url.includes('whatsapp.com')
  )

  const saveContact = () => {
    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } })
    } catch (e) {}

    const phoneMatch = whatsappLink?.url.match(/(\d{6,15})/)
    const phone = phoneMatch ? phoneMatch[1] : ''

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile?.display_name || profile?.username || 'Contact'}`,
      phone ? `TEL;TYPE=CELL:${phone}` : '',
      `URL:https://linksocio.com/${profile?.username}`,
      profile?.bio ? `NOTE:${profile.bio}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\n')

    const blob = new Blob([vcard], { type: 'text/vcard' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile?.username || 'contact'}.vcf`
    a.click()
    setCopiedContact(true)
    setTimeout(() => setCopiedContact(false), 2000)
  }

  return (
    <div
      className={theme.isAnimated ? 'animated-gradient-bg' : ''}
      style={{
        minHeight: isEmbedded ? '100%' : '100vh',
        width: '100%',
        ...(theme.pageBg?.startsWith('linear-gradient')
          ? {
              backgroundImage: theme.pageBg,
              backgroundSize: theme.isAnimated ? '400% 400%' : 'cover',
            }
          : {
              backgroundColor: theme.pageBg || '#F8FAFA',
            }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isEmbedded ? '20px 14px' : '44px 16px 80px',
        fontFamily: font.fontFamily,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', maxWidth: isEmbedded ? 290 : 420 }}>
        {/* Main Profile Card Container */}
        <div
          style={{
            position: 'relative',
            background: theme.cardBg,
            backdropFilter: theme.backdrop || 'none',
            WebkitBackdropFilter: theme.backdrop || 'none',
            borderRadius: isEmbedded ? 22 : 32,
            border: btnStyle.effect === 'glass' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            padding: isEmbedded ? '24px 18px' : '36px 26px',
            color: theme.textColor,
            boxSizing: 'border-box',
          }}
        >
          {/* Header info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: isEmbedded ? 64 : 88,
                height: isEmbedded ? 64 : 88,
                borderRadius: '50%',
                background: profile?.avatar_url
                  ? '#F1F5F9'
                  : `linear-gradient(135deg, ${color}, #0F172A)`,
                border: '3px solid white',
                boxShadow: `0 4px 16px ${color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: isEmbedded ? 22 : 30,
                fontWeight: 700,
                marginBottom: isEmbedded ? 10 : 14,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.display_name || profile?.username || 'Avatar'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || '?'
              )}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: isEmbedded ? 16 : 21,
                fontWeight: 700,
                color: theme.textColor,
                letterSpacing: '-0.02em',
              }}
            >
              {profile?.display_name || profile?.username || 'Your Name'}
            </h1>

            <p style={{ margin: '2px 0 0', fontSize: isEmbedded ? 11 : 13, color: theme.subTextColor, fontWeight: 500 }}>
              @{profile?.username || 'username'}
            </p>

            {profile?.bio && (
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: isEmbedded ? 11.5 : 13.5,
                  color: theme.subTextColor,
                  lineHeight: 1.45,
                  maxWidth: '94%',
                }}
              >
                {profile.bio}
              </p>
            )}

            {/* Save contact & Quick action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: isEmbedded ? 12 : 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setShowWalletModal(true)}
                title="Add to Apple & Google Wallet"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 100,
                  padding: isEmbedded ? '6px 11px' : '8px 15px',
                  fontSize: isEmbedded ? 11 : 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span> 💳</span>
                <span>Wallet Pass</span>
              </button>

              <button
                onClick={saveContact}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: tint,
                  color: theme.textColor,
                  border: 'none',
                  borderRadius: 100,
                  padding: isEmbedded ? '6px 11px' : '8px 14px',
                  fontSize: isEmbedded ? 11 : 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📇</span>
                <span>{copiedContact ? '✓ Saved!' : 'Contact'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                title="View QR Code"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: tint,
                  color: theme.textColor,
                  border: 'none',
                  borderRadius: 100,
                  padding: isEmbedded ? '6px 9px' : '8px 12px',
                  fontSize: isEmbedded ? 11 : 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🔲</span>
                <span>QR</span>
              </button>

              {whatsappLink && (
                <a
                  href={whatsappLink.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#22C55E',
                    color: '#FFFFFF',
                    borderRadius: 100,
                    padding: isEmbedded ? '6px 11px' : '8px 14px',
                    fontSize: isEmbedded ? 11 : 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <IconWhatsapp color="#FFFFFF" size={13} />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {/* Top Social Icons Bar */}
            {topIcons.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: isEmbedded ? 14 : 18 }}>
                {topIcons.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleLinkClick(link, e)}
                    style={{
                      width: isEmbedded ? 32 : 40,
                      height: isEmbedded ? 32 : 40,
                      borderRadius: '50%',
                      background: tint,
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    {getSocialIcon(link.label, color, isEmbedded ? 15 : 18)}
                  </a>
                ))}
              </div>
            )}

            {/* Links / Shop Tab switcher */}
            {hasShop && (
              <div
                style={{
                  marginTop: isEmbedded ? 14 : 20,
                  display: 'flex',
                  gap: 4,
                  background: tint,
                  borderRadius: 100,
                  padding: 4,
                  width: '100%',
                  maxWidth: 240,
                }}
              >
                <button
                  onClick={() => setTab('links')}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderRadius: 100,
                    padding: isEmbedded ? '6px' : '8px',
                    fontSize: isEmbedded ? 11.5 : 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tab === 'links' ? theme.cardBg : 'transparent',
                    color: theme.textColor,
                    boxShadow: tab === 'links' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Links
                </button>
                <button
                  onClick={() => setTab('shop')}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderRadius: 100,
                    padding: isEmbedded ? '6px' : '8px',
                    fontSize: isEmbedded ? 11.5 : 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tab === 'shop' ? theme.cardBg : 'transparent',
                    color: theme.textColor,
                    boxShadow: tab === 'shop' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Shop ({products.length})
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Links */}
          {tab === 'links' && (
            <div style={{ marginTop: isEmbedded ? 16 : 24, display: 'flex', flexDirection: 'column', gap: isEmbedded ? 8 : 12 }}>
              {buttonLinks.map((link) => {
                const isPressed = pressedId === link.id
                const embedInfo = getMediaEmbedInfo(link.url)
                const isEmbedStyle = link.style === 'embed' || (embedInfo && link.style !== 'button' && link.style !== 'icon')

                if (isEmbedStyle && embedInfo) {
                  return (
                    <MediaEmbedCard
                      key={link.id}
                      link={link}
                      theme={theme}
                      btnStyle={btnStyle}
                      isEmbedded={isEmbedded}
                      onMediaClick={handleLinkClick}
                    />
                  )
                }

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleLinkClick(link, e)}
                    onMouseDown={() => setPressedId(link.id)}
                    onMouseUp={() => setPressedId(null)}
                    onMouseLeave={() => setPressedId(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isEmbedded ? 9 : 12,
                      borderRadius: btnStyle.borderRadius,
                      border: btnStyle.border,
                      boxShadow: btnStyle.boxShadow,
                      background:
                        btnStyle.effect === 'glass'
                          ? 'rgba(255, 255, 255, 0.15)'
                          : btnStyle.effect === 'minimal'
                          ? 'transparent'
                          : theme.buttonBg || 'rgba(0,0,0,0.03)',
                      backdropFilter: btnStyle.backdropFilter || 'none',
                      WebkitBackdropFilter: btnStyle.backdropFilter || 'none',
                      padding: isEmbedded ? '10px 12px' : '14px 16px',
                      textDecoration: 'none',
                      color: theme.textColor,
                      transform: isPressed ? 'scale(0.97)' : 'scale(1)',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: isEmbedded ? 28 : 36,
                        height: isEmbedded ? 28 : 36,
                        borderRadius: btnStyle.borderRadius > 20 ? '50%' : 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: tint,
                        color: color,
                      }}
                    >
                      {getSocialIcon(link.label, color, isEmbedded ? 15 : 18)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: isEmbedded ? 12 : 14.5,
                          fontWeight: 600,
                          color: theme.textColor,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {link.label}
                      </span>
                    </span>
                    <span style={{ color: color, fontSize: isEmbedded ? 12 : 15, fontWeight: 700 }}>↗</span>
                  </a>
                )
              })}

              {buttonLinks.length === 0 && topIcons.length === 0 && bottomIcons.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: theme.subTextColor, fontSize: 13 }}>
                  No links added yet.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Shop & Storefront */}
          {tab === 'shop' && (
            <div style={{ marginTop: isEmbedded ? 14 : 22, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isEmbedded ? 8 : 12 }}>
              {products.map((p) => (
                <a
                  key={p.id}
                  href={p.external_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    borderRadius: btnStyle.borderRadius > 20 ? 18 : btnStyle.borderRadius,
                    border: btnStyle.border,
                    background: theme.buttonBg || 'rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: tint,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: isEmbedded ? 20 : 28 }}>🛍️</span>
                    )}
                  </div>
                  <div style={{ padding: isEmbedded ? '7px 8px' : '10px 12px' }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isEmbedded ? 11 : 13,
                        fontWeight: 600,
                        color: theme.textColor,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: isEmbedded ? 11 : 13, color: color, fontWeight: 700 }}>
                        {p.price || 'Free'}
                      </span>
                      <span style={{ fontSize: 10, color: '#fff', background: color, borderRadius: 100, padding: '2px 6px', fontWeight: 600 }}>
                        Buy
                      </span>
                    </div>
                  </div>
                </a>
              ))}
              {products.length === 0 && (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: theme.subTextColor, fontSize: 13, padding: '20px 0' }}>
                  No products in store yet.
                </p>
              )}
            </div>
          )}

          {/* Direct WhatsApp / Inquiry Lead Box */}
          <InquiryCard profile={profile} links={links} theme={theme} isEmbedded={isEmbedded} />

          {/* Bottom Social Icons Row */}
          {bottomIcons.length > 0 && tab === 'links' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: isEmbedded ? 14 : 20 }}>
              {bottomIcons.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => handleLinkClick(link, e)}
                  style={{
                    width: isEmbedded ? 32 : 40,
                    height: isEmbedded ? 32 : 40,
                    borderRadius: '50%',
                    background: tint,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  {getSocialIcon(link.label, color, isEmbedded ? 15 : 18)}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Branding Footer */}
        <div
          style={{
            marginTop: isEmbedded ? 12 : 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: isEmbedded ? 10.5 : 12,
            color: theme.subTextColor,
          }}
        >
          <span style={{ fontWeight: 600 }}>
            <span style={{ color: theme.textColor }}>Link</span>
            <span style={{ color }}>Socio</span>
          </span>
          <span>·</span>
          <span>Build your audience</span>
        </div>
      </div>

      {/* QR Code Modal for Visitors & Live Preview */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(5px)',
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: '28px 24px',
              maxWidth: 340,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
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

            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
              Scan QR Code
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#64748B' }}>
              Open <strong>@{profile?.username}</strong> on your phone camera
            </p>

            {publicQrUrl ? (
              <div
                style={{
                  background: '#F8FAFA',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 14,
                  display: 'inline-block',
                  margin: '0 auto 16px',
                }}
              >
                <img
                  src={publicQrUrl}
                  alt={`QR code for ${profile?.username}`}
                  style={{ width: 190, height: 190, display: 'block', borderRadius: 6 }}
                />
              </div>
            ) : (
              <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
                Generating QR code...
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publicQrUrl && (
                <a
                  href={publicQrUrl}
                  download={`linksocio-${profile?.username}-qr.png`}
                  style={{
                    display: 'block',
                    background: '#0F172A',
                    color: 'white',
                    borderRadius: 12,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  📥 Save QR Image
                </a>
              )}
              <button
                onClick={() => {
                  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
                  navigator.clipboard.writeText(`${currentOrigin}/${profile?.username}`)
                  try {
                    confetti({ particleCount: 30, spread: 40 })
                  } catch (e) {}
                  setShowQrModal(false)
                }}
                style={{
                  background: '#F1F5F9',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 16px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📋 Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Pass Modal */}
      {showWalletModal && (
        <WalletPassModal
          profile={profile}
          qrUrl={publicQrUrl}
          whatsappPhone={whatsappLink?.url?.match(/(\d{6,15})/)?.[1] || ''}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      <style>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-gradient-bg {
          animation: gradientAnimation 12s ease infinite !important;
        }
      `}</style>
    </div>
  )
}
