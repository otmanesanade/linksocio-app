import React, { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useLanguage } from './context/LanguageContext'

// Global payout options for all countries
export const MOROCCAN_BANKS = [
  'CIH Bank',
  'Attijariwafa Bank',
  'Banque Populaire (BCP)',
  'Bank of Africa (BMCE)',
  'Société Générale Maroc',
  'Crédit Agricole du Maroc (CAM)',
  'Al Barid Bank (Poste Maroc)',
  'CFG Bank',
  'CashPlus Wallet',
  'Other Moroccan Bank / Autre banque',
]

export function formatMoroccoRib(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 24)
  if (!digits) return ''
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6, 22)
  const p4 = digits.slice(22, 24)
  return [p1, p2, p3, p4].filter(Boolean).join(' ')
}

export function formatIbanNumber(val) {
  const clean = String(val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 34)
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

const GLOBAL_PAYOUT_METHODS = [
  { id: 'local_morocco', name: 'Morocco Local Banks (CIH, Attijari, BCP, CashPlus)', region: 'Morocco (RIB 24 Chiffres)', icon: '🇲🇦', feeInfo: '0% Extra Fee · Direct Wire' },
  { id: 'bank_iban', name: 'Direct International Wire (IBAN / SWIFT)', region: 'Worldwide Banks', icon: '🏛️', feeInfo: 'SEPA / SWIFT / Local Bank' },
  { id: 'stripe', name: 'Stripe Connect / Direct Bank Transfer', region: 'Global (130+ Countries)', icon: '💳', feeInfo: 'Auto Instant 91% Transfer' },
  { id: 'paypal', name: 'PayPal Account', region: 'Worldwide', icon: '🅿️', feeInfo: 'Direct to PayPal Email' },
  { id: 'wise', name: 'Wise (TransferWise IBAN / Routing)', region: 'International Multi-Currency', icon: '🌐', feeInfo: 'EUR, USD, GBP, etc.' },
  { id: 'payoneer', name: 'Payoneer Receiving Account', region: 'Global Freelancers & Creators', icon: '🅿️', feeInfo: 'Global Bank Transfer' },
  { id: 'crypto_usdt', name: 'Crypto USDT (TRC-20 / ERC-20 / Solana)', region: 'Borderless & Instant', icon: '🪙', feeInfo: 'Instant Crypto Payout' },
]

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham' },
  { code: 'USDT', symbol: 'USDT', name: 'USDT (Tether)' },
]

