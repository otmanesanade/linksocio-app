import { useState } from 'react'
import { getInquirySettings, recordLeadLocally } from '../InquiryTab'
import { dispatchServerAlert } from '../notificationService'
import CountryPhoneInput from './CountryPhoneInput'
import confetti from 'canvas-confetti'

export default function InquiryCard({ profile, links = [], theme, isEmbedded = false }) {
  const settings = getInquirySettings(profile)
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (!settings.enabled) return null

  // Determine recipient WhatsApp number
  let targetPhone = settings.whatsapp_number
  if (!targetPhone) {
    const cleanUsername = profile?.username || ''
    const storedPhone = (typeof window !== 'undefined' && cleanUsername && localStorage.getItem(`linksocio_contact_phone_${cleanUsername}`)) || ''
    let waSocialPhone = ''
    try {
      const storedSocials = typeof window !== 'undefined' && cleanUsername ? JSON.parse(localStorage.getItem(`linksocio_socials_${cleanUsername}`) || '[]') : []
      const waSocial = Array.isArray(storedSocials) ? storedSocials.find((s) => s.platformId === 'whatsapp' && s.active !== false) : null
      waSocialPhone = waSocial?.rawHandle?.replace(/[^0-9]/g, '') || ''
    } catch (e) {}

    const waLink = links.find(
      (l) => l.label?.toLowerCase().includes('whatsapp') || l.url?.includes('wa.me') || l.url?.includes('whatsapp.com')
    )
    if (waLink?.url) {
      const match = waLink.url.match(/(\d{6,15})/)
      if (match) targetPhone = match[1]
    }
    targetPhone = targetPhone || storedPhone || waSocialPhone || profile?.contact_phone || profile?.whatsapp || ''
  }

  const cleanTargetPhone = (targetPhone || '').replace(/[^0-9]/g, '')
  const color = theme.accent || '#14B8A6'
  const tint = theme.buttonBg || `${color}1A`

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!message.trim()) {
      setError('Please enter your message.')
      return
    }

    setError('')

    // 1. Record lead locally/database
    const targetProfile =
      profile ||
      (typeof window !== 'undefined' ? { username: window.location.pathname.replace(/^\//, '').split('/')[0] } : null)

    if (targetProfile) {
      const leadPayload = {
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim(),
      }
      recordLeadLocally(targetProfile, leadPayload)
      dispatchServerAlert('inquiry', leadPayload, targetProfile.username, targetProfile.id).catch(() => {})
    }

    // 2. Open WhatsApp if phone configured
    if (cleanTargetPhone) {
      const waText = `👋 Salam! New inquiry from your LinkSocio page:\n\n👤 *Name:* ${name.trim()}\n📞 *Contact:* ${phone.trim() || 'Not specified'}\n💬 *Message:* ${message.trim()}`
      const waUrl = `https://wa.me/${cleanTargetPhone}?text=${encodeURIComponent(waText)}`
      if (!isEmbedded) {
        window.open(waUrl, '_blank')
      }
    }

    try {
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } })
    } catch (e) {}

    setSubmitted(true)
    setTimeout(() => {
      setName('')
      setPhone('')
      setMessage('')
      setSubmitted(false)
      setIsOpen(false)
    }, 3500)
  }

  return (
    <div
      style={{
        marginTop: isEmbedded ? 14 : 20,
        background: theme.cardBg || 'white',
        border: `1px solid ${color}33`,
        borderRadius: isEmbedded ? 16 : 20,
        padding: isEmbedded ? '12px 14px' : '16px 18px',
        boxShadow: `0 4px 16px rgba(0,0,0,0.04)`,
        transition: 'all 0.2s ease',
        textAlign: 'left',
      }}
    >
      {/* Header Banner / Collapsible Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isEmbedded ? 8 : 10 }}>
          <div
            style={{
              width: isEmbedded ? 32 : 38,
              height: isEmbedded ? 32 : 38,
              borderRadius: '50%',
              background: '#22C55E',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isEmbedded ? 16 : 18,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
            }}
          >
            💬
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: isEmbedded ? 12 : 13.5,
                fontWeight: 700,
                color: theme.textColor,
                lineHeight: 1.2,
              }}
            >
              {settings.title}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: isEmbedded ? 10.5 : 11.5,
                color: theme.subTextColor,
                lineHeight: 1.2,
              }}
            >
              {settings.subtitle}
            </p>
          </div>
        </div>

        <div
          style={{
            width: isEmbedded ? 24 : 28,
            height: isEmbedded ? 24 : 28,
            borderRadius: '50%',
            background: tint,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isEmbedded ? 11 : 13,
            fontWeight: 700,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          ▼
        </div>
      </div>

      {/* Expandable Form Body */}
      {isOpen && (
        <div style={{ marginTop: isEmbedded ? 12 : 16, paddingTop: isEmbedded ? 10 : 14, borderTop: `1px solid ${color}20` }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: isEmbedded ? '12px 6px' : '16px 8px' }}>
              <div style={{ fontSize: isEmbedded ? 24 : 32, marginBottom: 4 }}>🎉</div>
              <p style={{ margin: 0, fontSize: isEmbedded ? 12.5 : 14, fontWeight: 700, color: '#22C55E' }}>
                Thank you! Message Sent
              </p>
              <p style={{ margin: '3px 0 0', fontSize: isEmbedded ? 10.5 : 12, color: theme.subTextColor }}>
                {cleanTargetPhone ? 'Opening WhatsApp chat to connect directly...' : 'Your inquiry has been received!'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isEmbedded ? 8 : 10 }}>
              <div>
                <input
                  type="text"
                  placeholder="Your Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: isEmbedded ? '7px 10px' : '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: isEmbedded ? 11.5 : 12.5,
                    fontFamily: 'inherit',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#0F172A',
                  }}
                />
              </div>

              <div>
                <CountryPhoneInput
                  value={phone}
                  onChange={(val) => setPhone(val)}
                  placeholder="WhatsApp or Phone Number (Optional)"
                  theme={theme}
                  isEmbedded={isEmbedded}
                />
              </div>

              <div>
                <textarea
                  rows={isEmbedded ? 2 : 3}
                  placeholder={settings.placeholder || 'Your inquiry or message... *'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: isEmbedded ? '7px 10px' : '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: isEmbedded ? 11.5 : 12.5,
                    fontFamily: 'inherit',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#0F172A',
                    resize: 'none',
                  }}
                />
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 11, color: '#EF4444' }}>
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                style={{
                  background: '#22C55E',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: isEmbedded ? '8px 12px' : '10px 16px',
                  fontSize: isEmbedded ? 11.5 : 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 2px 10px rgba(34, 197, 94, 0.28)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span>💬</span>
                <span>{settings.button_text || 'Send via WhatsApp'}</span>
              </button>

              {!cleanTargetPhone && (
                <p style={{ margin: 0, fontSize: 10, color: theme.subTextColor, textAlign: 'center' }}>
                  💡 Tip: The page owner can configure their WhatsApp number in Dashboard &gt; Messages.
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
