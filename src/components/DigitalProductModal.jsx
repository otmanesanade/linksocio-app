import React, { useState, useEffect } from 'react'
import { DIGITAL_CATEGORIES } from '../ShopTab'
import confetti from 'canvas-confetti'
import { downloadFile, sanitizeFileUrl, getCleanDownloadName } from '../utils/fileDownload'

export default function DigitalProductModal({ product, profile, theme, onClose, isEmbedded = false }) {
  const [payTab, setPayTab] = useState('card') // 'card' | 'direct' | 'whatsapp'
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [processing, setProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [downloadBlobUrl, setDownloadBlobUrl] = useState(null)
  const [downloadFileName, setDownloadFileName] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [sellerPayoutSettings, setSellerPayoutSettings] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [transferReference, setTransferReference] = useState('')
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = (text, key) => {
    if (!text) return
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(String(text))
      } else {
        const ta = document.createElement('textarea')
        ta.value = String(text)
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (e) {}
  }

  if (!product) return null

  const color = theme?.accent || '#14B8A6'
  const categoryObj = DIGITAL_CATEGORIES.find((c) => c.id === product.category) || {
    id: 'file',
    label: 'Digital Product',
    icon: '📦',
    color: color,
    bg: `${color}15`,
  }

  const priceStr = String(product.price || '').trim().toLowerCase()
  const isFree =
    !priceStr ||
    priceStr.includes('free') ||
    priceStr.includes('gratuit') ||
    priceStr === '0' ||
    priceStr === '0.00' ||
    priceStr === '0,00' ||
    /^0\s*(dh|mad|€|\$|usd|eur)?$/i.test(priceStr)

  const username = profile?.username || ''
  const userId = profile?.id || ''

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('order_success') === 'true') {
        setOrderSuccess({
          success: true,
          method: 'card_stripe',
          product,
        })
      }
    }
  }, [product])

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
    setPaymentError(null)

    try {
      // 1. First try creating a real Stripe Checkout Session with 9% LinkSocio Platform Fee
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const profilePath = username ? `/${username.replace(/^@+/, '')}` : ''
      const successRedirectUrl = `${origin}${profilePath}?order_success=true&prod_id=${product.id}`

      const stripeRes = await fetch('/api/stripe/create-product-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product,
          buyerName: buyerName || 'Customer',
          buyerEmail: buyerEmail || 'customer@linksocio.com',
          stripeAccountId: sellerPayoutSettings?.stripeAccountId,
          successUrl: successRedirectUrl,
          cancelUrl: window.location.href,
        }),
      })

      if (stripeRes.ok) {
        const stripeData = await stripeRes.json()
        if (stripeData.configured && stripeData.url) {
          // Redirect buyer to Stripe Checkout (Supports Apple Pay, Google Pay, Visa, Mastercard)
          if (window.top) {
            window.top.location.href = stripeData.url
          } else {
            window.location.href = stripeData.url
          }
          return
        }

        // If Stripe returned an error or configuration notice
        if (stripeData.error) {
          setPaymentError(stripeData.error)
          setProcessing(false)
          return
        }
      }

      setPaymentError('Unable to initialize Stripe payment. Please check your connection or try another payment method.')
    } catch (err) {
      console.error('Card payment error:', err)
      setPaymentError(err.message || 'Payment service error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDirectTransferPayment = async (e) => {
    if (e) e.preventDefault()
    if (!buyerPhone && !buyerEmail && !buyerName) {
      alert('Veuillez renseigner votre Nom et Numéro WhatsApp / Téléphone pour recevoir votre commande.')
      return
    }
    setProcessing(true)

    try {
      const pMethod = sellerPayoutSettings?.payoutMethod || 'bank_transfer_iban'
      const res = await fetch('/api/payouts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product,
          buyer: {
            name: buyerName || 'Client Virement',
            email: buyerEmail || '',
            phone: buyerPhone || '',
            reference: transferReference || '',
          },
          paymentMethod: pMethod,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
        } catch (err) {}
        setOrderSuccess({
          ...json,
          isPendingVerification: json.isPendingVerification !== false,
          method: pMethod,
        })
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

    const rawTarget = product.file_url || product.external_url || ''
    const targetFile = sanitizeFileUrl(rawTarget)
    if (!targetFile) {
      alert('Your digital content is ready! Accessing instant download link.')
      return
    }

    setDownloading(true)
    setDownloadError(null)

    try {
      const fileName = getCleanDownloadName(product.name, product.file_name)
      const res = await downloadFile(targetFile, fileName)
      if (res?.blobUrl) {
        setDownloadBlobUrl(res.blobUrl)
        setDownloadFileName(res.fileName || fileName)
      }
    } catch (err) {
      console.error('Download error:', err)
      setDownloadError(err.message || 'Failed to download file directly')
      // Fallback: if it's an external link or server endpoint, try direct navigation
      if (!targetFile.startsWith('data:')) {
        window.open(targetFile, '_blank')
      }
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
            (() => {
              const isPending =
                orderSuccess.isPendingVerification ||
                orderSuccess.transaction?.status === 'pending_verification' ||
                orderSuccess.transaction?.status === 'pending_settlement'

              const txId = orderSuccess.transaction?.id || 'CMD_' + Date.now().toString().slice(-6)
              const cleanSellerPhone = (sellerPhone || '').replace(/[^\d+]/g, '')
              const waMessage = [
                `👋 Bonjour, je viens d'effectuer le virement bancaire pour commander : *${product.name}*`,
                `💰 *Montant :* ${product.price}`,
                `🔖 *Réf Commande :* ${txId}`,
                buyerName ? `👤 *Mon Nom :* ${buyerName}` : null,
                buyerPhone ? `📱 *Mon WhatsApp :* ${buyerPhone}` : null,
                transferReference ? `📑 *Réf Virement :* ${transferReference}` : null,
                '',
                '📎 Je vous joins ci-dessous mon reçu de virement bancaire pour débloquer mon lien de téléchargement. Merci !',
              ]
                .filter(Boolean)
                .join('\n')

              const waReceiptUrl = cleanSellerPhone
                ? `https://wa.me/${cleanSellerPhone.replace(/^\+/, '')}?text=${encodeURIComponent(waMessage)}`
                : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`

              if (isPending) {
                return (
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: 16,
                      padding: '18px 16px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          background: '#FEF3C7',
                          color: '#D97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          fontWeight: 800,
                        }}
                      >
                        ⏳
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#92400E' }}>
                        Demande de Virement Enregistrée
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          background: '#FDE68A',
                          color: '#78350F',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          marginTop: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        En attente de réception du virement
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 12.5, color: '#78350F', lineHeight: 1.5 }}>
                      Votre commande pour <strong>{product.name}</strong> a bien été créée.
                      <br />
                      <strong>Le lien de téléchargement direct est sécurisé</strong> et vous sera transmis dès confirmation du virement par le vendeur.
                    </p>

                    {/* Order Reference & Bank summary */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FCD34D',
                        borderRadius: 12,
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Réf Commande :</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>{txId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(txId, 'txId')}
                            style={{
                              background: '#F1F5F9',
                              border: 'none',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 10.5,
                              cursor: 'pointer',
                              fontWeight: 700,
                              color: '#334155',
                            }}
                          >
                            {copiedKey === 'txId' ? '✓ Copié' : 'Copier'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Montant à virer :</span>
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: 13 }}>{product.price}</span>
                      </div>

                      {sellerPayoutSettings?.bankName && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Banque :</span>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{sellerPayoutSettings.bankName}</span>
                        </div>
                      )}

                      {(sellerPayoutSettings?.iban || sellerPayoutSettings?.moroccoRib) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>
                            {sellerPayoutSettings.iban ? 'IBAN :' : 'RIB :'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11, color: '#0F172A' }}>
                              {sellerPayoutSettings.iban || sellerPayoutSettings.moroccoRib}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(sellerPayoutSettings.iban || sellerPayoutSettings.moroccoRib, 'bankNum')}
                              style={{
                                background: '#F1F5F9',
                                border: 'none',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: 10.5,
                                cursor: 'pointer',
                                fontWeight: 700,
                                color: '#334155',
                              }}
                            >
                              {copiedKey === 'bankNum' ? '✓ Copié' : 'Copier'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Action Button */}
                    <a
                      href={waReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#16A34A',
                        color: '#FFFFFF',
                        padding: '12px 14px',
                        borderRadius: 12,
                        fontWeight: 800,
                        fontSize: 13.5,
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                      }}
                    >
                      <span>📲 Envoyer le reçu sur WhatsApp (Validation Rapide)</span>
                    </a>

                    <div style={{ fontSize: 11, color: '#92400E', fontStyle: 'italic' }}>
                      🔒 Dès que le créateur confirme la réception de votre virement, vous recevrez l'accès complet et immédiat à votre Ebook.
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#78350F',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: 2,
                      }}
                    >
                      Fermer la fenêtre
                    </button>
                  </div>
                )
              }

              // Instant confirmed (Stripe Card payment or free product)
              return (
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginTop: 4 }}>
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
                          opacity: downloading ? 0.8 : 1,
                        }}
                      >
                        {downloading ? '⏳ Downloading File...' : `⚡ Download ${product.file_name ? `"${product.file_name}"` : 'Files'} Now ↗`}
                      </button>

                      {downloadBlobUrl && (
                        <a
                          href={downloadBlobUrl}
                          download={downloadFileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            background: '#047857',
                            color: '#FFFFFF',
                            padding: '10px 14px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 13,
                            textDecoration: 'none',
                          }}
                        >
                          📥 Direct Download Link ({downloadFileName})
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: '#047857', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
                  >
                    Close Window
                  </button>
                </div>
              )
            })()
          ) : isFree ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
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
                  opacity: downloading ? 0.8 : 1,
                }}
              >
                <span>{downloading ? '⏳ Downloading File...' : '⚡ Free Instant Access / Download'}</span>
              </button>

              {downloadBlobUrl && (
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #10B981',
                    borderRadius: 14,
                    padding: '12px 14px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>
                    ✓ File Ready for Download!
                  </div>
                  <a
                    href={downloadBlobUrl}
                    download={downloadFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: '#059669',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 13,
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    <span>📥 Click to Download File</span>
                  </a>
                  <div style={{ fontSize: 11, color: '#047857' }}>
                    {downloadFileName}
                  </div>
                </div>
              )}

              {downloadError && (
                <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#B91C1C', fontSize: 12 }}>
                  {downloadError}
                </div>
              )}
            </div>
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
                    padding: '7px 4px',
                    fontSize: 11,
                    fontWeight: payTab === 'card' ? 800 : 600,
                    color: payTab === 'card' ? '#635BFF' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  💳 Carte (Stripe)
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab('direct')}
                  style={{
                    background: payTab === 'direct' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '7px 4px',
                    fontSize: 11,
                    fontWeight: payTab === 'direct' ? 800 : 600,
                    color: payTab === 'direct' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'direct' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🏛️ CIH / Virement
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab('whatsapp')}
                  style={{
                    background: payTab === 'whatsapp' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '7px 4px',
                    fontSize: 11,
                    fontWeight: payTab === 'whatsapp' ? 800 : 600,
                    color: payTab === 'whatsapp' ? '#16A34A' : '#64748B',
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

                  {paymentError && (
                    <div
                      style={{
                        padding: '9px 12px',
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: 10,
                        color: '#991B1B',
                        fontSize: 11.5,
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠️ Payment Notice</div>
                      {paymentError}
                    </div>
                  )}
                </form>
              )}

              {/* TAB 2: DIRECT PAYMENT (CIH, Attijariwafa, Bank Transfer, IBAN) */}
              {payTab === 'direct' && (
                <form onSubmit={handleDirectTransferPayment} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '12px',
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>
                        🏛️ Coordonnées Bancaires (Virement)
                      </span>
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: 13 }}>
                        {product.price}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                      <span style={{ color: '#64748B' }}>Banque :</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>
                        {sellerPayoutSettings?.bankName || 'Virement Bancaire (CIH / Autre)'}
                      </span>
                    </div>

                    {(sellerPayoutSettings?.iban || sellerPayoutSettings?.moroccoRib) && (
                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                            {sellerPayoutSettings?.iban ? 'IBAN' : 'RIB BANCAIRE (24 CHIFFRES)'}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#0F172A' }}>
                            {sellerPayoutSettings?.iban || sellerPayoutSettings?.moroccoRib}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(sellerPayoutSettings?.iban || sellerPayoutSettings?.moroccoRib, 'tabBankNum')}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 700,
                            color: '#334155',
                          }}
                        >
                          {copiedKey === 'tabBankNum' ? '✓ Copié' : 'Copier'}
                        </button>
                      </div>
                    )}

                    {sellerPayoutSettings?.swiftBic && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                        <span style={{ color: '#64748B' }}>SWIFT / BIC :</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                          {sellerPayoutSettings.swiftBic}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                      <span style={{ color: '#64748B' }}>Titulaire du compte :</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>
                        {sellerPayoutSettings?.accountHolder || profile?.display_name || username}
                      </span>
                    </div>
                  </div>

                  {/* Buyer details inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      placeholder="Votre Nom & Prénom"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        borderRadius: 10,
                        border: '1px solid rgba(0,0,0,0.15)',
                        padding: '9px 12px',
                        fontSize: 12.5,
                        outline: 'none',
                      }}
                    />

                    <input
                      type="tel"
                      placeholder="Numéro WhatsApp / Téléphone (Obligatoire pour l'envoi)"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        borderRadius: 10,
                        border: '1px solid rgba(0,0,0,0.15)',
                        padding: '9px 12px',
                        fontSize: 12.5,
                        outline: 'none',
                      }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input
                        type="email"
                        placeholder="Email (Facultatif)"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          borderRadius: 10,
                          border: '1px solid rgba(0,0,0,0.15)',
                          padding: '9px 12px',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                      <input
                        placeholder="Réf Virement (Facultatif)"
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          borderRadius: 10,
                          border: '1px solid rgba(0,0,0,0.15)',
                          padding: '9px 12px',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4, background: '#F1F5F9', padding: '6px 10px', borderRadius: 8 }}>
                    🔒 <strong>Sécurité créateur :</strong> Le fichier n'est pas téléchargeable immédiatement. Vous pourrez envoyer votre reçu de virement pour validation rapide.
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    style={{
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      padding: '12px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{processing ? '⏳ Enregistrement...' : `✓ J'ai effectué le virement (${product.price})`}</span>
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
