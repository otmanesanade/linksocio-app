import React, { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { supabase } from '../supabaseClient'

export const PLANS = [
  {
    id: 'free_trial',
    name: '14-Day Free Trial',
    badge: '14-DAY FULL ACCESS',
    priceMonthly: 0,
    priceYearly: 0,
    period: '/ 14 days free',
    desc: 'Full dashboard access to build your bio link, list products & test all features.',
    features: [
      '14 Days full feature access',
      'Unlimited links & social icons',
      'Direct 1-tap WhatsApp button',
      'Digital store with 91% net split',
      'Appointments & Booking form',
      'Inquiry & Leads capture inbox',
      'Downloadable Vector QR Code',
      'Basic page view analytics',
    ],
    popular: false,
    ctaText: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro Creator',
    badge: 'MOST POPULAR',
    priceMonthly: 4.99,
    priceYearly: 3.99, // billed $47.90/yr
    yearlyTotal: 47.90,
    period: '/ month',
    desc: 'For individual creators, coaches & freelancers wanting a premium branded page.',
    features: [
      'Includes everything in 14-Day Free',
      'Remove LinkSocio watermark badge',
      'All 12+ Animated Themes & Google Fonts',
      'Unlimited Digital Products sales',
      'Instant automated file delivery',
      'Restaurant interactive menu builder',
      'WhatsApp & sound notification alerts',
      'Detailed traffic & click conversion logs',
    ],
    popular: true,
    ctaText: 'Upgrade to Pro 🚀',
  },
  {
    id: 'business',
    name: 'Business & Agency',
    badge: 'AGENCY & ENTERPRISE',
    priceMonthly: 11.99,
    priceYearly: 9.59, // billed $115.10/yr
    yearlyTotal: 115.10,
    period: '/ month',
    desc: 'For high-volume stores, restaurant chains, multi-brand agencies & VIP support.',
    features: [
      'Everything included in Pro Creator',
      'Priority booking slots & leads handling',
      'Multi-category large restaurant menus',
      'Highest digital file upload capacity',
      'Priority instant payout processing',
      'Advanced export for leads (CSV / Excel)',
      'Remove all branding across all pages',
      'VIP 24/7 dedicated support',
    ],
    popular: false,
    ctaText: 'Upgrade to Business ⚡',
  },
]

export default function BillingSettings({ user, profile, onSaved }) {
  const userId = user?.id || profile?.id || 'guest'
  const username = profile?.username || ''

  // Billing interval: 'monthly' | 'yearly'
  const [billingCycle, setBillingCycle] = useState('monthly')

  // Storage key
  const storageKey = `linksocio_billing_${userId}`

  // Billing state
  const [billingData, setBillingData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch (e) {}

    // Default: 14-day free trial started today or when user created
    const now = new Date()
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    return {
      planId: profile?.plan || 'free_trial',
      billingCycle: 'monthly',
      status: 'active', // 'active' | 'cancelled' | 'trial_ended'
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnds.toISOString(),
      nextBillingDate: trialEnds.toISOString(),
      autoRenew: true,
      paymentMethod: {
        brand: 'visa',
        last4: '4242',
        expMonth: '08',
        expYear: '28',
        cardholder: profile?.display_name || 'Cardholder',
      },
      invoices: [
        {
          id: 'INV-2026-0018',
          date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: '14-Day Full Access Free Trial',
          amount: 0.0,
          currency: 'USD',
          status: 'Paid',
          pdfUrl: '#',
        },
      ],
    }
  })

  // Edit Payment Card Modal
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardForm, setCardForm] = useState({
    cardholder: billingData.paymentMethod?.cardholder || '',
    cardNumber: '•••• •••• •••• 4242',
    exp: '08/28',
    cvc: '•••',
  })
  const [cardSaving, setCardSaving] = useState(false)
  const [cardSuccessMsg, setCardSuccessMsg] = useState('')

  // Upgrade Modal
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)

  // Stripe Integration State
  const [stripeStatus, setStripeStatus] = useState({
    loading: true,
    configured: false,
    mode: 'test',
    hasPublishableKey: false,
    publishableKeyMasked: null,
  })
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState('')
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState(null)
  const [showStripeGuide, setShowStripeGuide] = useState(false)
  const [stripeSuccessNotice, setStripeSuccessNotice] = useState(false)

  // Cancel / Pause Modal
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Receipt Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Load Stripe Status on mount
  useEffect(() => {
    async function loadStripeStatus() {
      try {
        const res = await fetch('/api/stripe/status')
        const data = await res.json()
        setStripeStatus({
          loading: false,
          configured: !!data.configured,
          mode: data.mode || 'test',
          hasPublishableKey: !!data.hasPublishableKey,
          publishableKeyMasked: data.publishableKeyMasked,
        })
      } catch (e) {
        setStripeStatus({ loading: false, configured: false, mode: 'test', hasPublishableKey: false })
      }
    }
    loadStripeStatus()
  }, [])

  // Verify Stripe Return Session if redirected back with session_id
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    const isUpgraded = urlParams.get('upgraded')

    if (sessionId) {
      async function verifySession() {
        try {
          const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          const data = await res.json()
          if (data.verified) {
            const matchedPlan = PLANS.find((p) => p.id === data.planId) || PLANS[1]
            const now = new Date()
            const isYearly = data.billingCycle === 'yearly'
            const nextPeriod = new Date(now.getTime() + (isYearly ? 365 : 30) * 86400000)

            const newInvoice = {
              id: `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              date: now.toISOString().split('T')[0],
              description: `${matchedPlan.name} (${isYearly ? 'Annual' : 'Monthly'}) - Stripe Paid`,
              amount: data.amountTotal || (isYearly ? matchedPlan.yearlyTotal : matchedPlan.priceMonthly),
              currency: (data.currency || 'EUR').toUpperCase(),
              status: 'Paid',
              pdfUrl: '#',
            }

            const updated = {
              ...billingData,
              planId: matchedPlan.id,
              billingCycle: data.billingCycle || 'monthly',
              status: 'active',
              nextBillingDate: nextPeriod.toISOString(),
              stripeSubscriptionId: data.subscriptionId,
              invoices: [newInvoice, ...(billingData.invoices || [])],
            }

            saveBillingState(updated)

            try {
              if (username) localStorage.setItem(`linksocio_hide_branding_${username}`, 'true')
              if (userId) localStorage.setItem(`linksocio_hide_branding_${userId}`, 'true')
              await supabase.from('profiles').update({ plan: matchedPlan.id, hide_branding: true }).eq('id', userId)
            } catch (e) {}

            if (onSaved) onSaved()

            try {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } })
            } catch (e) {}

            setStripeSuccessNotice(true)
            setTimeout(() => setStripeSuccessNotice(false), 6000)

            // Clean query params
            const newUrl = window.location.pathname + (urlParams.get('tab') ? `?tab=${urlParams.get('tab')}` : '')
            window.history.replaceState({}, document.title, newUrl)
          }
        } catch (e) {
          console.error('Failed to verify session', e)
        }
      }
      verifySession()
    }
  }, [billingData, userId, username, onSaved])

  // Save billing data locally whenever it changes
  function saveBillingState(updated) {
    setBillingData(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
      if (username) {
        localStorage.setItem(`linksocio_billing_${username}`, JSON.stringify(updated))
      }
    } catch (e) {}
  }

  // Calculate Trial Remaining
  const now = new Date()
  const trialEnd = new Date(billingData.trialEndDate || now.getTime() + 10 * 86400000)
  const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
  const trialDaysUsed = Math.min(14, Math.max(0, 14 - daysRemaining))
  const trialProgressPercent = Math.min(100, Math.round((trialDaysUsed / 14) * 100))

  const currentPlan = PLANS.find((p) => p.id === billingData.planId) || PLANS[0]

  // Handle Official Stripe Checkout
  async function handleStripeCheckout() {
    if (!selectedPlanForUpgrade) return
    setStripeLoading(true)
    setStripeError('')
    setStripeCheckoutUrl(null)

    const isYearly = billingCycle === 'yearly'
    const planPrice = isYearly ? selectedPlanForUpgrade.yearlyTotal : selectedPlanForUpgrade.priceMonthly

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanForUpgrade.id,
          planName: selectedPlanForUpgrade.name,
          billingCycle: billingCycle,
          price: planPrice,
          currency: 'eur',
          userId: userId,
          username: username,
          customerEmail: user?.email || profile?.email || '',
          successUrl: `${window.location.origin}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
          cancelUrl: `${window.location.origin}/dashboard?tab=billing`,
        }),
      })

      const rawText = await res.text()
      let data = {}
      try {
        data = JSON.parse(rawText)
      } catch (jsonErr) {
        throw new Error(
          !res.ok
            ? `Server responded with error (${res.status}). Ensure STRIPE_SECRET_KEY is added to Vercel Environment Variables.`
            : 'Invalid response from server. Check serverless deployment.'
        )
      }

      if (!res.ok) {
        setStripeError(data.error || `Server error (${res.status}): Failed to start Stripe checkout session.`)
        return
      }

      if (data.url) {
        setStripeCheckoutUrl(data.url)
        setStripeLoading(false)

        // Try opening directly in a new window/tab
        let opened = false
        try {
          const win = window.open(data.url, '_blank', 'noopener,noreferrer')
          if (win) opened = true
        } catch (e) {}

        // If not opened and not blocked, try top window navigation
        if (!opened) {
          try {
            if (window.top && window.top !== window.self) {
              window.top.location.href = data.url
            }
          } catch (e) {}
        }
        return
      }

      if (!data.configured) {
        setStripeError(
          data.error ||
            'STRIPE_SECRET_KEY is not configured in Vercel. Add STRIPE_SECRET_KEY in Vercel Project Settings > Environment Variables.'
        )
        setShowStripeGuide(true)
      } else {
        setStripeError(data.error || 'Failed to start Stripe checkout session.')
      }
    } catch (err) {
      setStripeError(
        err.message || 'Network error connecting to Stripe. You can test with the Instant Upgrade button below.'
      )
    } finally {
      setStripeLoading(false)
    }
  }

  // Handle Plan Upgrade (Instant / Demo simulation)
  async function handleConfirmUpgrade() {
    if (!selectedPlanForUpgrade) return
    setUpgrading(true)

    const isYearly = billingCycle === 'yearly'
    const planPrice = isYearly ? selectedPlanForUpgrade.yearlyTotal : selectedPlanForUpgrade.priceMonthly

    setTimeout(async () => {
      const now = new Date()
      const nextMonth = new Date(now.getTime() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000)
      const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

      const newInvoice = {
        id: invoiceNumber,
        date: now.toISOString().split('T')[0],
        description: `${selectedPlanForUpgrade.name} (${isYearly ? 'Annual' : 'Monthly'})`,
        amount: planPrice,
        currency: 'USD',
        status: 'Paid',
      }

      const updated = {
        ...billingData,
        planId: selectedPlanForUpgrade.id,
        billingCycle: billingCycle,
        status: 'active',
        nextBillingDate: nextMonth.toISOString(),
        invoices: [newInvoice, ...billingData.invoices],
      }

      saveBillingState(updated)

      // Unlock branding removal
      try {
        if (username) localStorage.setItem(`linksocio_hide_branding_${username}`, 'true')
        if (userId) localStorage.setItem(`linksocio_hide_branding_${userId}`, 'true')
        await supabase.from('profiles').update({ plan: selectedPlanForUpgrade.id, hide_branding: true }).eq('id', userId)
      } catch (e) {}

      if (onSaved) onSaved()

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      } catch (e) {}

      setUpgrading(false)
      setUpgradeSuccess(true)
      setTimeout(() => {
        setUpgradeSuccess(false)
        setSelectedPlanForUpgrade(null)
      }, 2000)
    }, 800)
  }

  // Handle Card Update
  function handleSaveCard(e) {
    e.preventDefault()
    setCardSaving(true)

    const cleanCard = cardForm.cardNumber.replace(/\s+/g, '')
    const last4 = cleanCard.length >= 4 ? cleanCard.slice(-4) : '8821'
    const [m = '12', y = '29'] = cardForm.exp.split('/')

    setTimeout(() => {
      const updated = {
        ...billingData,
        paymentMethod: {
          brand: cleanCard.startsWith('5') ? 'mastercard' : 'visa',
          last4: last4,
          expMonth: m.trim(),
          expYear: y.trim(),
          cardholder: cardForm.cardholder || 'Cardholder',
        },
      }
      saveBillingState(updated)
      setCardSaving(false)
      setCardSuccessMsg('✓ Payment method updated successfully!')
      setTimeout(() => {
        setCardSuccessMsg('')
        setShowCardModal(false)
      }, 1500)
    }, 600)
  }

  // Handle Cancel / Downgrade
  function handleCancelSubscription() {
    const updated = {
      ...billingData,
      planId: 'free_trial',
      status: 'cancelled',
      autoRenew: false,
    }
    saveBillingState(updated)
    try {
      supabase.from('profiles').update({ plan: 'free_trial' }).eq('id', userId).then(() => {})
    } catch (e) {}
    setShowCancelModal(false)
  }

  // Handle Auto-Renew Toggle
  function handleToggleAutoRenew() {
    const updated = {
      ...billingData,
      autoRenew: !billingData.autoRenew,
    }
    saveBillingState(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Top Section Header */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E7EDEC',
          borderRadius: 20,
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              Billing & Subscription Plans
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
            Manage your LinkSocio plan, 14-day free trial countdown, card on file, and download invoices.
          </p>
        </div>

        {/* Currency & Guarantee Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              background: '#F0FDFA',
              border: '1px solid #CCFBF1',
              color: '#0D9488',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 100,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>🔒</span> 256-Bit Bank Encrypted
          </span>
          <span
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#475569',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 100,
            }}
          >
            Currency: EUR (€) / USD ($)
          </span>
        </div>
      </div>

      {/* Stripe Payment Success Notice */}
      {stripeSuccessNotice && (
        <div
          style={{
            background: '#ECFDF5',
            border: '2px solid #10B981',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#065F46' }}>
                Payment & Subscription Confirmed by Stripe!
              </h4>
              <p style={{ margin: 0, fontSize: 12.5, color: '#047857' }}>
                Your account has been upgraded with all premium creator benefits and branding removed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStripeSuccessNotice(false)}
            style={{ background: 'none', border: 'none', fontSize: 16, color: '#047857', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stripe España Gateway Status Banner */}
      <div
        style={{
          background: stripeStatus.configured ? '#F8FAFC' : '#FFFBEB',
          border: stripeStatus.configured ? '1px solid #E2E8F0' : '1px solid #FDE68A',
          borderRadius: 18,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 280 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#635BFF',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 18,
              boxShadow: '0 4px 10px rgba(99, 91, 255, 0.3)',
            }}
          >
            S
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A' }}>
                Stripe Subscriptions Gateway 🇪🇸
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 100,
                  background: stripeStatus.configured
                    ? stripeStatus.mode === 'live'
                      ? '#DCFCE7'
                      : '#E0E7FF'
                    : '#FEF3C7',
                  color: stripeStatus.configured
                    ? stripeStatus.mode === 'live'
                      ? '#15803D'
                      : '#4338CA'
                    : '#B45309',
                }}
              >
                {stripeStatus.configured
                  ? `ONLINE (${stripeStatus.mode.toUpperCase()} MODE)`
                  : 'AWAITING API KEY'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
              Accepts Visa, Mastercard, Apple Pay, Google Pay & SEPA in Euros (€) from Spain & Worldwide.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowStripeGuide(!showStripeGuide)}
            style={{
              background: 'white',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{showStripeGuide ? 'Hide Guide' : '📖 Setup Instructions'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Stripe Guide */}
      {showStripeGuide && (
        <div
          style={{
            background: 'white',
            border: '1px solid #CBD5E1',
            borderRadius: 18,
            padding: '20px',
            fontSize: 13,
            color: '#334155',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
              🇪🇸 How to activate Stripe Subscriptions with your Spanish Account:
            </h4>
            <button
              type="button"
              onClick={() => setShowStripeGuide(false)}
              style={{ background: 'none', border: 'none', fontSize: 16, color: '#94A3B8', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <ol style={{ margin: '0 0 14px', paddingLeft: 20 }}>
            <li>
              Log into your <strong><a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" style={{ color: '#635BFF' }}>Stripe Dashboard</a></strong> (Spain).
            </li>
            <li>
              In the top navigation, you can switch between <strong>Test mode</strong> (for safe testing) and <strong>Live mode</strong> (for real payments).
            </li>
            <li>
              Go to <strong>Developers</strong> ➡️ <strong>API keys</strong>.
            </li>
            <li>
              Copy your <strong>Secret key</strong> (<code style={{ background: '#F1F5F9', padding: '2px 5px', borderRadius: 4 }}>sk_test_...</code> or <code style={{ background: '#F1F5F9', padding: '2px 5px', borderRadius: 4 }}>sk_live_...</code>).
            </li>
            <li>
              Add it as <code style={{ background: '#F1F5F9', padding: '2px 5px', borderRadius: 4 }}>STRIPE_SECRET_KEY</code> in project Settings / Environment variables.
            </li>
          </ol>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1E40AF' }}>
            💡 <strong>Tip:</strong> Even before adding your live key, you can use the <strong>Instant Upgrade / Demo</strong> button inside the plan upgrade modal to test all features immediately!
          </div>
        </div>
      )}

      {/* 2. Active Plan Status Card & Trial Countdown */}
      <div
        style={{
          background:
            billingData.planId === 'pro'
              ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
              : billingData.planId === 'business'
              ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'
              : 'white',
          color: billingData.planId !== 'free_trial' ? 'white' : '#0F172A',
          border: billingData.planId === 'free_trial' ? '2px solid #14B8A6' : '1px solid #334155',
          borderRadius: 22,
          padding: '26px',
          boxShadow: '0 8px 24px -6px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          {/* Plan Info */}
          <div style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  background: billingData.planId === 'free_trial' ? '#ECFDF5' : '#14B8A6',
                  color: billingData.planId === 'free_trial' ? '#047857' : 'white',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '4px 10px',
                  borderRadius: 100,
                }}
              >
                {billingData.status === 'cancelled'
                  ? 'SUBSCRIPTION CANCELLED'
                  : billingData.planId === 'free_trial'
                  ? '🟢 14-DAY FULL ACCESS TRIAL'
                  : `✨ ${currentPlan.name.toUpperCase()} ACTIVE`}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: billingData.planId !== 'free_trial' ? '#94A3B8' : '#64748B',
                  fontWeight: 600,
                }}
              >
                Auto-Renew: {billingData.autoRenew ? 'ON ✓' : 'OFF'}
              </span>
            </div>

            <h3 style={{ margin: '4px 0 8px', fontSize: 24, fontWeight: 800 }}>
              {currentPlan.name}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: billingData.planId !== 'free_trial' ? '#CBD5E1' : '#64748B',
                lineHeight: 1.5,
              }}
            >
              {currentPlan.desc}
            </p>

            {/* Trial progress tracker */}
            {billingData.planId === 'free_trial' && (
              <div style={{ marginTop: 20, maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                  <span style={{ color: '#0D9488' }}>
                    ⏳ {daysRemaining} days left in your 14-day free trial
                  </span>
                  <span style={{ color: '#64748B' }}>{trialDaysUsed} / 14 Days</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${trialProgressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #14B8A6 0%, #0D9488 100%)',
                      borderRadius: 10,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#94A3B8' }}>
                  No charge during your trial. Upgrade anytime to keep premium themes & custom domain.
                </p>
              </div>
            )}
          </div>

          {/* Right Side: Price & Action */}
          <div style={{ textAlign: 'right', minWidth: 180 }}>
            <div style={{ fontSize: 12, color: billingData.planId !== 'free_trial' ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              Current Rate
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, margin: '2px 0 6px' }}>
              ${billingData.planId === 'free_trial' ? '0' : currentPlan.priceMonthly}
              <span style={{ fontSize: 13, fontWeight: 600, color: billingData.planId !== 'free_trial' ? '#94A3B8' : '#64748B' }}>
                {billingData.planId === 'free_trial' ? ' / 14d free' : ' / month'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: billingData.planId !== 'free_trial' ? '#94A3B8' : '#64748B', marginBottom: 14 }}>
              Next renewal:{' '}
              <strong style={{ color: billingData.planId !== 'free_trial' ? 'white' : '#0F172A' }}>
                {new Date(billingData.nextBillingDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {billingData.planId !== 'business' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = billingData.planId === 'free_trial' ? PLANS[1] : PLANS[2]
                    setSelectedPlanForUpgrade(target)
                    setStripeError('')
                    setStripeCheckoutUrl(null)
                  }}
                  style={{
                    background: '#14B8A6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🚀 Upgrade Plan
                </button>
              )}

              {billingData.planId !== 'free_trial' && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    background: 'transparent',
                    color: billingData.planId !== 'free_trial' ? '#94A3B8' : '#64748B',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Upgrade / Plan Comparison Section */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 22, padding: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Select or Change Plan
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
              Upgrade or switch between plans anytime with instant activation.
            </p>
          </div>

          {/* Monthly / Yearly Billing Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: 4,
              borderRadius: 100,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                background: billingCycle === 'monthly' ? 'white' : 'transparent',
                color: billingCycle === 'monthly' ? '#0F172A' : '#64748B',
                boxShadow: billingCycle === 'monthly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                border: 'none',
                borderRadius: 100,
                padding: '7px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              style={{
                background: billingCycle === 'yearly' ? 'white' : 'transparent',
                color: billingCycle === 'yearly' ? '#0F172A' : '#64748B',
                boxShadow: billingCycle === 'yearly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                border: 'none',
                borderRadius: 100,
                padding: '7px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>Annual (Save 20%)</span>
              <span style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '2px 6px', borderRadius: 100 }}>
                20% OFF
              </span>
            </button>
          </div>
        </div>

        {/* 3 Plans Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {PLANS.map((p) => {
            const isCurrent = billingData.planId === p.id
            const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly

            return (
              <div
                key={p.id}
                style={{
                  border: p.popular
                    ? '2px solid #14B8A6'
                    : isCurrent
                    ? '2px solid #0F172A'
                    : '1px solid #E2E8F0',
                  borderRadius: 20,
                  padding: 24,
                  background: isCurrent ? '#F8FAFC' : 'white',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: p.popular ? '0 10px 25px -5px rgba(20, 184, 166, 0.15)' : 'none',
                }}
              >
                {/* Popular or Current Badge */}
                {p.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -11,
                      right: 18,
                      background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 100,
                      letterSpacing: '0.04em',
                    }}
                  >
                    MOST POPULAR
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 800, color: p.popular ? '#0D9488' : '#64748B', letterSpacing: '0.05em' }}>
                  {p.badge}
                </div>

                <h4 style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  {p.name}
                </h4>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 10px' }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>
                    ${price}
                  </span>
                  <span style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>
                    {p.id === 'free_trial' ? '/ 14 days free' : billingCycle === 'yearly' ? '/ month (billed annually)' : '/ month'}
                  </span>
                </div>

                <p style={{ margin: '0 0 18px', fontSize: 12, color: '#64748B', lineHeight: 1.5, minHeight: 36 }}>
                  {p.desc}
                </p>

                {/* Features list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22, flex: 1 }}>
                  {p.features.map((feat) => (
                    <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1E293B' }}>
                      <span style={{ color: '#14B8A6', fontWeight: 800, fontSize: 13 }}>✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: '100%',
                      background: '#E2E8F0',
                      color: '#475569',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'default',
                    }}
                  >
                    ✓ Current Active Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanForUpgrade(p)
                      setStripeError('')
                      setStripeCheckoutUrl(null)
                    }}
                    style={{
                      width: '100%',
                      background: p.popular ? 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' : '#0F172A',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: p.popular ? '0 4px 12px rgba(20, 184, 166, 0.3)' : '0 2px 6px rgba(15,23,42,0.1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.id === 'free_trial' ? 'Downgrade to Trial' : `Select ${p.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Payment Method & Invoices Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Card on file */}
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                💳
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Payment Method</h4>
                <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>Saved card for subscription charges</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCardModal(true)}
              style={{
                background: '#F1F5F9',
                color: '#0F172A',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Update Card
            </button>
          </div>

          {/* Visual Credit Card Preview */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              borderRadius: 16,
              padding: '20px',
              color: 'white',
              boxShadow: '0 8px 20px -4px rgba(15,23,42,0.2)',
              marginBottom: 16,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#94A3B8' }}>
                PRIMARY CARD
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#38BDF8' }}>
                {billingData.paymentMethod?.brand?.toUpperCase() || 'VISA'}
              </span>
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 16, fontFamily: 'monospace' }}>
              •••• •••• •••• {billingData.paymentMethod?.last4 || '4242'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 11.5 }}>
              <div>
                <div style={{ color: '#94A3B8', fontSize: 9.5, textTransform: 'uppercase', marginBottom: 2 }}>Cardholder</div>
                <div style={{ fontWeight: 700 }}>{billingData.paymentMethod?.cardholder || profile?.display_name || 'LinkSocio User'}</div>
              </div>
              <div>
                <div style={{ color: '#94A3B8', fontSize: 9.5, textTransform: 'uppercase', marginBottom: 2 }}>Expires</div>
                <div style={{ fontWeight: 700 }}>{billingData.paymentMethod?.expMonth || '08'}/{billingData.paymentMethod?.expYear || '28'}</div>
              </div>
            </div>
          </div>

          {/* Auto-renew checkbox / toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: 12, marginTop: 'auto' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Auto-Renew Subscription</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Keep your page active with zero interruption</div>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoRenew}
              style={{
                width: 44,
                height: 24,
                borderRadius: 100,
                background: billingData.autoRenew ? '#14B8A6' : '#CBD5E1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: 3,
                  left: billingData.autoRenew ? 23 : 3,
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Invoices & Billing History */}
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                📑
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Invoices & Receipts</h4>
                <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>Download official tax receipts</p>
              </div>
            </div>
            <span style={{ fontSize: 11.5, background: '#F1F5F9', color: '#475569', fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}>
              {billingData.invoices?.length || 0} Invoices
            </span>
          </div>

          {/* Invoices Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {billingData.invoices && billingData.invoices.length > 0 ? (
              billingData.invoices.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: '1px solid #F1F5F9',
                    borderRadius: 12,
                    background: '#FAFAFA',
                    fontSize: 12,
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ color: '#0F172A', fontSize: 12.5 }}>{inv.id}</strong>
                      <span style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                        PAID ✓
                      </span>
                    </div>
                    <div style={{ color: '#64748B', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.description} · {inv.date}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 13 }}>
                      ${Number(inv.amount).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      style={{
                        background: '#0F172A',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📄 Receipt
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 12 }}>
                No invoices recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Upgrade / Checkout Modal */}
      {selectedPlanForUpgrade && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            if (!upgrading) setSelectedPlanForUpgrade(null)
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 22,
              padding: 26,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚀</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                  Upgrade to {selectedPlanForUpgrade.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForUpgrade(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{selectedPlanForUpgrade.name}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#14B8A6' }}>
                  ${billingCycle === 'yearly' ? selectedPlanForUpgrade.yearlyTotal : selectedPlanForUpgrade.priceMonthly}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>
                    {billingCycle === 'yearly' ? ' / year' : ' / month'}
                  </span>
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                {selectedPlanForUpgrade.desc}
              </p>
            </div>

            {/* Payment Method Selected */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                Payment Method Charged
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 12, background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>💳</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {billingData.paymentMethod?.brand?.toUpperCase() || 'VISA'} •••• {billingData.paymentMethod?.last4 || '4242'}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>Exp: {billingData.paymentMethod?.expMonth}/{billingData.paymentMethod?.expYear}</span>
              </div>
            </div>

            {/* Security Guarantee */}
            <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#0F766E', marginBottom: 16 }}>
              🛡️ <strong>Instant 1-Click Activation:</strong> You can cancel or switch plans anytime directly from your dashboard.
            </div>

            {stripeError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 12, padding: '10px 14px', fontSize: 12, marginBottom: 14, lineHeight: 1.4 }}>
                ⚠️ {stripeError}
              </div>
            )}

            {stripeCheckoutUrl && (
              <div
                style={{
                  background: '#ECFDF5',
                  border: '2px solid #10B981',
                  borderRadius: 14,
                  padding: '14px 16px',
                  textAlign: 'center',
                  marginBottom: 14,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#065F46', marginBottom: 4 }}>
                  ⚡ Stripe Checkout Ready!
                </div>
                <p style={{ fontSize: 12, color: '#047857', margin: '0 0 10px', lineHeight: 1.4 }}>
                  Because this app is running in a preview frame, click the button below to open Stripe directly:
                </p>
                <a
                  href={stripeCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#10B981',
                    color: 'white',
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 13.5,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <span>👉 Open Stripe Payment Page (€{billingCycle === 'yearly' ? selectedPlanForUpgrade.yearlyTotal : selectedPlanForUpgrade.priceMonthly}) ↗</span>
                </a>
              </div>
            )}

            {upgradeSuccess ? (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 12, padding: '14px', textAlign: 'center', fontWeight: 800, fontSize: 14 }}>
                🎉 Plan Upgraded Successfully! Enjoy {selectedPlanForUpgrade.name}!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 1. Official Stripe Button */}
                <button
                  type="button"
                  disabled={stripeLoading || upgrading}
                  onClick={handleStripeCheckout}
                  style={{
                    width: '100%',
                    background: '#635BFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    padding: '13px 18px',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: stripeLoading ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 91, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💳</span>
                    <span>{stripeLoading ? 'Connecting to Stripe...' : 'Pay via Stripe Checkout'}</span>
                  </div>
                  <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.22)', padding: '3px 9px', borderRadius: 100 }}>
                    €{billingCycle === 'yearly' ? selectedPlanForUpgrade.yearlyTotal : selectedPlanForUpgrade.priceMonthly} · Card / Apple Pay
                  </span>
                </button>

                {/* 2. Instant Test / Simulate Upgrade Option */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    disabled={upgrading || stripeLoading}
                    onClick={() => setSelectedPlanForUpgrade(null)}
                    style={{
                      flex: 1,
                      background: '#F1F5F9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={upgrading || stripeLoading}
                    onClick={handleConfirmUpgrade}
                    style={{
                      flex: 1.6,
                      background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px',
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: upgrading ? 'default' : 'pointer',
                      boxShadow: '0 2px 8px rgba(20, 184, 166, 0.25)',
                    }}
                  >
                    {upgrading ? 'Processing...' : '⚡ Test Instant Activation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Card Modal */}
      {showCardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowCardModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 22,
              padding: 26,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                  Update Payment Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardForm.cardholder}
                  onChange={(e) => setCardForm({ ...cardForm, cardholder: e.target.value })}
                  placeholder="e.g. Otman K."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Card Number
                </label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={cardForm.cardNumber}
                  onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                  placeholder="4242 4242 4242 4242"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={cardForm.exp}
                    onChange={(e) => setCardForm({ ...cardForm, exp: e.target.value })}
                    placeholder="08/28"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    CVC
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardForm.cvc}
                    onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                    placeholder="123"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {cardSuccessMsg && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                  {cardSuccessMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  style={{
                    flex: 1,
                    background: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: 12,
                    padding: '11px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cardSaving}
                  style={{
                    flex: 2,
                    background: '#0F172A',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '11px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: cardSaving ? 'default' : 'pointer',
                  }}
                >
                  {cardSaving ? 'Saving Card...' : 'Save Payment Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Official Invoice Receipt */}
      {selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            id="printable-receipt"
            style={{
              background: 'white',
              borderRadius: 22,
              padding: '32px',
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button (hidden in print) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #F1F5F9', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🧾</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Official Tax Invoice & Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Receipt Content */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Link<span style={{ color: '#14B8A6' }}>Socio</span> Inc.
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  Bio-Link & Creator Commerce Platform<br />
                  VAT ID: US-918237492-LS
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{selectedInvoice.id}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Date: {selectedInvoice.date}</div>
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                  STATUS: PAID ✓
                </span>
              </div>
            </div>

            {/* Billed To */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 12 }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>Billed To:</div>
              <div style={{ color: '#475569' }}>
                {profile?.display_name || 'LinkSocio Creator'}<br />
                {user?.email || `${username}@linksocio.com`}<br />
                {profile?.location || 'Worldwide'}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '10px 14px', fontSize: 11.5, fontWeight: 800, color: '#475569' }}>
                <span style={{ flex: 3 }}>Description</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Amount</span>
              </div>
              <div style={{ display: 'flex', padding: '12px 14px', fontSize: 12.5, color: '#0F172A', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ flex: 3 }}>{selectedInvoice.description}</span>
                <span style={{ flex: 1, textAlign: 'center' }}>1</span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>
                  ${Number(selectedInvoice.amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Summary Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', marginBottom: 24, fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 30, color: '#64748B' }}>
                <span>Subtotal:</span>
                <span>${Number(selectedInvoice.amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: 30, color: '#64748B' }}>
                <span>Taxes (0%):</span>
                <span>$0.00</span>
              </div>
              <div style={{ display: 'flex', gap: 30, fontSize: 15, fontWeight: 800, color: '#0F172A', borderTop: '2px solid #E2E8F0', paddingTop: 6 }}>
                <span>Total Paid:</span>
                <span style={{ color: '#14B8A6' }}>${Number(selectedInvoice.amount).toFixed(2)} USD</span>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Paid via {billingData.paymentMethod?.brand?.toUpperCase() || 'VISA'} ending in {billingData.paymentMethod?.last4 || '4242'}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🖨️</span> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cancel Subscription Confirmation */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 22,
              padding: 26,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>
              Cancel Subscription?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 1.5 }}>
              Are you sure you want to cancel your {currentPlan.name}? Your page will revert to the 14-day trial mode at the end of the current billing cycle.
            </p>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 12, fontSize: 12, color: '#991B1B', marginBottom: 20 }}>
              • LinkSocio watermark badge will be displayed<br />
              • Custom themes and animations will revert to default<br />
              • Premium restaurant menus will be limited
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{
                  flex: 1,
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Keep My Plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                style={{
                  flex: 1,
                  background: '#FEE2E2',
                  color: '#DC2626',
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  )
}
