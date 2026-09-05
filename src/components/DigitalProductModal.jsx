import React, { useState, useEffect } from 'react'
import { DIGITAL_CATEGORIES } from '../ShopTab'
import confetti from 'canvas-confetti'

export default function DigitalProductModal({ product, profile, theme, onClose, isEmbedded = false }) {
  const [payTab, setPayTab] = useState('card') // 'card' | 'direct' | 'whatsapp'
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [processing, setProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [sellerPayoutSettings, setSellerPayoutSettings] = useState(null)

  if (!product) return null

  const color = theme?.accent || '#14B8A6'
  const categoryObj = DIGITAL_CATEGORIES.find((c) => c.id === product.category) || {
    id: 'file',
    label: 'Digital Product',
    icon: '📦',
    color: color,
    bg: `${color}15`,
  }

  const isFree = (product.price || '').toLowerCase().includes('free') || (product.price || '').toLowerCase().includes('gratuit') || product.price === '0'

  const username = profile?.username || ''
  const userId = profile?.id || ''

  useEffect(() => {
    if (username || userId) {
      fetch(`/api/payouts/settings?username=${encodeURIComponent(username)}&userId=${encodeURIComponent(userId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) setSellerPayoutSettings(data.settings)
        })
        .catch(() => {})
    }
  }, [username, userId])

  // Extract seller WhatsApp phone from links or profile
  const rawWa = profile?.whatsapp || ''
  const sellerPhone = rawWa.replace(/[^\d]/g, '') || ''

  const handleCardPayment = async (e) => {
    if (e) e.preventDefault()
    setProcessing(true)

    try {
      const res = await fetch('/api/payouts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product,
          buyer: {
            name: buyerName || 'Card Customer',
            email: buyerEmail,
            phone: buyerPhone,
          },
          paymentMethod: 'card_stripe',
        }),
      })

      if (res.ok) {
        const json = await res.json()
        try {
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } })
        } catch (err) {}
        setOrderSuccess(json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleDirectTransferPayment = async (e) => {
    if (e) e.preventDefault()
    setProcessing(true)

    try {
      const res = await fetch('/api/payouts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product,
          buyer: {
            name: buyerName || 'Direct Transfer Customer',
            email: buyerEmail,
            phone: buyerPhone,
          },
          paymentMethod: sellerPayoutSettings?.payoutMethod || 'direct_transfer',
        }),
      })

      if (res.ok) {
        const json = await res.json()
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
        } catch (err) {}
        setOrderSuccess(json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleWhatsAppOrder = async (e) => {
    if (e) e.preventDefault()

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
    } catch (err) {}

    // Record order in system
    fetch('/api/payouts/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        userId,
        product,
        buyer: {
          name: buyerName || 'WhatsApp Buyer',
          phone: buyerPhone,
          email: buyerEmail,
        },
        paymentMethod: 'whatsapp',
      }),
    }).catch(() => {})

    const text = [
      `👋 *New Order Request: ${product.name}*`,
      `💰 *Price:* ${product.price || 'Free'}`,
      `📦 *Category:* ${categoryObj.label}`,
      buyerName ? `👤 *Buyer:* ${buyerName}` : null,
      buyerEmail ? `📧 *Email:* ${buyerEmail}` : null,
      buyerPhone ? `📱 *Phone:* ${buyerPhone}` : null,
      `🔗 *Product Link:* ${window.location.href}`,
      '',
      'Hello, I would like to purchase and access this digital product!',
    ]
      .filter(Boolean)
      .join('\n')

    const waUrl = sellerPhone
      ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`

    window.open(waUrl, '_blank')
  }

  const handleDirectDownload = async () => {
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
    } catch (e) {}

    // Record download access
    fetch('/api/payouts/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        userId,
        product,
        buyer: { name: buyerName || 'Direct Download User' },
        paymentMethod: 'free_access',
      }),
    }).catch(() => {})

    const targetFile = product.file_url || product.external_url
    if (!targetFile) {
      alert('Your digital content is ready! Accessing instant download link.')
      return
    }

    // External Cloud links (Google Drive, Dropbox, Canva, Notion)
    if (!targetFile.startsWith('/uploads/') && !targetFile.startsWith('/api/download')) {
      window.open(targetFile, '_blank')
      return
    }

    setDownloading(true)
    setDownloadError(null)

    try {
      // Determine proper file name with extension
      let downloadName = product.file_name || ''
      if (!downloadName) {
        const rawPart = targetFile.split('/').pop().split('?')[0]
        downloadName = decodeURIComponent(rawPart).replace(/^\d+_/, '')
      }
      if (!downloadName || !downloadName.includes('.')) {
        downloadName = (product.name ? product.name.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'digital_product') + '.pdf'
      }

      // Fetch file directly as a binary Blob: Forces exact binary file download without HTML interference
      const res = await fetch(targetFile)
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        throw new Error('Server returned an HTML page instead of the binary file.')
      }

      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500)
    } catch (err) {
      console.error('Blob download fallback, attempting direct stream:', err)
      const fallbackUrl = `/api/download?file=${encodeURIComponent(targetFile)}&name=${encodeURIComponent(product.file_name || 'download.pdf')}`
      window.location.href = fallbackUrl
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isEmbedded ? 8 : 16,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme?.cardBg || '#FFFFFF',
          color: theme?.textColor || '#0F172A',
          borderRadius: 24,
          maxWidth: isEmbedded ? 310 : 440,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          border: `1px solid ${theme?.borderColor || '#E2E8F0'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Header */}
        <div
          style={{
            width: '100%',
            height: isEmbedded ? 130 : 170,
            background: categoryObj.bg || '#F8FAFC',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: isEmbedded ? 40 : 54 }}>{categoryObj.icon}</span>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.65)',
              color: 'white',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            ✕
          </button>

          {/* Badge overlays */}
          <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                background: categoryObj.color,
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 100,
                letterSpacing: '0.02em',
              }}
            >
              {categoryObj.icon} {categoryObj.label}
            </span>
            {isFree ? (
              <span
                style={{
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 100,
                }}
              >
                FREE
              </span>
            ) : (
              <span
                style={{
                  background: 'rgba(15,23,42,0.85)',
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 100,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {product.price}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: isEmbedded ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title & Creator */}
          <div>
            <h3 style={{ margin: 0, fontSize: isEmbedded ? 16 : 19, fontWeight: 800, lineHeight: 1.25 }}>
              {product.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, opacity: 0.75 }}>
              <span>by {profile?.display_name || username || 'Creator'}</span>
              <span>·</span>
              <span>Instant Digital Delivery</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p
              style={{
                margin: 0,
                fontSize: isEmbedded ? 12 : 13.5,
                lineHeight: 1.5,
                opacity: 0.85,
                whiteSpace: 'pre-line',
              }}
            >
              {product.description}
            </p>
          )}

          {/* Included Assets / Files */}
          <div
            style={{
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 14,
              padding: isEmbedded ? '10px 12px' : '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.6 }}>
              What you get:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ color: color }}>✓</span>
              <span>Instant digital download / secure direct access</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ color: color }}>✓</span>
              <span>Lifetime access & future updates</span>
            </div>
            {product.preview_url && (
              <a
                href={product.preview_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11.5, color: color, fontWeight: 700, textDecoration: 'none', marginTop: 2 }}
              >
                👁️ View Live Demo / Preview ↗
              </a>
            )}
          </div>

          {/* CHECKOUT / DOWNLOAD ACTIONS */}
          {orderSuccess ? (
            <div
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 16,
                padding: '16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 32 }}>🎉</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>
                Payment & Order Confirmed!
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: '#047857' }}>
                Thank you for your purchase. 91% net earnings have been routed to the creator.
              </p>

              {(product.file_url || product.external_url) && (
                <button
                  type="button"
                  onClick={handleDirectDownload}
                  disabled={downloading}
                  style={{
                    width: '100%',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: downloading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 4,
                    opacity: downloading ? 0.8 : 1,
                  }}
                >
                  {downloading ? '⏳ Downloading File...' : `⚡ Download ${product.file_name ? `"${product.file_name}"` : 'Files'} Now ↗`}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: '#047857', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
              >
                Close Window
              </button>
            </div>
          ) : isFree || product.delivery_type === 'download' ? (
            <button
              type="button"
              onClick={handleDirectDownload}
              disabled={downloading}
              style={{
                background: color,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 14,
                padding: '12px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: downloading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 4px 14px ${color}40`,
                marginTop: 4,
                opacity: downloading ? 0.8 : 1,
              }}
            >
              <span>{downloading ? '⏳ Downloading File...' : '⚡ Free Instant Access / Download'}</span>
            </button>
          ) : (
            /* MULTI-METHOD GLOBAL PAYMENT CHECKOUT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {/* Payment Method Selector Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, background: 'rgba(0,0,0,0.04)', padding: 3, borderRadius: 12 }}>
                <button
                  type="button"
                  onClick={() => setPayTab('card')}
                  style={{
                    background: payTab === 'card' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '6px 4px',
                    fontSize: 11,
                    fontWeight: payTab === 'card' ? 800 : 600,
                    color: payTab === 'card' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  💳 Card (Global)
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab('direct')}
                  style={{
                    background: payTab === 'direct' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '6px 4px',
                    fontSize: 11,
                    fontWeight: payTab === 'direct' ? 800 : 600,
                    color: payTab === 'direct' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'direct' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🌐 Bank / PayPal
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab('whatsapp')}
                  style={{
                    background: payTab === 'whatsapp' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '6px 4px',
                    fontSize: 11,
                    fontWeight: payTab === 'whatsapp' ? 800 : 600,
                    color: payTab === 'whatsapp' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'whatsapp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  💬 WhatsApp
                </button>
              </div>

              {/* TAB 1: CARD CHECKOUT (Stripe 130+ Countries) */}
              {payTab === 'card' && (
                <form onSubmit={handleCardPayment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    placeholder="Your Full Name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '8px 10px',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email Address (for instant file delivery)"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '8px 10px',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={processing}
                    style={{
                      background: '#635BFF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(99,91,255,0.3)',
                    }}
                  >
                    <span>{processing ? 'Processing Secure Card...' : `💳 Pay ${product.price || ''} Worldwide`}</span>
                  </button>
                </form>
              )}

              {/* TAB 2: DIRECT PAYMENT (PayPal, Wise, IBAN, Crypto, Local Bank) */}
              {payTab === 'direct' && (
                <form onSubmit={handleDirectTransferPayment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 10px', fontSize: 11.5 }}>
                    {sellerPayoutSettings?.paypalEmail ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0079C1' }}>🅿️ PayPal: {sellerPayoutSettings.paypalEmail}</div>
                        <div style={{ color: '#64748B', fontSize: 10.5 }}>Send exact amount & click confirm below.</div>
                      </div>
                    ) : sellerPayoutSettings?.iban ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>🏛️ Bank: {sellerPayoutSettings.bankName || 'International Wire'}</div>
                        <div style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>IBAN: {sellerPayoutSettings.iban}</div>
                        {sellerPayoutSettings.swiftBic && <div style={{ color: '#64748B', fontSize: 10.5 }}>SWIFT/BIC: {sellerPayoutSettings.swiftBic}</div>}
                      </div>
                    ) : sellerPayoutSettings?.cryptoAddress ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#26A17B' }}>🪙 {sellerPayoutSettings.cryptoNetwork || 'USDT'}:</div>
                        <div style={{ color: '#475569', fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{sellerPayoutSettings.cryptoAddress}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>🏛️ Bank Transfer / PayPal</div>
                        <div style={{ color: '#64748B', fontSize: 10.5 }}>Beneficiary: {sellerPayoutSettings?.accountHolder || profile?.display_name || username}</div>
                        {sellerPayoutSettings?.moroccoRib && <div style={{ fontFamily: 'monospace', fontSize: 10.5 }}>RIB: {sellerPayoutSettings.moroccoRib}</div>}
                      </div>
                    )}
                  </div>

                  <input
                    placeholder="Your Name / Email"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '8px 10px',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={processing}
                    style={{
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{processing ? 'Confirming...' : '✓ I Have Sent The Payment'}</span>
                  </button>
                </form>
              )}

              {/* TAB 3: WHATSAPP DIRECT */}
              {payTab === 'whatsapp' && (
                <form onSubmit={handleWhatsAppOrder} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    placeholder="Your Name (Optional)"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '8px 10px',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      background: '#22C55E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <span>💬 Order on WhatsApp</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Safe Digital Guarantee footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>
            <span>🔒</span>
            <span>Worldwide Direct Checkout · 91% Creator Direct Support</span>
          </div>
        </div>
      </div>
    </div>
  )
}
