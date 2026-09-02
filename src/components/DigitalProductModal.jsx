import React, { useState } from 'react'
import { DIGITAL_CATEGORIES } from '../ShopTab'
import CountryPhoneInput from './CountryPhoneInput'
import confetti from 'canvas-confetti'

export default function DigitalProductModal({ product, profile, theme, onClose, isEmbedded = false }) {
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [ordered, setOrdered] = useState(false)

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

  // Extract seller WhatsApp phone from links or profile
  const rawWa = profile?.whatsapp || ''
  const sellerPhone = rawWa.replace(/[^\d]/g, '') || '212600000000'

  const handleWhatsAppOrder = (e) => {
    if (e) e.preventDefault()

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
    } catch (err) {}

    const text = [
      `👋 *New Order Request: ${product.name}*`,
      `📦 *Product:* ${product.name}`,
      `💰 *Price:* ${product.price || 'N/A'}`,
      product.category ? `🏷️ *Type:* ${categoryObj.label}` : '',
      buyerName ? `👤 *Buyer Name:* ${buyerName}` : '',
      buyerPhone ? `📱 *Phone:* ${buyerPhone}` : '',
      buyerEmail ? `📧 *Email:* ${buyerEmail}` : '',
      '',
      `Hi! I would like to purchase this digital product. Could you please send me the payment details (CIH, Bank, PayPal...) and the download/access link? Thank you!`,
    ]
      .filter(Boolean)
      .join('\n')

    const waUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(text)}`

    // Log notification alert to seller
    const username = profile?.username || ''
    const userId = profile?.id || ''
    if (username || userId) {
      fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          type: 'inquiry',
          data: {
            title: `Digital Product Order: ${product.name}`,
            name: buyerName || 'Interested Buyer',
            phone: buyerPhone || 'Via WhatsApp',
            message: `Requested to buy "${product.name}" (${product.price}).`,
          },
        }),
      }).catch(() => {})
    }

    setOrdered(true)
    window.open(waUrl, '_blank')
  }

  const handleDirectDownload = () => {
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
    } catch (err) {}

    const targetUrl = product.file_url || product.external_url || '#'
    window.open(targetUrl, '_blank')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
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
          maxWidth: isEmbedded ? 300 : 420,
          width: '100%',
          maxHeight: '90vh',
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
            height: isEmbedded ? 140 : 180,
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
                borderRadius: 8,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              {categoryObj.icon} {categoryObj.label}
            </span>
            {product.original_price && (
              <span
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 7px',
                  borderRadius: 8,
                }}
              >
                🔥 SALE
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: isEmbedded ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Price & Title */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: isEmbedded ? 16 : 20, fontWeight: 800, color: color }}>
                {product.price || 'Free'}
              </span>
              {product.original_price && (
                <span style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'line-through' }}>
                  {product.original_price}
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: isEmbedded ? 14 : 16.5, fontWeight: 700, color: theme?.textColor || '#0F172A', lineHeight: 1.3 }}>
              {product.name}
            </h3>
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ margin: 0, fontSize: isEmbedded ? 11.5 : 13, color: theme?.subTextColor || '#64748B', lineHeight: 1.5 }}>
              {product.description}
            </p>
          )}

          {/* Key Highlights */}
          {Array.isArray(product.highlights) && product.highlights.length > 0 && (
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14,
                padding: '10px 12px',
              }}
            >
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ✨ What's Included:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {product.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: isEmbedded ? 11 : 12.5, fontWeight: 600 }}>
                    <span style={{ color: color, fontSize: 12 }}>✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button Section */}
          {product.delivery_type === 'download' || isFree ? (
            <button
              type="button"
              onClick={handleDirectDownload}
              style={{
                background: color,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 14,
                padding: '12px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 4px 14px ${color}40`,
                marginTop: 4,
              }}
            >
              <span>⚡ Download / Access Now</span>
            </button>
          ) : product.delivery_type === 'external' ? (
            <a
              href={product.external_url || product.file_url}
              target="_blank"
              rel="noreferrer"
              style={{
                background: color,
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: 14,
                padding: '12px',
                fontSize: 13.5,
                fontWeight: 700,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 4px 14px ${color}40`,
                marginTop: 4,
              }}
            >
              <span>🛒 Buy on Store ↗</span>
            </a>
          ) : (
            /* WhatsApp Direct Order Form */
            <form onSubmit={handleWhatsAppOrder} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ background: '#22C55E12', border: '1px solid #22C55E30', borderRadius: 12, padding: '8px 10px', fontSize: 11.5, color: '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💬</span>
                <span>Instant Order via WhatsApp · Fast delivery & direct payment</span>
              </div>

              <input
                placeholder="Your Name (Optional)"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  padding: '9px 12px',
                  fontSize: 12.5,
                  color: theme?.textColor || '#0F172A',
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                style={{
                  background: '#22C55E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                }}
              >
                <span>💬 Order & Get File on WhatsApp</span>
              </button>
            </form>
          )}

          {/* Safe Digital Guarantee footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>
            <span>🔒</span>
            <span>Instant Digital Delivery · Verified Creator</span>
          </div>
        </div>
      </div>
    </div>
  )
}
