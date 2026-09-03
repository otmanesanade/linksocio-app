import React, { useState } from 'react'
import { PLANS } from './BillingSettings'

export default function TrialExpiredPaywall({ user, profile, onUnlocked, onLogout }) {
  const [selectedPlanId, setSelectedPlanId] = useState('pro')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1]
  const isYearly = billingCycle === 'yearly'
  const price = isYearly ? selectedPlan.yearlyTotal : selectedPlan.priceMonthly

  async function handleStripePay() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          billingCycle: billingCycle,
          price: price,
          currency: 'eur',
          userId: user?.id,
          username: profile?.username,
          customerEmail: user?.email,
          successUrl: `${window.location.origin}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
          cancelUrl: `${window.location.origin}/dashboard?tab=billing`,
        }),
      })

      const raw = await res.text()
      let data = {}
      try {
        data = JSON.parse(raw)
      } catch (e) {
        throw new Error('Could not parse checkout response from server.')
      }

      if (!res.ok) {
        throw new Error(data.error || 'Server error creating Stripe checkout session.')
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      if (data.error) {
        setError(data.error)
      } else {
        setError('Stripe checkout could not be started. Please check Stripe configuration.')
      }
    } catch (err) {
      setError(err.message || 'Network error connecting to Stripe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          maxWidth: 620,
          width: '100%',
          padding: '36px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Header Icon */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: '#FEF2F2',
            border: '2px solid #FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 18px',
          }}
        >
          🔒
        </div>

        {/* Title & Explanation */}
        <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#0F172A' }}>
          Your 14-Day Free Trial Has Ended
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
          Thank you for trying <strong>LinkSocio</strong>! Your 14 days of free full access have expired.
          To continue managing your custom page, adding links, products, receiving bookings and keeping your link live, please select an active plan below.
        </p>

        {/* Billing Cycle Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: 4,
            borderRadius: 100,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '6px 16px',
              borderRadius: 100,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              background: billingCycle === 'monthly' ? 'white' : 'transparent',
              color: billingCycle === 'monthly' ? '#0F172A' : '#64748B',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '6px 16px',
              borderRadius: 100,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              background: billingCycle === 'yearly' ? 'white' : 'transparent',
              color: billingCycle === 'yearly' ? '#0F172A' : '#64748B',
              boxShadow: billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Yearly (Save 20%) 🎁
          </button>
        </div>

        {/* Plan Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
          {/* Pro Plan */}
          <div
            onClick={() => setSelectedPlanId('pro')}
            style={{
              border: selectedPlanId === 'pro' ? '2px solid #14B8A6' : '1px solid #E2E8F0',
              background: selectedPlanId === 'pro' ? '#F0FDFA' : 'white',
              borderRadius: 16,
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>🚀 Pro Creator</span>
              {selectedPlanId === 'pro' && (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0D9488', background: '#CCFBF1', padding: '2px 8px', borderRadius: 100 }}>
                  Selected ✓
                </span>
              )}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>
              €{isYearly ? '3.99' : '4.99'}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}> / mo</span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>
              Remove badge, unlimited products, all themes, WhatsApp alerts & custom branding.
            </p>
          </div>

          {/* Business Plan */}
          <div
            onClick={() => setSelectedPlanId('business')}
            style={{
              border: selectedPlanId === 'business' ? '2px solid #14B8A6' : '1px solid #E2E8F0',
              background: selectedPlanId === 'business' ? '#F0FDFA' : 'white',
              borderRadius: 16,
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>👑 Business Elite</span>
              {selectedPlanId === 'business' && (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0D9488', background: '#CCFBF1', padding: '2px 8px', borderRadius: 100 }}>
                  Selected ✓
                </span>
              )}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>
              €{isYearly ? '9.59' : '11.99'}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}> / mo</span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>
              Everything in Pro + agency priority support, custom domain & advanced restaurant menu.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 12.5,
              color: '#B91C1C',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            disabled={loading}
            onClick={handleStripePay}
            style={{
              width: '100%',
              background: '#635BFF',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(99, 91, 255, 0.4)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <span>💳</span>
            <span>
              {loading
                ? 'Connecting to Stripe Checkout...'
                : `Activate & Pay via Stripe Checkout (€${price})`}
            </span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 6 }}>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12.5,
                  color: '#64748B',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Log out
              </button>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, fontSize: 11.5, color: '#94A3B8' }}>
          <span>🔒 256-bit Encrypted</span>
          <span>•</span>
          <span>Powered by Stripe Official</span>
          <span>•</span>
          <span>Cancel Anytime</span>
        </div>
      </div>
    </div>
  )
}