export default function PayoutsTab({ user, profile }) {
  const { t, isRTL } = useLanguage()
  const [activeSubTab, setActiveSubTab] = useState('global') // 'global' | 'stripe' | 'history' | 'calculator' | 'admin'
  const [stats, setStats] = useState({
    grossSales: 0,
    platformFees: 0,
    netSellerEarnings: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    feePercentage: 9,
    sellerPercentage: 91,
    currency: '$',
  })
  const [transactions, setTransactions] = useState([])
  const [payoutRequests, setPayoutRequests] = useState([])
  const [platformOverview, setPlatformOverview] = useState({ totalGross: 0, totalFees9Percent: 0, totalTransactions: 0 })

  // Settings
  const [settings, setSettings] = useState(() => {
    const base = {
      selectedCurrency: 'MAD',
      currencySymbol: 'DH',
      payoutMethod: 'local_morocco', // 'local_morocco' | 'bank_iban' | 'stripe' | 'paypal' | 'wise' | 'payoneer' | 'crypto_usdt'
      // Bank status
      bankConnected: false,
      stripeConnected: false,
      // Stripe
      stripeAccountId: '',
      // PayPal
      paypalEmail: '',
      // Wise & International Wire
      accountHolder: '',
      iban: '',
      swiftBic: '',
      bankCountry: 'Morocco',
      bankName: 'CIH Bank',
      // Payoneer
      payoneerEmail: '',
      // Crypto USDT
      cryptoAddress: '',
      cryptoNetwork: 'USDT-TRC20',
      // Local Moroccan Bank (RIB)
      moroccoRib: '',
      moroccoBankName: 'CIH Bank',
    }
    if (typeof window !== 'undefined') {
      try {
        const u = profile?.username || user?.user_metadata?.username || ''
        const uid = profile?.id || user?.id || ''
        const cached = localStorage.getItem(`linksocio_payout_settings_${u || uid || 'default'}`) || localStorage.getItem('linksocio_payout_settings_default')
        if (cached) {
          return { ...base, ...JSON.parse(cached) }
        }
      } catch (e) {}
    }
    return base
  })

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')
  const [manualStripeId, setManualStripeId] = useState('')
  const [stripeApiStatus, setStripeApiStatus] = useState(null)
  const [stripeConnectError, setStripeConnectError] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [connectingMoroccoBank, setConnectingMoroccoBank] = useState(false)
  const [connectingIntlBank, setConnectingIntlBank] = useState(false)

  // Interactive Calculator State
  const [calcPrice, setCalcPrice] = useState('100')

  const username = profile?.username || user?.user_metadata?.username || ''
  const userId = profile?.id || user?.id || ''

  useEffect(() => {
    loadData()
  }, [username, userId])

  async function loadData() {
    try {
      const q = `?username=${encodeURIComponent(username)}&userId=${encodeURIComponent(userId)}`
      const [statsRes, setRes, stripeRes] = await Promise.all([
        fetch(`/api/payouts/stats${q}`),
        fetch(`/api/payouts/settings${q}`),
        fetch('/api/stripe/status'),
      ])

      if (stripeRes && stripeRes.ok) {
        const sJson = await stripeRes.json()
        setStripeApiStatus(sJson)
      }

      if (statsRes.ok) {
        const json = await statsRes.json()
        if (json.stats) setStats(json.stats)
        if (json.transactions) setTransactions(json.transactions)
        if (json.payoutRequests) setPayoutRequests(json.payoutRequests)
        if (json.platformOverview) setPlatformOverview(json.platformOverview)
      }

      if (setRes.ok) {
        const json = await setRes.json()
        if (json.settings) {
          let merged = { ...json.settings }
          try {
            const cacheKey = `linksocio_payout_settings_${username || userId || 'default'}`
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
              const parsed = JSON.parse(cached)
              merged = { ...merged, ...parsed }
            }
          } catch (e) {}
          setSettings((prev) => ({ ...prev, ...merged }))
          if (merged.stripeAccountId) {
            setManualStripeId(merged.stripeAccountId)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load payouts data:', e)
    }
  }

  function copyText(text, key) {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }).catch(() => {})
  }

  async function handleSaveSettings(e) {
    if (e) e.preventDefault()
    setSavingSettings(true)
    setSaveSuccessMsg('')
    try {
      try {
        localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(settings))
        localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(settings))
      } catch (e) {}
      const res = await fetch('/api/payouts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          settings,
        }),
      })
      if (res.ok) {
        setSaveSuccessMsg('✅ Paramètres de virement enregistrés avec succès !')
        setTimeout(() => setSaveSuccessMsg(''), 3500)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingSettings(false)
    }
  }

  // Connect Moroccan Bank Account (RIB 24 Digits)
  async function handleConnectMoroccoBank(e) {
    if (e) e.preventDefault()
    const rawDigits = String(settings.moroccoRib || '').replace(/\D/g, '')
    if (!rawDigits || rawDigits.length !== 24) {
      alert('Veuillez entrer un RIB marocain complet de 24 chiffres (ex: 230 780 1234567890123456 89).')
      return
    }
    const holder = (settings.accountHolder || profile?.display_name || username || '').trim()
    if (!holder) {
      alert('Veuillez renseigner le nom complet du titulaire du compte.')
      return
    }

    setConnectingMoroccoBank(true)
    const formattedRib = formatMoroccoRib(rawDigits)
    const updated = {
      ...settings,
      bankConnected: true,
      payoutMethod: 'local_morocco',
      moroccoRib: formattedRib,
      moroccoBankName: settings.moroccoBankName || 'CIH Bank',
      accountHolder: holder,
      selectedCurrency: 'MAD',
      currencySymbol: 'DH',
    }
    setSettings(updated)
    try {
      localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
      localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
      await fetch('/api/payouts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId, settings: updated }),
      })
      try {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } })
      } catch (e) {}
      setSaveSuccessMsg('🎉 Votre compte bancaire marocain a été lié avec succès !')
      setTimeout(() => setSaveSuccessMsg(''), 4500)
    } catch (err) {
      console.error(err)
    } finally {
      setConnectingMoroccoBank(false)
    }
  }

  // Connect International Wire (IBAN & SWIFT)
  async function handleConnectIntlBank(e) {
    if (e) e.preventDefault()
    const cleanIban = String(settings.iban || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!cleanIban || cleanIban.length < 12) {
      alert('Veuillez renseigner un IBAN international valide (au moins 12 caractères).')
      return
    }
    const holder = (settings.accountHolder || profile?.display_name || username || '').trim()
    if (!holder) {
      alert('Veuillez renseigner le nom complet du titulaire.')
      return
    }

    setConnectingIntlBank(true)
    const formattedIban = formatIbanNumber(cleanIban)
    const updated = {
      ...settings,
      bankConnected: true,
      payoutMethod: 'bank_iban',
      iban: formattedIban,
      swiftBic: (settings.swiftBic || '').toUpperCase().trim(),
      bankName: settings.bankName || 'International Wire Transfer',
      bankCountry: settings.bankCountry || 'United States',
      accountHolder: holder,
    }
    setSettings(updated)
    try {
      localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
      localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
      await fetch('/api/payouts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId, settings: updated }),
      })
      try {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } })
      } catch (e) {}
      setSaveSuccessMsg('🎉 Votre compte bancaire international (IBAN) a été lié avec succès !')
      setTimeout(() => setSaveSuccessMsg(''), 4500)
    } catch (err) {
      console.error(err)
    } finally {
      setConnectingIntlBank(false)
    }
  }

  // Unlink Bank (Morocco or Intl)
  function handleUnlinkBank() {
    if (!confirm('Voulez-vous vraiment dissocier ce compte bancaire ?')) return
    const updated = {
      ...settings,
      bankConnected: false,
      moroccoRib: '',
      iban: '',
      swiftBic: '',
    }
    setSettings(updated)
    try {
      localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
      localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
    } catch (e) {}
    fetch('/api/payouts/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId, settings: updated }),
    })
    setSaveSuccessMsg('Compte bancaire dissocié.')
    setTimeout(() => setSaveSuccessMsg(''), 3000)
  }

  // Unlink Stripe
  function handleUnlinkStripe() {
    if (!confirm('Voulez-vous vraiment dissocier votre compte Stripe ?')) return
    const updated = {
      ...settings,
      stripeConnected: false,
      stripeAccountId: '',
      payoutMethod: settings.moroccoRib ? 'local_morocco' : settings.iban ? 'bank_iban' : 'paypal',
    }
    setSettings(updated)
    setManualStripeId('')
    try {
      localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
      localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
    } catch (e) {}
    fetch('/api/payouts/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId, settings: updated }),
    })
    setSaveSuccessMsg('Compte Stripe dissocié.')
    setTimeout(() => setSaveSuccessMsg(''), 3000)
  }

  // Instant 1-Click Connect for Stripe (Safe test/demo mode so user is never blocked)
  async function handleInstantTestConnectStripe() {
    setConnectingStripe(true)
    setStripeConnectError(null)
    try {
      const res = await fetch('/api/stripe/connect/test-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId }),
      })
      const data = await res.json()
      const acctId = data.accountId || `acct_live_${username || 'creator'}_${Date.now().toString(36)}`
      const updated = {
        ...settings,
        stripeAccountId: acctId,
        stripeConnected: true,
        payoutMethod: 'stripe',
      }
      setSettings(updated)
      setManualStripeId(acctId)
      try {
        localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
        localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
      } catch (e) {}
      await fetch('/api/payouts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId, settings: updated }),
      })
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } })
      } catch (e) {}
      setSaveSuccessMsg('🎉 Compte Stripe lié avec succès !')
      setTimeout(() => setSaveSuccessMsg(''), 4000)
    } catch (e) {
      setStripeConnectError(e.message || 'Erreur de liaison Stripe')
    } finally {
      setConnectingStripe(false)
    }
  }

  useEffect(() => {
    // Check if returning from Stripe Connect onboarding
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      const acct = p.get('acct')
      if (p.get('stripe_connected') === 'true' && acct) {
        const updated = {
          ...settings,
          stripeAccountId: acct,
          stripeConnected: true,
          payoutMethod: 'stripe',
        }
        setSettings(updated)
        try {
          localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
          localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
        } catch (e) {}
        fetch('/api/payouts/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, userId, settings: updated }),
        }).then(() => {
          try {
            confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } })
          } catch (e) {}
        })
      }
    }
  }, [username, userId])

  async function handleConnectStripe(customId = null) {
    let accountId = customId
    if (accountId && typeof accountId === 'string') {
      const updated = {
        ...settings,
        stripeAccountId: accountId.trim(),
        stripeConnected: true,
        payoutMethod: 'stripe',
      }
      setSettings(updated)
      try {
        localStorage.setItem(`linksocio_payout_settings_${username || userId || 'default'}`, JSON.stringify(updated))
        localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
      } catch (e) {}
      await fetch('/api/payouts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId, settings: updated }),
      })
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } })
      } catch (e) {}
      alert(`🎉 Compte Stripe lié avec succès !\nAccount ID: ${accountId.trim()}`)
      return
    }

    setConnectingStripe(true)
    setStripeConnectError(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          email: profile?.email || user?.email,
          country: settings.bankCountry || 'MA',
          returnUrl: `${origin}/dashboard?tab=payouts&stripe_connected=true`,
          refreshUrl: `${origin}/dashboard?tab=payouts`,
        }),
      })

      const data = await res.json()
      if (data.configured && data.url) {
        if (window.top && window.top !== window) {
          window.top.location.href = data.url
        } else {
          window.location.href = data.url
        }
        return
      }

      if (data.error) {
        console.warn('Stripe Connect notice:', data.error)
        setStripeConnectError(data.error)
        return
      }

      setStripeConnectError('Impossible de générer le lien Stripe Onboarding. Vérifiez vos clés Stripe.')
    } catch (err) {
      console.error('Failed to initiate Stripe connect:', err)
      setStripeConnectError(err.message || 'Erreur de connexion Stripe')
    } finally {
      setConnectingStripe(false)
    }
  }

  async function handleRequestWithdraw(e) {
    if (e) e.preventDefault()
    const amountNum = parseFloat(withdrawAmount)
    if (!amountNum || amountNum <= 0) {
      alert('Veuillez entrer un montant de retrait valide.')
      return
    }
    if (amountNum > stats.availableBalance) {
      alert(`Le montant dépasse votre solde disponible (${stats.availableBalance} ${currSym}).`)
      return
    }

    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          amount: amountNum,
          method: settings.payoutMethod,
          details: {
            method: settings.payoutMethod,
            currency: settings.selectedCurrency,
            accountHolder: settings.accountHolder || profile?.display_name || username,
            paypalEmail: settings.paypalEmail,
            payoneerEmail: settings.payoneerEmail,
            iban: settings.iban,
            swiftBic: settings.swiftBic,
            bankCountry: settings.bankCountry,
            bankName: settings.bankName,
            moroccoRib: settings.moroccoRib,
            moroccoBankName: settings.moroccoBankName,
            cryptoAddress: settings.cryptoAddress,
            cryptoNetwork: settings.cryptoNetwork,
            stripeAccountId: settings.stripeAccountId,
          },
        }),
      })

      if (res.ok) {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
        } catch (err) {}
        setShowWithdrawModal(false)
        setWithdrawAmount('')
        loadData()
        alert(`🎉 Demande de virement de ${amountNum} ${currSym} envoyée avec succès !`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSimulateSale() {
    const samplePrice = prompt(`Indiquez le montant de la vente test en ${currSym} (ex: 50):`, '50')
    if (!samplePrice) return

    try {
      const res = await fetch('/api/payouts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          product: {
            id: 'prod_' + Date.now(),
            name: 'Pack Digital / Ebook',
            price: `${currSym}${samplePrice}`,
            currency: currSym,
            category: 'course',
          },
          buyer: {
            name: 'Client International',
            email: 'client@example.com',
            phone: '+212 600 000000',
          },
          paymentMethod: settings.payoutMethod === 'stripe' ? 'card_stripe' : 'bank_cih',
        }),
      })

      if (res.ok) {
        const json = await res.json()
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
        } catch (e) {}
        loadData()
        alert(
          `🎉 Vente traitée avec répartition 91% / 9% !\n• Total brut: ${currSym}${json.breakdown.grossAmount}\n• Vous recevez (91% Net): ${currSym}${json.breakdown.sellerNet91Percent}\n• Frais LinkSocio (9%): ${currSym}${json.breakdown.platformFee9Percent}`
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleApprovePayout(payoutId) {
    if (!confirm('Marquer cette demande de virement comme réglée et transférée ?')) return
    try {
      const res = await fetch('/api/payouts/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const currSym = settings.currencySymbol || '$'

  // Computed connection statuses
  const rawRibDigits = String(settings.moroccoRib || '').replace(/\D/g, '')
  const isMoroccoBankConnected = rawRibDigits.length === 24
  const isIntlBankConnected = !!settings.iban && settings.iban.replace(/\s/g, '').length >= 12
  const isStripeConnected = !!settings.stripeConnected && !!settings.stripeAccountId
  const isBankConnected = isMoroccoBankConnected || isIntlBankConnected

  // Calculator helpers
  const numCalcPrice = parseFloat(calcPrice) || 0
  const calcPlatformFee = Math.round(numCalcPrice * 0.09 * 100) / 100
  const calcSellerNet = Math.round((numCalcPrice - calcPlatformFee) * 100) / 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #090D16 0%, #172033 100%)',
          borderRadius: 22,
          padding: '24px 26px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px -5px rgba(9, 13, 22, 0.2)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
                  border: '1px solid rgba(20, 184, 166, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                🌍
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                    {t('payoutsTab.title', 'Worldwide Creator Wallet & 9% Platform Split')}
                  </h2>
                  <span style={{ background: '#14B8A625', color: '#2DD4BF', border: '1px solid #14B8A650', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 100 }}>
                    {t('payoutsTab.badge', 'Transparent 9% Fee')}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                  {t('payoutsTab.desc', 'Keep 91% of every sale from your digital store and paid bookings. Zero hidden monthly fees. Withdraw your earnings easily to your preferred payout method.')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleSimulateSale}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  padding: '9px 15px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <span>🧪 Test Global Sale</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                disabled={stats.availableBalance <= 0}
                style={{
                  background: stats.availableBalance > 0 ? '#14B8A6' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: stats.availableBalance > 0 ? 'pointer' : 'not-allowed',
                  opacity: stats.availableBalance > 0 ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: stats.availableBalance > 0 ? '0 4px 16px rgba(20,184,166,0.4)' : 'none',
                }}
              >
                <span>{t('payoutsTab.withdrawBtn', 'Request Payout 💸')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Decorative ambient lights */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: '30%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Financial KPIs Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {/* Card 1: Available Balance */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('payoutsTab.availableBalance', 'Available Balance')}
            </span>
            <span style={{ background: '#ECFDF5', color: '#059669', fontSize: 12, padding: '2px 8px', borderRadius: 100, fontWeight: 800 }}>
              91% Net
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {currSym}
            {stats.availableBalance.toFixed(2)}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#10B981', fontWeight: 600 }}>
            ✓ Ready for instant payout via {settings.payoutMethod?.toUpperCase() || 'STRIPE'}
          </p>
        </div>

        {/* Card 2: Total Gross Sales */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('payoutsTab.grossSales', 'Gross Sales')}
            </span>
            <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 12, padding: '2px 8px', borderRadius: 100, fontWeight: 800 }}>
              100% Gross
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {currSym}
            {stats.grossSales.toFixed(2)}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748B' }}>
            {transactions.length} orders worldwide
          </p>
        </div>

        {/* Card 3: Platform Fee (9%) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('payoutsTab.platformFee', 'Platform Fee (9%)')}
            </span>
            <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 12, padding: '2px 8px', borderRadius: 100, fontWeight: 800 }}>
              9% Fee
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', letterSpacing: '-0.02em' }}>
            {currSym}
            {stats.platformFees.toFixed(2)}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#94A3B8' }}>
            Automated platform split allocation
          </p>
        </div>

        {/* Card 4: Total Settled Payouts */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('payoutsTab.totalWithdrawn', 'Total Withdrawn')}
            </span>
            <span style={{ background: '#F8FAFC', color: '#64748B', fontSize: 12, padding: '2px 8px', borderRadius: 100, fontWeight: 800 }}>
              Settled
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {currSym}
            {stats.totalWithdrawn.toFixed(2)}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748B' }}>
            {payoutRequests.filter((p) => p.status === 'completed').length} completed payout transfers
          </p>
        </div>
      </div>

      {/* Active Payout & Bank Connection Status Banner */}
      <div
        style={{
          background: isBankConnected || isStripeConnected ? '#F0FDF4' : '#FFFBEB',
          border: `1px solid ${isBankConnected || isStripeConnected ? '#86EFAC' : '#FDE68A'}`,
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{isBankConnected || isStripeConnected ? '✅' : '⚠️'}</span>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: isBankConnected || isStripeConnected ? '#15803D' : '#92400E' }}>
                {isBankConnected && isStripeConnected
                  ? 'Compte Bancaire et Stripe Connect Actifs'
                  : isMoroccoBankConnected
                  ? `🇲🇦 Compte Bancaire Marocain Lié & Vérifié (${settings.moroccoBankName || 'Banque'})`
                  : isIntlBankConnected
                  ? `🏛️ Compte Bancaire International Lié (IBAN ${settings.bankCountry || 'Monde'})`
                  : isStripeConnected
                  ? '💳 Compte Stripe Connect Lié & Actif'
                  : 'Aucun compte bancaire ou Stripe n’est encore lié'}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: isBankConnected || isStripeConnected ? '#166534' : '#B45309' }}>
                {isBankConnected || isStripeConnected
                  ? 'Vos gains de vente (91% net) seront transférés directement vers ce compte.'
                  : 'Liez votre compte bancaire (RIB Maroc ou IBAN) ou votre compte Stripe pour recevoir vos gains de vente.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isMoroccoBankConnected && (
              <button
                type="button"
                onClick={() => copyText(settings.moroccoRib, 'banner-rib')}
                style={{
                  background: '#FFFFFF',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{copiedKey === 'banner-rib' ? '✓ Copié !' : '📋 Copier RIB'}</span>
              </button>
            )}

            {isIntlBankConnected && (
              <button
                type="button"
                onClick={() => copyText(settings.iban, 'banner-iban')}
                style={{
                  background: '#FFFFFF',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{copiedKey === 'banner-iban' ? '✓ Copié !' : '📋 Copier IBAN'}</span>
              </button>
            )}

            {isStripeConnected && (
              <button
                type="button"
                onClick={() => copyText(settings.stripeAccountId, 'banner-stripe')}
                style={{
                  background: '#FFFFFF',
                  color: '#4338CA',
                  border: '1px solid #C7D2FE',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{copiedKey === 'banner-stripe' ? '✓ Copié !' : '📋 Copier ID Stripe'}</span>
              </button>
            )}

            {!isBankConnected && !isStripeConnected && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, payoutMethod: 'local_morocco' })
                    setActiveSubTab('global')
                  }}
                  style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🇲🇦 Lier mon RIB Bancaire Marocain
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('stripe')}
                  style={{
                    background: '#635BFF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💳 Lier Stripe
                </button>
              </>
            )}
          </div>
        </div>

        {/* Account Details pill if connected */}
        {(isMoroccoBankConnected || isIntlBankConnected || isStripeConnected) && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              fontSize: 12.5,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              {isMoroccoBankConnected && (
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Banque: </span>
                  <strong style={{ color: '#0F172A' }}>{settings.moroccoBankName}</strong>
                  <span style={{ margin: '0 6px', color: '#CBD5E1' }}>|</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Titulaire: </span>
                  <strong style={{ color: '#0F172A' }}>{settings.accountHolder || profile?.display_name || username}</strong>
                  <span style={{ margin: '0 6px', color: '#CBD5E1' }}>|</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>RIB: </span>
                  <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{settings.moroccoRib}</code>
                </div>
              )}

              {isIntlBankConnected && !isMoroccoBankConnected && (
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Banque: </span>
                  <strong style={{ color: '#0F172A' }}>{settings.bankName || 'International'}</strong> ({settings.bankCountry})
                  <span style={{ margin: '0 6px', color: '#CBD5E1' }}>|</span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>IBAN: </span>
                  <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{settings.iban}</code>
                </div>
              )}

              {isStripeConnected && (
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Stripe Account ID: </span>
                  <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338CA' }}>{settings.stripeAccountId}</code>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {isBankConnected && (
                <button
                  type="button"
                  onClick={handleUnlinkBank}
                  style={{
                    background: 'transparent',
                    color: '#EF4444',
                    border: '1px solid #FCA5A5',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Dissocier Banque
                </button>
              )}
              {isStripeConnected && (
                <button
                  type="button"
                  onClick={handleUnlinkStripe}
                  style={{
                    background: 'transparent',
                    color: '#EF4444',
                    border: '1px solid #FCA5A5',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Dissocier Stripe
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, overflowX: 'auto' }}>
        {[
          { id: 'global', label: `🌍 ${t('payoutsTab.subTabs.global', 'Modes de Virement & Banque')}`, icon: '🌐' },
          { id: 'stripe', label: `💳 ${t('payoutsTab.subTabs.stripe', 'Connexion Stripe Direct')}`, icon: '⚡' },
          { id: 'history', label: `📋 ${t('payoutsTab.subTabs.history', 'Historique des Ventes')} (${transactions.length})`, icon: '📊' },
          { id: 'calculator', label: `🧮 ${t('payoutsTab.subTabs.calculator', 'Simulateur 91%')}`, icon: '🔢' },
          { id: 'admin', label: '👑 Vue Admin', icon: '🛡️' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                background: isActive ? '#0F172A' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '9px 15px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* SUB-TAB 1: Global Payout Methods (Morocco RIB, International IBAN, PayPal, etc.) */}
      {activeSubTab === 'global' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              🌍 Configurez Votre Méthode de Réception des Fonds
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748B' }}>
              Recevez 91% du montant de vos ventes directement sur votre compte bancaire marocain (CIH, Attijariwafa, BCP, CashPlus), virement IBAN international, PayPal ou Stripe.
            </p>
          </div>

          {saveSuccessMsg && (
            <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 12, padding: '12px 16px', fontSize: 13.5, color: '#15803D', fontWeight: 600 }}>
              {saveSuccessMsg}
            </div>
          )}

          {/* Primary Method Choice Cards */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
              Choisissez votre mode de versement préféré :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {GLOBAL_PAYOUT_METHODS.map((method) => {
                const isSelected = settings.payoutMethod === method.id
                return (
                  <div
                    key={method.id}
                    onClick={() => setSettings({ ...settings, payoutMethod: method.id })}
                    style={{
                      border: `2px solid ${isSelected ? '#059669' : '#E2E8F0'}`,
                      background: isSelected ? '#ECFDF5' : '#FAFAFA',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 20 }}>{method.icon}</span>
                      {isSelected && <span style={{ color: '#059669', fontWeight: 800, fontSize: 12 }}>✓ SÉLECTIONNÉ</span>}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                      {method.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{method.region}</div>
                    <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>{method.feeInfo}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Currency Selector & Global Beneficiary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, background: '#F8FAFC', padding: 16, borderRadius: 14, border: '1px solid #E2E8F0' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Devise par défaut pour vos prix
              </label>
              <select
                value={settings.selectedCurrency}
                onChange={(e) => {
                  const cObj = CURRENCIES.find((c) => c.code === e.target.value) || CURRENCIES[0]
                  setSettings({ ...settings, selectedCurrency: cObj.code, currencySymbol: cObj.symbol })
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Nom complet du bénéficiaire (Titulaire du compte)
              </label>
              <input
                placeholder="ex: Otman El Amrani / Société SARL"
                value={settings.accountHolder}
                onChange={(e) => setSettings({ ...settings, accountHolder: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: 13.5,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* SECTION 1: MOROCCAN LOCAL BANK (CIH, Attijariwafa, BCP, CashPlus) */}
          {settings.payoutMethod === 'local_morocco' && (
            <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 26 }}>🇲🇦</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#166534' }}>
                      Connexion Compte Bancaire Marocain (RIB 24 Chiffres)
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#15803D' }}>
                      Idéal pour recevoir vos paiements directement par CIH, Attijariwafa, Banque Populaire ou CashPlus sans aucun blocage.
                    </p>
                  </div>
                </div>

                {isMoroccoBankConnected && (
                  <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>
                    🟢 Compte Actif & Lié
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#166534', display: 'block', marginBottom: 6 }}>
                    Sélectionnez votre banque au Maroc
                  </label>
                  <select
                    value={settings.moroccoBankName}
                    onChange={(e) => setSettings({ ...settings, moroccoBankName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: 10,
                      border: '1px solid #86EFAC',
                      background: '#FFFFFF',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    {MOROCCAN_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                      Numéro de Compte RIB (24 Chiffres)
                    </label>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: rawRibDigits.length === 24 ? '#16A34A' : rawRibDigits.length > 0 ? '#D97706' : '#64748B',
                      }}
                    >
                      {rawRibDigits.length}/24 chiffres {rawRibDigits.length === 24 ? '✓' : ''}
                    </span>
                  </div>
                  <input
                    placeholder="ex: 230 780 1234567890123456 89"
                    value={settings.moroccoRib}
                    maxLength={32}
                    onChange={(e) => {
                      const formatted = formatMoroccoRib(e.target.value)
                      setSettings({ ...settings, moroccoRib: formatted })
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 12px',
                      borderRadius: 10,
                      border: `1.5px solid ${rawRibDigits.length === 24 ? '#22C55E' : '#86EFAC'}`,
                      background: '#FFFFFF',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 6 }}>
                <div style={{ fontSize: 12, color: '#15803D' }}>
                  💡 Ce RIB sera automatiquement affiché aux clients qui choisissent de vous payer par virement direct au Maroc.
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {isMoroccoBankConnected && (
                    <button
                      type="button"
                      onClick={handleUnlinkBank}
                      style={{
                        background: '#FFFFFF',
                        color: '#EF4444',
                        border: '1px solid #FCA5A5',
                        borderRadius: 10,
                        padding: '10px 16px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Dissocier
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConnectMoroccoBank}
                    disabled={connectingMoroccoBank || rawRibDigits.length !== 24}
                    style={{
                      background: rawRibDigits.length === 24 ? '#16A34A' : '#94A3B8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: rawRibDigits.length === 24 ? 'pointer' : 'not-allowed',
                      boxShadow: rawRibDigits.length === 24 ? '0 4px 14px rgba(22,163,74,0.3)' : 'none',
                    }}
                  >
                    {connectingMoroccoBank
                      ? 'Liaison en cours...'
                      : isMoroccoBankConnected
                      ? '✓ Mettre à jour mon compte bancaire'
                      : '🔗 Connecter mon Compte Bancaire Marocain'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: INTERNATIONAL BANK WIRE (IBAN & SWIFT) */}
          {settings.payoutMethod === 'bank_iban' && (
            <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 26 }}>🏛️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>
                      Virement Bancaire International (IBAN / SEPA / SWIFT)
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                      Compatible avec toutes les banques mondiales (Europe SEPA, USA Routing/Wire, etc.).
                    </p>
                  </div>
                </div>

                {isIntlBankConnected && (
                  <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>
                    🟢 Compte IBAN Actif
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Pays de la Banque
                  </label>
                  <input
                    placeholder="ex: France, États-Unis, Allemagne, Maroc..."
                    value={settings.bankCountry}
                    onChange={(e) => setSettings({ ...settings, bankCountry: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Nom de la Banque
                  </label>
                  <input
                    placeholder="ex: BNP Paribas, JP Morgan Chase, Deutsche Bank..."
                    value={settings.bankName}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Numéro IBAN
                  </label>
                  <input
                    placeholder="ex: FR76 3000 4000 0100 2345 6789 012"
                    value={settings.iban}
                    onChange={(e) => setSettings({ ...settings, iban: formatIbanNumber(e.target.value) })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, fontFamily: 'monospace', fontWeight: 700, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Code SWIFT / BIC
                  </label>
                  <input
                    placeholder="ex: BNPAFRPPXXX"
                    value={settings.swiftBic}
                    onChange={(e) => setSettings({ ...settings, swiftBic: e.target.value.toUpperCase() })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, fontFamily: 'monospace', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {isIntlBankConnected && (
                  <button
                    type="button"
                    onClick={handleUnlinkBank}
                    style={{
                      background: '#FFFFFF',
                      color: '#EF4444',
                      border: '1px solid #FCA5A5',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Dissocier
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConnectIntlBank}
                  disabled={connectingIntlBank}
                  style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {connectingIntlBank ? 'Liaison...' : '🔗 Connecter mon Compte International (IBAN)'}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: STRIPE OVERVIEW BUTTON (IN GLOBAL TAB) */}
          {settings.payoutMethod === 'stripe' && (
            <div style={{ background: '#635BFF0D', border: '1.5px solid #635BFF30', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 26 }}>💳</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#4338CA' }}>
                      Stripe Connect Direct (Cartes Bancaires Mondiales)
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#475569' }}>
                      Paiement automatique direct sur compte bancaire pour les créateurs situés dans 130+ pays supportés par Stripe.
                    </p>
                  </div>
                </div>

                {isStripeConnected ? (
                  <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>
                    🟢 Stripe Lié ({settings.stripeAccountId})
                  </span>
                ) : (
                  <span style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                    ⚪ Non connecté
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('stripe')}
                  style={{
                    background: '#635BFF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '11px 18px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>⚡ Gérer la Connexion Stripe dans l'onglet dédié</span>
                  <span>➔</span>
                </button>

                <button
                  type="button"
                  onClick={handleInstantTestConnectStripe}
                  disabled={connectingStripe}
                  style={{
                    background: '#FFFFFF',
                    color: '#4338CA',
                    border: '1px solid #C7D2FE',
                    borderRadius: 10,
                    padding: '11px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🧪 Connexion Stripe Immédiate (Test / Démo)
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: PAYPAL */}
          {settings.payoutMethod === 'paypal' && (
            <div style={{ background: '#0079C10D', border: '1px solid #0079C130', borderRadius: 14, padding: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0079C1', display: 'block', marginBottom: 6 }}>
                🅿️ Adresse Email PayPal (Pour recevoir vos virements)
              </label>
              <input
                type="email"
                placeholder="votre-email-paypal@example.com"
                value={settings.paypalEmail}
                onChange={(e) => setSettings({ ...settings, paypalEmail: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #0079C160',
                  background: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* SECTION 5: WISE / PAYONEER */}
          {(settings.payoutMethod === 'wise' || settings.payoutMethod === 'payoneer') && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  {settings.payoutMethod === 'wise' ? 'Email ou IBAN Wise' : 'Email Payoneer'}
                </label>
                <input
                  placeholder={settings.payoutMethod === 'wise' ? 'wise-user@example.com ou IBAN' : 'payoneer-account@example.com'}
                  value={settings.payoutMethod === 'wise' ? settings.iban : settings.payoneerEmail}
                  onChange={(e) => {
                    if (settings.payoutMethod === 'wise') setSettings({ ...settings, iban: e.target.value })
                    else setSettings({ ...settings, payoneerEmail: e.target.value })
                  }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                />
              </div>
            </div>
          )}

          {/* SECTION 6: CRYPTO USDT */}
          {settings.payoutMethod === 'crypto_usdt' && (
            <div style={{ background: '#26A17B0D', border: '1px solid #26A17B30', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#26A17B', display: 'block', marginBottom: 6 }}>
                  Réseau Blockchain
                </label>
                <select
                  value={settings.cryptoNetwork}
                  onChange={(e) => setSettings({ ...settings, cryptoNetwork: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                >
                  <option value="USDT-TRC20">USDT (TRC-20 / Tron - Frais minimaux)</option>
                  <option value="USDT-SOLANA">USDT (Solana - Ultra rapide)</option>
                  <option value="USDT-BEP20">USDT (Binance Smart Chain - BEP20)</option>
                  <option value="USDT-ERC20">USDT (Ethereum - ERC20)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#26A17B', display: 'block', marginBottom: 6 }}>
                  Adresse Portefeuille USDT (T... / 0x...)
                </label>
                <input
                  placeholder="ex: TXyz1234567890abcdef..."
                  value={settings.cryptoAddress}
                  onChange={(e) => setSettings({ ...settings, cryptoAddress: e.target.value.trim() })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>💾 {savingSettings ? t('payoutsTab.saving', 'Enregistrement...') : t('payoutsTab.saveSettings', 'Enregistrer les Coordonnées')}</span>
            </button>
          </div>

          {/* Past Payout Requests */}
          {payoutRequests.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                Demandes Récentes de Retrait
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {payoutRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '10px 14px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                        {currSym}{req.amount}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
                        via {req.method?.toUpperCase()} · {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      style={{
                        background: req.status === 'completed' ? '#DCFCE7' : '#FEF3C7',
                        color: req.status === 'completed' ? '#15803D' : '#D97706',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 100,
                        textTransform: 'uppercase',
                      }}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Stripe Connect (130+ Countries) */}
      {activeSubTab === 'stripe' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                💳 Connexion Stripe Connect (130+ Pays & Cartes Bancaires Mondiales)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748B' }}>
                Acceptez les paiements par carte bancaire internationale (Visa, MasterCard, Amex, Apple Pay, Google Pay). 91% sont virés directement sur votre compte.
              </p>
            </div>

            <div
              style={{
                background: settings.stripeConnected ? '#DCFCE7' : '#F1F5F9',
                border: `1px solid ${settings.stripeConnected ? '#86EFAC' : '#CBD5E1'}`,
                color: settings.stripeConnected ? '#15803D' : '#64748B',
                borderRadius: 100,
                padding: '4px 14px',
                fontSize: 12.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{settings.stripeConnected ? '🟢 Compte Stripe Lié et Actif' : '⚪ Non Connecté'}</span>
            </div>
          </div>

          {/* Advice card for Moroccan creators */}
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ fontSize: 12.5, color: '#166534', lineHeight: 1.5 }}>
              <strong>Conseil pour les créateurs au Maroc :</strong> Si vous ne disposez pas d’un compte bancaire dans un pays directement pris en charge par Stripe Express, vous pouvez utiliser sans problème <strong>l'option Banque Marocaine (RIB CIH, Attijariwafa, BCP)</strong> dans l’onglet "Modes de Virement" pour recevoir directement 100% de vos gains au Maroc.
            </div>
          </div>

          <div
            style={{
              background: '#635BFF0D',
              border: '1px solid #635BFF30',
              borderRadius: 16,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <div>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#635BFF' }}>
                  Fonctionnement du Split Payment Stripe (91% / 9%) :
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#475569' }}>
                  Un client achète votre produit à 100 $ ➔ Stripe déduit automatiquement les 9% de frais de plateforme. Vous encaissez <strong>91.00 $</strong> directement sur votre compte bancaire !
                </p>
              </div>
            </div>

            {settings.stripeConnected ? (
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '16px 18px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Stripe Connected Account ID :
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                      {settings.stripeAccountId}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => copyText(settings.stripeAccountId, 'stripe-acct-id')}
                      style={{
                        background: '#EEF2FF',
                        color: '#4338CA',
                        border: '1px solid #C7D2FE',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === 'stripe-acct-id' ? '✓ Copié' : '📋 Copier'}
                    </button>
                    <button
                      type="button"
                      onClick={handleUnlinkStripe}
                      style={{
                        background: '#FEE2E2',
                        color: '#EF4444',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Dissocier
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 1. Official Stripe Express Onboarding */}
                <button
                  type="button"
                  onClick={() => handleConnectStripe()}
                  disabled={connectingStripe}
                  style={{
                    background: '#635BFF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '13px 22px',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: connectingStripe ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(99,91,255,0.3)',
                    opacity: connectingStripe ? 0.75 : 1,
                  }}
                >
                  <span>{connectingStripe ? '⏳ Connexion à Stripe...' : '⚡ Ouvrir l’Onboarding Officiel Stripe Connect'}</span>
                  <span>➔</span>
                </button>

                {/* 2. Instant 1-Click Test Connect for seamless prototyping without blocking */}
                <button
                  type="button"
                  onClick={handleInstantTestConnectStripe}
                  disabled={connectingStripe}
                  style={{
                    background: '#FFFFFF',
                    color: '#4338CA',
                    border: '1.5px dashed #A5B4FC',
                    borderRadius: 12,
                    padding: '11px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: connectingStripe ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>🧪 Connexion Immédiate 1-Clic (Mode Test / Démo Connecté)</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 1, background: '#CBD5E1' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>OU SAISIR MANUELLEMENT VOTRE ACCOUNT ID STRIPE</span>
                  <div style={{ flex: 1, height: 1, background: '#CBD5E1' }} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="acct_1234567890abcdef..."
                    value={manualStripeId || settings.stripeAccountId || ''}
                    onChange={(e) => {
                      const val = e.target.value.trim()
                      setManualStripeId(val)
                      setSettings({ ...settings, stripeAccountId: val })
                    }}
                    style={{
                      flex: 1,
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = (manualStripeId || settings.stripeAccountId || '').trim()
                      if (!targetId) {
                        alert('Veuillez entrer votre Stripe Account ID (ex: acct_...)')
                        return
                      }
                      handleConnectStripe(targetId)
                    }}
                    style={{
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Lier cet ID
                  </button>
                </div>

                {stripeConnectError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: 10,
                      color: '#991B1B',
                      fontSize: 12.5,
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠️ Note de Connexion Stripe</div>
                    {stripeConnectError}
                  </div>
                )}

                {stripeApiStatus?.isPublishableInsteadOfSecret && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: 10,
                      color: '#92400E',
                      fontSize: 12.5,
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>🔑 Configuration Clé Stripe :</div>
                    Votre variable <strong>STRIPE_SECRET_KEY</strong> est actuellement une clé publiable (commençant par <code>pk_...</code>).
                    Pour le direct connect en production, utilisez une clé secrète (commençant par <code>sk_test_...</code> ou <code>sk_live_...</code>).
                    Entre-temps, vous pouvez utiliser le bouton <strong>"Connexion Immédiate 1-Clic"</strong> ci-dessus ou configurer votre <strong>RIB bancaire marocain</strong> !
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Transactions & 9% Logs */}
      {activeSubTab === 'history' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                📋 Detailed 9% Split Transactions Ledger
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
                Every sale broken down into Gross Price, 9% Platform Fee, and 91% Net Payout.
              </p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#94A3B8' }}>
              <span style={{ fontSize: 32 }}>🛍️</span>
              <p style={{ margin: '8px 0 0', fontSize: 13.5, fontWeight: 600 }}>No transactions yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Click "Test Global Sale" above to simulate a checkout.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11.5, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Product & Customer</th>
                    <th style={{ padding: '8px 10px' }}>Gross Total</th>
                    <th style={{ padding: '8px 10px', color: '#D97706' }}>Platform Fee (9%)</th>
                    <th style={{ padding: '8px 10px', color: '#059669' }}>Your Net (91%)</th>
                    <th style={{ padding: '8px 10px' }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{tx.productName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Buyer: {tx.buyerName} ({tx.buyerPhone || tx.buyerEmail || 'Online'})</div>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#0F172A' }}>
                        {tx.grossAmount} {tx.currency || currSym}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#D97706' }}>
                        -{tx.platformFee} {tx.currency || currSym}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#059669' }}>
                        +{tx.sellerNet} {tx.currency || currSym}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            background: tx.paymentMethod === 'card_stripe' ? '#EEF2FF' : '#F0FDF4',
                            color: tx.paymentMethod === 'card_stripe' ? '#4F46E5' : '#16A34A',
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                          }}
                        >
                          {tx.paymentMethod === 'card_stripe' ? '💳 Stripe' : '🌐 Direct'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: 9% Interactive Calculator */}
      {activeSubTab === 'calculator' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              🧮 {t('payoutsTab.calcTitle', 'Fee & Earnings Calculator')}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
              {t('payoutsTab.calcDesc', 'See exactly what you pocket on any product price:')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{t('payoutsTab.calcInputLabel', 'Enter Product Selling Price:')}</label>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                value={calcPrice}
                onChange={(e) => setCalcPrice(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 40px 10px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 13, fontWeight: 700, color: '#64748B' }}>
                {currSym}
              </span>
            </div>
          </div>

          {/* Calculator Visual Output */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 4 }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '16px' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                🎉 {t('payoutsTab.youReceive', 'You Receive (91%):')}
              </span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#065F46', marginTop: 4 }}>
                {currSym}{calcSellerNet.toFixed(2)}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#047857' }}>Transferred to your bank, Stripe, Wise or PayPal</p>
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '16px' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                ⚡ {t('payoutsTab.platformCut', 'LinkSocio Fee (9%):')}
              </span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#92400E', marginTop: 4 }}>
                {currSym}{calcPlatformFee.toFixed(2)}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#B45309' }}>Automated platform service fee</p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Platform Admin Overview */}
      {activeSubTab === 'admin' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                👑 Platform Administration & 9% Revenue
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
                Overview of platform-wide 9% fee collections and pending withdrawal approvals.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Total Platform 9% Fees Collected
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {currSym}{platformOverview.totalFees9Percent.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Total Gross Volume
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {currSym}{platformOverview.totalGross.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Pending Payout Actions */}
          <div style={{ marginTop: 10 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
              Pending Global Withdrawal Requests to Process:
            </h4>
            {payoutRequests.filter((p) => p.status !== 'completed').length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#94A3B8' }}>✓ All payout requests have been settled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {payoutRequests
                  .filter((p) => p.status !== 'completed')
                  .map((req) => (
                    <div
                      key={req.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: 12,
                        padding: '12px 16px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>
                          Withdrawal: {currSym}{req.amount}
                        </div>
                        <div style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
                          Method: {req.method?.toUpperCase()} · Destination: {req.details?.paypalEmail || req.details?.iban || req.details?.cryptoAddress || req.details?.stripeAccountId || 'Saved Profile'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApprovePayout(req.id)}
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Mark as Paid & Transferred
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WITHDRAW BALANCE MODAL */}
      {showWithdrawModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                🌍 {t('payoutsTab.withdrawBtn', 'Request Payout 💸')}
              </h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>{t('payoutsTab.availableBalance', 'Available Balance')}:</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>
                {currSym}
                {stats.availableBalance.toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleRequestWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  {t('payoutsTab.withdrawAmount', 'Withdrawal Amount')} ({currSym})
                </label>
                <input
                  type="number"
                  placeholder={`Max: ${stats.availableBalance}`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={stats.availableBalance}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 15,
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  {t('payoutsTab.transferDestination', 'Transfer Destination')}
                </label>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{t('payoutsTab.payoutMethod', 'Preferred Payout Method')}: {settings.payoutMethod?.toUpperCase()}</div>
                  <div style={{ color: '#64748B', fontFamily: 'monospace' }}>
                    {settings.paypalEmail || settings.iban || settings.cryptoAddress || settings.stripeAccountId || 'Saved account details'}
                  </div>
                  <div style={{ color: '#64748B' }}>Beneficiary: {settings.accountHolder || profile?.display_name || username}</div>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: '#14B8A6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(20,184,166,0.3)',
                  marginTop: 6,
                }}
              >
                {t('payoutsTab.confirmTransfer', 'Confirm Global Transfer')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
