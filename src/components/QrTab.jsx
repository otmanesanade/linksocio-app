import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'

const QR_COLOR_PRESETS = [
  { label: 'Jet Black', dark: '#0F172A', light: '#FFFFFF', name: 'Classic' },
  { label: 'Royal Teal', dark: '#0D9488', light: '#F0FDFA', name: 'Teal' },
  { label: 'Midnight Blue', dark: '#1E3A8A', light: '#EFF6FF', name: 'Navy' },
  { label: 'Royal Indigo', dark: '#4338CA', light: '#EEF2FF', name: 'Indigo' },
  { label: 'Emerald Green', dark: '#047857', light: '#ECFDF5', name: 'Emerald' },
  { label: 'Crimson Red', dark: '#BE123C', light: '#FFF1F2', name: 'Crimson' },
  { label: 'Sunset Bronze', dark: '#9A3412', light: '#FFF7ED', name: 'Bronze' },
  { label: 'Luxury Violet', dark: '#6D28D9', light: '#F5F3FF', name: 'Violet' },
  { label: 'Inverted Dark', dark: '#FFFFFF', light: '#0F172A', name: 'Dark Mode' },
]

export default function QrTab({ profile }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [selectedColorIdx, setSelectedColorIdx] = useState(0)
  const [customDarkColor, setCustomDarkColor] = useState('#0F172A')
  const [customLightColor, setCustomLightColor] = useState('#FFFFFF')
  const [isCustomColor, setIsCustomColor] = useState(false)
  const [showCenterLogo, setShowCenterLogo] = useState(true)
  const [centerLogoType, setCenterLogoType] = useState('avatar') // 'avatar' | 'brand' | 'initials'
  const [frameStyle, setFrameStyle] = useState('card') // 'clean' | 'card' | 'standee'
  const [qrSize, setQrSize] = useState(800) // Resolution for download

  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const profileUrl = `${currentOrigin}/${profile?.username || ''}`

  const activeDark = isCustomColor ? customDarkColor : QR_COLOR_PRESETS[selectedColorIdx].dark
  const activeLight = isCustomColor ? customLightColor : QR_COLOR_PRESETS[selectedColorIdx].light

  // Generate QR code onto canvas
  useEffect(() => {
    let isCancelled = false

    async function drawQrCode() {
      const canvas = previewCanvasRef.current
      if (!canvas) return

      const displaySize = 300

      // Render base QR code
      try {
        await QRCode.toCanvas(canvas, profileUrl, {
          width: displaySize,
          margin: 2,
          errorCorrectionLevel: 'H', // High error correction permits up to 30% center overlay
          color: {
            dark: activeDark,
            light: activeLight,
          },
        })

        if (isCancelled) return

        // Render Center Logo/Avatar if enabled
        if (showCenterLogo) {
          const ctx = canvas.getContext('2d')
          const center = displaySize / 2
          const logoSize = displaySize * 0.22 // ~66px

          // Draw backdrop circle
          ctx.save()
          ctx.beginPath()
          ctx.arc(center, center, logoSize / 2 + 5, 0, Math.PI * 2)
          ctx.fillStyle = activeLight
          ctx.fill()
          ctx.lineWidth = 2.5
          ctx.strokeStyle = activeDark
          ctx.stroke()
          ctx.restore()

          // Draw Avatar or Initials or Brand icon
          if (centerLogoType === 'avatar' && profile?.avatar_url) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              if (isCancelled) return
              ctx.save()
              ctx.beginPath()
              ctx.arc(center, center, logoSize / 2, 0, Math.PI * 2)
              ctx.clip()
              ctx.drawImage(img, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize)
              ctx.restore()
            }
            img.onerror = () => {
              // Fallback to initials if avatar fails to load
              drawInitials(ctx, center, logoSize)
            }
            img.src = profile.avatar_url
          } else if (centerLogoType === 'brand') {
            // Draw sleek LinkSocio 'S' monogram
            drawBrandIcon(ctx, center, logoSize)
          } else {
            drawInitials(ctx, center, logoSize)
          }
        }
      } catch (err) {
        console.error('Failed to generate QR Code:', err)
      }
    }

    function drawInitials(ctx, center, size) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(center, center, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = activeDark
      ctx.fill()
      ctx.font = `bold ${Math.round(size * 0.46)}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = activeLight
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const initial = (profile?.display_name || profile?.username || 'L').charAt(0).toUpperCase()
      ctx.fillText(initial, center, center + 1)
      ctx.restore()
    }

    function drawBrandIcon(ctx, center, size) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(center, center, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = '#0F172A'
      ctx.fill()
      ctx.font = `bold ${Math.round(size * 0.44)}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = '#14B8A6'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('LS', center, center + 1)
      ctx.restore()
    }

    drawQrCode()

    return () => {
      isCancelled = true
    }
  }, [profileUrl, activeDark, activeLight, showCenterLogo, centerLogoType, profile?.avatar_url, profile?.display_name, profile?.username])

  // Download High-Resolution QR image
  const handleDownload = async (format = 'png') => {
    try {
      const renderSize = qrSize || 1024
      const offscreen = document.createElement('canvas')
      offscreen.width = renderSize
      offscreen.height = renderSize

      // Render high-res base
      await QRCode.toCanvas(offscreen, profileUrl, {
        width: renderSize,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: activeDark,
          light: activeLight,
        },
      })

      // If Center Logo enabled
      if (showCenterLogo) {
        const ctx = offscreen.getContext('2d')
        const center = renderSize / 2
        const logoSize = renderSize * 0.22

        ctx.save()
        ctx.beginPath()
        ctx.arc(center, center, logoSize / 2 + (renderSize * 0.015), 0, Math.PI * 2)
        ctx.fillStyle = activeLight
        ctx.fill()
        ctx.lineWidth = renderSize * 0.008
        ctx.strokeStyle = activeDark
        ctx.stroke()
        ctx.restore()

        if (centerLogoType === 'avatar' && profile?.avatar_url) {
          await new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              ctx.save()
              ctx.beginPath()
              ctx.arc(center, center, logoSize / 2, 0, Math.PI * 2)
              ctx.clip()
              ctx.drawImage(img, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize)
              ctx.restore()
              resolve()
            }
            img.onerror = () => {
              drawHighResInitials(ctx, center, logoSize)
              resolve()
            }
            img.src = profile.avatar_url
          })
        } else if (centerLogoType === 'brand') {
          drawHighResBrand(ctx, center, logoSize)
        } else {
          drawHighResInitials(ctx, center, logoSize)
        }
      }

      function drawHighResInitials(ctx, center, size) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(center, center, size / 2, 0, Math.PI * 2)
        ctx.fillStyle = activeDark
        ctx.fill()
        ctx.font = `bold ${Math.round(size * 0.46)}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = activeLight
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const initial = (profile?.display_name || profile?.username || 'L').charAt(0).toUpperCase()
        ctx.fillText(initial, center, center + 2)
        ctx.restore()
      }

      function drawHighResBrand(ctx, center, size) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(center, center, size / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#0F172A'
        ctx.fill()
        ctx.font = `bold ${Math.round(size * 0.44)}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = '#14B8A6'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('LS', center, center + 2)
        ctx.restore()
      }

      // If Frame style is "standee" or "card", we can render on a beautiful template card
      let finalCanvas = offscreen
      if (frameStyle === 'card' || frameStyle === 'standee') {
        const cardCanvas = document.createElement('canvas')
        const cardW = renderSize + 240
        const cardH = renderSize + 480
        cardCanvas.width = cardW
        cardCanvas.height = cardH
        const cCtx = cardCanvas.getContext('2d')

        // Background
        cCtx.fillStyle = '#FFFFFF'
        cCtx.fillRect(0, 0, cardW, cardH)

        // Subtle gradient top bar
        const grad = cCtx.createLinearGradient(0, 0, cardW, 0)
        grad.addColorStop(0, '#14B8A6')
        grad.addColorStop(1, '#0D9488')
        cCtx.fillStyle = grad
        cCtx.fillRect(0, 0, cardW, 16)

        // Draw QR Code centered
        const qrX = (cardW - renderSize) / 2
        const qrY = 120
        cCtx.drawImage(offscreen, qrX, qrY)

        // Text Branding
        cCtx.textAlign = 'center'
        cCtx.fillStyle = '#0F172A'
        cCtx.font = `bold ${Math.round(cardW * 0.055)}px system-ui, -apple-system, sans-serif`
        const titleText = profile?.display_name || `@${profile?.username || 'user'}`
        cCtx.fillText(titleText, cardW / 2, qrY + renderSize + 70)

        // Subtitle & Call to Action
        cCtx.fillStyle = '#64748B'
        cCtx.font = `500 ${Math.round(cardW * 0.034)}px system-ui, -apple-system, sans-serif`
        cCtx.fillText(`Scan with camera to connect`, cardW / 2, qrY + renderSize + 125)

        // URL footer
        cCtx.fillStyle = '#0D9488'
        cCtx.font = `600 ${Math.round(cardW * 0.03)}px system-ui, -apple-system, sans-serif`
        cCtx.fillText(`linksocio.com/${profile?.username}`, cardW / 2, qrY + renderSize + 175)

        finalCanvas = cardCanvas
      }

      const dataUrl = finalCanvas.toDataURL(`image/${format}`)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `linksocio-${profile?.username || 'profile'}-qr.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      try {
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } })
      } catch (e) {}
    } catch (err) {
      console.error('Download QR failed:', err)
    }
  }

  // Copy Profile Link
  function handleCopy() {
    navigator.clipboard.writeText(profileUrl)
    setCopiedLink(true)
    try {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } })
    } catch (e) {}
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Copy Canvas Image to Clipboard (if browser supports)
  async function handleCopyImage() {
    const canvas = previewCanvasRef.current
    if (!canvas || typeof ClipboardItem === 'undefined') return
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopiedImage(true)
        try {
          confetti({ particleCount: 30, spread: 40 })
        } catch (e) {}
        setTimeout(() => setCopiedImage(false), 2000)
      })
    } catch (e) {
      console.warn('Clipboard write failed:', e)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E7EDEC',
          borderRadius: 20,
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E6F7F5', padding: '4px 12px', borderRadius: 100, marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>🎨</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488' }}>QR CODE STUDIO</span>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            Custom Branded QR Code
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', lineHeight: 1.5, maxWidth: 540 }}>
            Customize your QR code with your profile photo, brand colors, and printable frames. Perfect for business cards, storefronts, and marketing materials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              background: copiedLink ? '#E6F7F5' : '#F8FAFC',
              color: copiedLink ? '#0D9488' : '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{copiedLink ? '✓ Copied' : '📋 Copy URL'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Live Interactive QR Preview */}
        <div
          style={{
            background: 'white',
            border: '1px solid #E7EDEC',
            borderRadius: 24,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            position: 'sticky',
            top: 20,
          }}
        >
          {/* Card Presentation Frame */}
          <div
            style={{
              width: '100%',
              maxWidth: 320,
              background: frameStyle === 'standee' ? 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' : '#FFFFFF',
              border: frameStyle === 'clean' ? 'none' : '1px solid #E2E8F0',
              borderRadius: 24,
              padding: frameStyle === 'clean' ? 12 : '28px 20px 24px',
              boxShadow: frameStyle === 'clean' ? 'none' : '0 12px 32px -8px rgba(15,23,42,0.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {frameStyle === 'standee' && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#E6F7F5',
                  padding: '3px 10px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0D9488',
                  marginBottom: 12,
                }}
              >
                <span>SCAN ME</span>
              </div>
            )}

            {/* The QR Canvas */}
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                background: activeLight,
                padding: 10,
                border: `1px solid ${activeDark}15`,
                display: 'inline-flex',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                style={{
                  width: 250,
                  height: 250,
                  display: 'block',
                }}
              />
            </div>

            {frameStyle !== 'clean' && (
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                  {profile?.display_name || `@${profile?.username || 'user'}`}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>
                  linksocio.com/{profile?.username}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Downloads */}
          <div style={{ width: '100%', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => handleDownload('png')}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(15,23,42,0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📥</span>
              <span>Download High-Res QR (PNG)</span>
            </button>

            {typeof ClipboardItem !== 'undefined' && (
              <button
                onClick={handleCopyImage}
                style={{
                  width: '100%',
                  background: copiedImage ? '#E6F7F5' : '#F8FAFC',
                  color: copiedImage ? '#0D9488' : '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: '10px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>{copiedImage ? '✓ Image Copied!' : '🖼️ Copy Image to Clipboard'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Section 1: Center Logo & Photo */}
          <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Center Logo & Photo
                </h3>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
                  Embed your personal picture or brand mark in the center of the QR code.
                </p>
              </div>

              {/* Toggle switch */}
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showCenterLogo}
                  onChange={(e) => setShowCenterLogo(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: showCenterLogo ? '#14B8A6' : '#CBD5E1',
                    transition: '0.2s',
                    borderRadius: 24,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: 18,
                      width: 18,
                      left: showCenterLogo ? 22 : 3,
                      bottom: 3,
                      backgroundColor: 'white',
                      transition: '0.2s',
                      borderRadius: '50%',
                    }}
                  />
                </span>
              </label>
            </div>

            {showCenterLogo && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setCenterLogoType('avatar')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 14,
                    border: centerLogoType === 'avatar' ? '2px solid #14B8A6' : '1px solid #E2E8F0',
                    background: centerLogoType === 'avatar' ? '#F0FDFA' : '#FAFAFA',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : '#E2E8F0',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Profile Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCenterLogoType('brand')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 14,
                    border: centerLogoType === 'brand' ? '2px solid #14B8A6' : '1px solid #E2E8F0',
                    background: centerLogoType === 'brand' ? '#F0FDFA' : '#FAFAFA',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#0F172A',
                      color: '#14B8A6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    LS
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>LinkSocio Logo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCenterLogoType('initials')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 14,
                    border: centerLogoType === 'initials' ? '2px solid #14B8A6' : '1px solid #E2E8F0',
                    background: centerLogoType === 'initials' ? '#F0FDFA' : '#FAFAFA',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: activeDark,
                      color: activeLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Name Initials</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Color Themes */}
          <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '22px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              Color Palettes
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#64748B' }}>
              Select a color palette or enter custom hex codes with guaranteed high contrast.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {QR_COLOR_PRESETS.map((p, idx) => {
                const isSelected = !isCustomColor && selectedColorIdx === idx
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setIsCustomColor(false)
                      setSelectedColorIdx(idx)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #14B8A6' : '1px solid #E2E8F0',
                      background: isSelected ? '#F0FDFA' : '#FAFAFA',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: p.dark,
                        border: '1px solid rgba(0,0,0,0.1)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Custom Color Pickers */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => setIsCustomColor(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: isCustomColor ? '#0D9488' : '#64748B',
                }}
              >
                <span>{isCustomColor ? '● Custom Colors Active' : '○ Use Custom Hex Colors'}</span>
              </button>

              {isCustomColor && (
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0F172A', fontWeight: 600 }}>
                    Foreground:
                    <input
                      type="color"
                      value={customDarkColor}
                      onChange={(e) => setCustomDarkColor(e.target.value)}
                      style={{ width: 36, height: 32, padding: 0, border: '1px solid #CBD5E1', borderRadius: 6, cursor: 'pointer' }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0F172A', fontWeight: 600 }}>
                    Background:
                    <input
                      type="color"
                      value={customLightColor}
                      onChange={(e) => setCustomLightColor(e.target.value)}
                      style={{ width: 36, height: 32, padding: 0, border: '1px solid #CBD5E1', borderRadius: 6, cursor: 'pointer' }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Frame / Standee Style */}
          <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '22px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              Print & Frame Layout
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#64748B' }}>
              Select how your QR code will be displayed and framed when exported.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'card', name: 'Branded Card', desc: 'With name & handle' },
                { id: 'standee', name: 'Standee Poster', desc: 'Scan me badge' },
                { id: 'clean', name: 'Raw QR Code', desc: 'Square only' },
              ].map((f) => {
                const isSelected = frameStyle === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrameStyle(f.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #14B8A6' : '1px solid #E2E8F0',
                      background: isSelected ? '#F0FDFA' : '#FAFAFA',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{f.name}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748B' }}>{f.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4: Resolution & Printing Tips */}
          <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                  Export Resolution
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                  Ultra-sharp rendering for high DPI professional printing.
                </p>
              </div>

              <select
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value={600}>600 × 600 px (Web & Screen)</option>
                <option value={1024}>1024 × 1024 px (Standard Print)</option>
                <option value={2048}>2048 × 2048 px (Ultra HD Posters)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
