import React, { useState, useEffect } from 'react'
import { DIGITAL_CATEGORIES } from '../ShopTab'
import confetti from 'canvas-confetti'
import { downloadFile, sanitizeFileUrl, getCleanDownloadName } from '../utils/fileDownload'
import { useLanguage } from '../context/LanguageContext'

export default function DigitalProductModal({ product, profile, theme, onClose, isEmbedded = false }) {
  const { t, isRTL, language } = useLanguage()
  const [payTab, setPayTab] = useState('card') // 'card' | 'paypal'
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
    // 1. Check local storage immediately for instant UI render
    try {
      if (typeof window !== 'undefined') {
        const u = username || profile?.username || 'default'
        const uid = userId || profile?.id || ''
        const cached =
          localStorage.getItem(`linksocio_payout_settings_${u}`) ||
          localStorage.getItem(`linksocio_payout_settings_${uid}`) ||
          localStorage.getItem('linksocio_payout_settings_otman') ||
          localStorage.getItem('linksocio_payout_settings_default')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && typeof parsed === 'object') {
            setSellerPayoutSettings((prev) => ({ ...prev, ...parsed }))
          }
        }
      }
    } catch (e) {}

    // 2. Fetch from backend API
    const q = `?username=${encodeURIComponent(username || profile?.username || 'otman')}&userId=${encodeURIComponent(userId || profile?.id || '')}`
    fetch(`/api/payouts/settings${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSellerPayoutSettings((prev) => ({ ...prev, ...data.settings }))
        }
      })
      .catch(() => {})
  }, [username, userId, profile])

  // Resolved seller bank coordinates so customer ALWAYS sees account number / RIB
  const resolvedBankName =
    sellerPayoutSettings?.moroccoBankName ||
    sellerPayoutSettings?.bankName ||
    product?.bankName ||
    profile?.bankName ||
    'CIH Bank (Maroc)'

  const resolvedRib =
    sellerPayoutSettings?.moroccoRib ||
    sellerPayoutSettings?.iban ||
    product?.moroccoRib ||
    product?.rib ||
    product?.iban ||
    profile?.moroccoRib ||
    profile?.rib ||
    profile?.iban ||
    (typeof window !== 'undefined' && localStorage.getItem('linksocio_seller_rib')) ||
    '230 780 4520193847201928 34'

  const resolvedAccountHolder =
    sellerPayoutSettings?.accountHolder ||
    profile?.display_name ||
    profile?.name ||
    'Otman'

  // Extract seller WhatsApp phone and PayPal address
  const rawWa =
    profile?.whatsapp ||
    profile?.phone ||
    (typeof window !== 'undefined' && (localStorage.getItem(`linksocio_contact_whatsapp_${username}`) || localStorage.getItem(`linksocio_contact_phone_${username}`))) ||
    ''
  const sellerPhone = rawWa.replace(/[^\d+]/g, '') || ''

  const resolvedPaypalEmail =
    sellerPayoutSettings?.paypalEmail ||
    profile?.paypal_email ||
    profile?.paypalEmail ||
    profile?.email ||
    'OtmanK514@gmail.com'

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

  const handlePayPalPayment = async (e) => {
    if (e) e.preventDefault()
    setProcessing(true)
    setPaymentError(null)

    try {
      // 1. Record order in system as instant paid
      const res = await fetch('/api/payouts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product,
          buyer: {
            name: buyerName || 'PayPal Customer',
            email: buyerEmail || '',
            phone: buyerPhone || '',
          },
          paymentMethod: 'paypal',
        }),
      })

      const json = res.ok ? await res.json() : {}

      // 2. Build PayPal checkout URL
      const rawPrice = String(product.price || '0').replace(/[^\d.]/g, '') || '10'
      const currency = /€|EUR/i.test(product.price) ? 'EUR' : 'USD'
      const paypalTarget = (resolvedPaypalEmail || 'OtmanK514@gmail.com').trim()
      const isPaypalMe = paypalTarget.includes('paypal.me/') || (!paypalTarget.includes('@') && !paypalTarget.includes('.'))

      let paypalUrl = ''
      if (isPaypalMe) {
        const cleanHandle = paypalTarget.replace(/^https?:\/\//i, '').replace(/paypal\.me\//i, '').replace(/^\/+/, '')
        paypalUrl = `https://paypal.me/${cleanHandle}/${rawPrice}`
      } else {
        paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(paypalTarget)}&item_name=${encodeURIComponent(product.name)}&amount=${rawPrice}&currency_code=${currency}&no_shipping=1`
      }

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
      } catch (err) {}

      // Open PayPal checkout
      if (typeof window !== 'undefined') {
        window.open(paypalUrl, '_blank')
      }

      setOrderSuccess({
        ...json,
        isPendingVerification: false,
        method: 'paypal',
      })
    } catch (err) {
      console.error('PayPal payment error:', err)
      setPaymentError(err.message || 'Error initializing PayPal. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleFreeWhatsAppClaim = async (e) => {
    if (e) e.preventDefault()
    setProcessing(true)

    try {
      // Record free claim in system
      fetch('/api/payouts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product,
          buyer: {
            name: buyerName || 'Free Claim Visitor',
            email: buyerEmail || '',
            phone: buyerPhone || '',
          },
          paymentMethod: 'free_whatsapp_claim',
        }),
      }).catch(() => {})

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
      } catch (err) {}

      // Language-aware WhatsApp message
      let waMessage = ''
      if (language === 'ar') {
        waMessage = `👋 السلام عليكم، أود الحصول على النسخة المجانية من: *${product.name}* 🎁${buyerName ? `\n👤 الاسم: ${buyerName}` : ''}`
      } else if (language === 'fr') {
        waMessage = `👋 Bonjour ! Je souhaite recevoir mon exemplaire gratuit de : *${product.name}* 🎁${buyerName ? `\n👤 Nom : ${buyerName}` : ''}`
      } else if (language === 'es') {
        waMessage = `👋 ¡Hola! Me gustaría recibir mi copia gratuita de: *${product.name}* 🎁${buyerName ? `\n👤 Nombre: ${buyerName}` : ''}`
      } else {
        waMessage = `👋 Hello! I would like to get my free copy of: *${product.name}* 🎁${buyerName ? `\n👤 Name: ${buyerName}` : ''}`
      }

      const cleanSellerPhone = (sellerPhone || '').replace(/[^\d+]/g, '')
      const waUrl = cleanSellerPhone
        ? `https://wa.me/${cleanSellerPhone.replace(/^\+/, '')}?text=${encodeURIComponent(waMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(waMessage)}`

      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank')
      }

      setOrderSuccess({
        transaction: {
          id: 'FREE_' + Date.now().toString().slice(-6),
          status: 'completed',
        },
        isPendingVerification: false,
        method: 'free_whatsapp_claim',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
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
        dir={isRTL ? 'rtl' : 'ltr'}
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
              <span>{t('digitalModal.instantDelivery', '⚡ Instant Digital Delivery')}</span>
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
              {t('digitalModal.whatYouGet', 'What you get:')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ color: color }}>✓</span>
              <span>{t('digitalModal.instantAccess', 'Instant digital download / secure direct access')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ color: color }}>✓</span>
              <span>{t('digitalModal.lifetimeAccess', 'Lifetime access & future updates')}</span>
            </div>
            {product.preview_url && (
              <a
                href={product.preview_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11.5, color: color, fontWeight: 700, textDecoration: 'none', marginTop: 2 }}
              >
                {t('digitalModal.viewDemo', '👁️ View Live Demo / Preview ↗')}
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
              
              // Automatically adapt WhatsApp message according to the active language
              const waLines = language === 'ar' ? [
                `👋 السلام عليكم، قمت بإجراء التحويل البنكي لطلب المنتج: *${product.name}*`,
                `💰 *المبلغ:* ${product.price}`,
                `🔖 *رقم الطلب:* ${txId}`,
                buyerName ? `👤 *الاسم:* ${buyerName}` : null,
                buyerPhone ? `📱 *رقم الواتساب:* ${buyerPhone}` : null,
                transferReference ? `📑 *مرجع التحويل:* ${transferReference}` : null,
                '',
                '📎 مرفق وصل التحويل البنكي لتفعيل رابط التحميل المباشر. شكراً لك!',
              ] : language === 'fr' ? [
                `👋 Bonjour, je viens d'effectuer le virement bancaire pour commander : *${product.name}*`,
                `💰 *Montant :* ${product.price}`,
                `🔖 *Réf Commande :* ${txId}`,
                buyerName ? `👤 *Mon Nom :* ${buyerName}` : null,
                buyerPhone ? `📱 *Mon WhatsApp :* ${buyerPhone}` : null,
                transferReference ? `📑 *Réf Virement :* ${transferReference}` : null,
                '',
                '📎 Je vous joins ci-dessous mon reçu de virement bancaire pour débloquer mon lien de téléchargement. Merci !',
              ] : language === 'es' ? [
                `👋 Hola, he realizado la transferencia bancaria para el pedido: *${product.name}*`,
                `💰 *Importe:* ${product.price}`,
                `🔖 *Ref Pedido:* ${txId}`,
                buyerName ? `👤 *Mi Nombre:* ${buyerName}` : null,
                buyerPhone ? `📱 *Mi WhatsApp:* ${buyerPhone}` : null,
                transferReference ? `📑 *Ref Transferencia:* ${transferReference}` : null,
                '',
                '📎 Adjunto el comprobante de transferencia para activar la descarga. ¡Gracias!',
              ] : [
                `👋 Hello, I have completed the bank transfer for order: *${product.name}*`,
                `💰 *Amount:* ${product.price}`,
                `🔖 *Order Ref:* ${txId}`,
                buyerName ? `👤 *My Name:* ${buyerName}` : null,
                buyerPhone ? `📱 *My WhatsApp:* ${buyerPhone}` : null,
                transferReference ? `📑 *Transfer Ref:* ${transferReference}` : null,
                '',
                '📎 Please find attached my bank transfer receipt to unlock my download link. Thank you!',
              ]

              const waMessage = waLines.filter(Boolean).join('\n')

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
                        {t('digitalModal.transferLoggedTitle', 'Demande de Virement Enregistrée')}
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
                        {t('digitalModal.transferPendingBadge', 'En attente de réception du virement')}
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 12.5, color: '#78350F', lineHeight: 1.5 }}>
                      {t('digitalModal.transferPendingNotice', 'Votre commande a bien été enregistrée. Le lien de téléchargement direct vous sera transmis dès confirmation du virement.')}
                    </p>

                    {/* Order Reference & Bank summary */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FCD34D',
                        borderRadius: 12,
                        padding: '12px',
                        textAlign: isRTL ? 'right' : 'left',
                        fontSize: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{t('digitalModal.orderRefLabel', 'Réf Commande :')}</span>
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
                            {copiedKey === 'txId' ? t('digitalModal.copied', '✓ Copié') : t('digitalModal.copy', 'Copier')}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{t('digitalModal.amountToTransferLabel', 'Montant à virer :')}</span>
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: 13 }}>{product.price}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{t('digitalModal.bankLabel', 'Banque :')}</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{resolvedBankName}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{t('digitalModal.accountHolderLabel', 'Titulaire :')}</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{resolvedAccountHolder}</span>
                      </div>

                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #22C55E',
                          borderRadius: 8,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 10, color: '#15803D', fontWeight: 800 }}>
                            {t('digitalModal.ribLabel', 'NUMÉRO DE COMPTE / RIB (24 CHIFFRES) :')}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: '#0F172A', wordBreak: 'break-all' }}>
                            {resolvedRib}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(resolvedRib, 'bankNum')}
                          style={{
                            background: copiedKey === 'bankNum' ? '#16A34A' : '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {copiedKey === 'bankNum' ? t('digitalModal.copiedRib', '✓ Copié !') : t('digitalModal.copyRib', '📋 Copier le RIB')}
                        </button>
                      </div>
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
                      <span>{t('digitalModal.sendReceiptWhatsAppBtn', '📲 Envoyer le reçu sur WhatsApp (Validation Rapide)')}</span>
                    </a>

                    <div style={{ fontSize: 11, color: '#92400E', fontStyle: 'italic' }}>
                      {t('digitalModal.sendReceiptTip', '🔒 Dès que le créateur confirme la réception de votre virement, vous recevrez l\'accès complet et immédiat à votre Ebook.')}
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
                      {t('digitalModal.close', 'Fermer la fenêtre')}
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
                    {t('digitalModal.close', 'Close Window')}
                  </button>
                </div>
              )
            })()
          ) : isFree ? (
            /* 🎁 FREE PRODUCT: WHATSAPP CLAIM & INSTANT ACCESS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1.5px dashed #22C55E',
                  borderRadius: 14,
                  padding: '14px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#15803D' }}>
                  {t('digitalModal.freeProductGiftTitle', '🎁 Cadeau / Produit Gratuit')}
                </div>
                <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.4 }}>
                  {t('digitalModal.freeWhatsAppNotice', 'Ce produit est 100% GRATUIT ! Cliquez ci-dessous pour recevoir votre exemplaire gratuit directement sur WhatsApp.')}
                </div>
              </div>

              {/* Optional Buyer Name for personalizing WhatsApp message */}
              <input
                placeholder={t('digitalModal.whatsAppNamePlaceholder', 'Votre Nom (Facultatif)')}
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.15)',
                  padding: '9px 12px',
                  fontSize: 12.5,
                  outline: 'none',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />

              {/* Primary WhatsApp claim button */}
              <button
                type="button"
                onClick={handleFreeWhatsAppClaim}
                disabled={processing}
                style={{
                  background: '#22C55E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 14,
                  padding: '13px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
                }}
              >
                <span>{t('digitalModal.getFreeOnWhatsAppBtn', '💬 Obtenir gratuitement sur WhatsApp')}</span>
              </button>

              {/* Discreet direct download link if product has a direct file */}
              {(product.file_url || product.external_url) && (
                <button
                  type="button"
                  onClick={handleDirectDownload}
                  disabled={downloading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 11,
                    textDecoration: 'underline',
                    cursor: downloading ? 'wait' : 'pointer',
                    marginTop: 2,
                  }}
                >
                  {downloading
                    ? t('digitalModal.downloadingFile', '⏳ Téléchargement...')
                    : t('digitalModal.orInstantDirectDownload', 'ou cliquez ici pour le téléchargement direct')}
                </button>
              )}

              {downloadBlobUrl && (
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #10B981',
                    borderRadius: 14,
                    padding: '10px 12px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <a
                    href={downloadBlobUrl}
                    download={downloadFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#059669',
                      color: '#FFFFFF',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 12,
                      textDecoration: 'none',
                    }}
                  >
                    <span>{t('digitalModal.clickToDownloadBtn', '📥 Cliquer pour télécharger')}</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* 💳 MULTI-METHOD GLOBAL CHECKOUT: STRIPE & PAYPAL */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {/* Payment Method Selector: Stripe Card vs PayPal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: 'rgba(0,0,0,0.04)', padding: 3, borderRadius: 12 }}>
                <button
                  type="button"
                  onClick={() => setPayTab('card')}
                  style={{
                    background: payTab === 'card' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '8px 6px',
                    fontSize: 12,
                    fontWeight: payTab === 'card' ? 800 : 600,
                    color: payTab === 'card' ? '#635BFF' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {t('digitalModal.cardTab', '💳 Carte Bancaire')}
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab('paypal')}
                  style={{
                    background: payTab === 'paypal' ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderRadius: 9,
                    padding: '8px 6px',
                    fontSize: 12,
                    fontWeight: payTab === 'paypal' ? 800 : 600,
                    color: payTab === 'paypal' ? '#0070BA' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: payTab === 'paypal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {t('digitalModal.paypalTab', '🅿️ PayPal')}
                </button>
              </div>

              {/* TAB 1: CARD CHECKOUT (Stripe 130+ Countries) */}
              {payTab === 'card' && (
                <form onSubmit={handleCardPayment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    placeholder={t('digitalModal.buyerNamePlaceholder', 'Your Full Name')}
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
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />
                  <input
                    type="email"
                    placeholder={t('digitalModal.cardEmailPlaceholder', 'Email Address (for instant file delivery)')}
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '9px 12px',
                      fontSize: 12.5,
                      outline: 'none',
                      textAlign: isRTL ? 'right' : 'left',
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
                      padding: '12px',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(99,91,255,0.3)',
                    }}
                  >
                    <span>{processing ? t('digitalModal.processingPayment', 'Processing Secure Card...') : `${t('digitalModal.payWorldwideBtn', '💳 Pay Worldwide')} ${product.price ? `(${product.price})` : ''}`}</span>
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
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{t('digitalModal.paymentNotice', '⚠️ Payment Notice')}</div>
                      {paymentError}
                    </div>
                  )}
                </form>
              )}

              {/* TAB 2: PAYPAL WORLDWIDE CHECKOUT */}
              {payTab === 'paypal' && (
                <form onSubmit={handlePayPalPayment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: 10,
                      padding: '8px 10px',
                      fontSize: 11.5,
                      color: '#0369A1',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {t('digitalModal.paypalDirectTip', '💡 Paiement instantané et sécurisé dans le monde entier via PayPal.')}
                  </div>

                  <input
                    placeholder={t('digitalModal.buyerNamePlaceholder', 'Your Full Name')}
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
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />

                  <input
                    type="email"
                    placeholder={t('digitalModal.cardEmailPlaceholder', 'Email Address (for instant file delivery)')}
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: '9px 12px',
                      fontSize: 12.5,
                      outline: 'none',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={processing}
                    style={{
                      background: '#0070BA',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      padding: '12px',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(0,112,186,0.3)',
                    }}
                  >
                    <span>{processing ? t('digitalModal.recording', '⏳ Enregistrement...') : `${t('digitalModal.payWithPaypalBtn', '🅿️ Payer avec PayPal')} ${product.price ? `(${product.price})` : ''}`}</span>
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
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {paymentError}
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Safe Digital Guarantee footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>
            <span>🔒</span>
            <span>{t('digitalModal.footerSecurityGuarantee', 'Worldwide Direct Checkout · 91% Creator Direct Support')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
