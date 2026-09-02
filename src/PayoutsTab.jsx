import React, { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'

// Global payout options for all countries
const GLOBAL_PAYOUT_METHODS = [
  { id: 'stripe', name: 'Stripe Connect / Direct Bank Transfer', region: 'Global (130+ Countries)', icon: '💳', feeInfo: 'Auto Instant 91% Transfer' },
  { id: 'paypal', name: 'PayPal Account', region: 'Worldwide', icon: '🅿️', feeInfo: 'Direct to PayPal Email' },
  { id: 'wise', name: 'Wise (TransferWise IBAN / Routing)', region: 'International Multi-Currency', icon: '🌐', feeInfo: 'EUR, USD, GBP, etc.' },
  { id: 'payoneer', name: 'Payoneer Receiving Account', region: 'Global Freelancers & Creators', icon: '🅿️', feeInfo: 'Global Bank Transfer' },
  { id: 'bank_iban', name: 'Direct International Wire (IBAN / SWIFT)', region: 'Worldwide Banks', icon: '🏛️', feeInfo: 'SEPA / SWIFT / Local Bank' },
  { id: 'crypto_usdt', name: 'Crypto USDT (TRC-20 / ERC-20 / Solana)', region: 'Borderless & Instant', icon: '🪙', feeInfo: 'Instant Crypto Payout' },
  { id: 'local_morocco', name: 'Morocco Local Banks (CIH, Attijari, BCP, CashPlus)', region: 'Morocco & MENA', icon: '🇲🇦', feeInfo: 'RIB 24 Digits / CashPlus' },
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
  const [settings, setSettings] = useState({
    selectedCurrency: 'USD',
    currencySymbol: '$',
    payoutMethod: 'stripe', // 'stripe' | 'paypal' | 'wise' | 'payoneer' | 'bank_iban' | 'crypto_usdt' | 'local_morocco'
    // Stripe
    stripeAccountId: '',
    stripeConnected: false,
    // PayPal
    paypalEmail: '',
    // Wise & International Wire
    accountHolder: '',
    iban: '',
    swiftBic: '',
    bankCountry: 'United States',
    bankName: '',
    // Payoneer
    payoneerEmail: '',
    // Crypto USDT
    cryptoAddress: '',
    cryptoNetwork: 'USDT-TRC20',
    // Local Moroccan fallback
    moroccoRib: '',
    moroccoBankName: 'CIH Bank',
  })

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

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
      const [statsRes, setRes] = await Promise.all([
        fetch(`/api/payouts/stats${q}`),
        fetch(`/api/payouts/settings${q}`),
      ])

      if (statsRes.ok) {
        const json = await statsRes.json()
        if (json.stats) setStats(json.stats)
        if (json.transactions) setTransactions(json.transactions)
        if (json.payoutRequests) setPayoutRequests(json.payoutRequests)
        if (json.platformOverview) setPlatformOverview(json.platformOverview)
      }

      if (setRes.ok) {
        const json = await setRes.json()
        if (json.settings) setSettings((prev) => ({ ...prev, ...json.settings }))
      }
    } catch (e) {
      console.error('Failed to load payouts data:', e)
    }
  }

  async function handleSaveSettings(e) {
    if (e) e.preventDefault()
    setSavingSettings(true)
    setSaveSuccessMsg('')
    try {
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
        setSaveSuccessMsg('✅ Global payout settings updated successfully!')
        setTimeout(() => setSaveSuccessMsg(''), 3500)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleRequestWithdraw(e) {
    if (e) e.preventDefault()
    const amountNum = parseFloat(withdrawAmount)
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid withdrawal amount.')
      return
    }
    if (amountNum > stats.availableBalance) {
      alert(`The amount exceeds your available balance (${stats.availableBalance} ${currSym}).`)
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
        alert(`🎉 Global withdrawal request of ${amountNum} ${currSym} submitted successfully!`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSimulateSale() {
    const samplePrice = prompt(`Enter a sale amount to simulate in ${currSym} (e.g. 50):`, '50')
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
            name: 'Digital Masterclass / Ebook Pack',
            price: `${currSym}${samplePrice}`,
            currency: currSym,
            category: 'course',
          },
          buyer: {
            name: 'International Customer (US/EU)',
            email: 'customer@world.com',
            phone: '+1 415 555 2671',
          },
          paymentMethod: 'card_stripe',
        }),
      })

      if (res.ok) {
        const json = await res.json()
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
        } catch (e) {}
        loadData()
        alert(
          `🎉 Global 9% Split Sale Processed!\n• Gross Price: ${currSym}${json.breakdown.grossAmount}\n• You Receive (91% Net): ${currSym}${json.breakdown.sellerNet91Percent}\n• Platform Keeps (9% Fee): ${currSym}${json.breakdown.platformFee9Percent}`
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleConnectStripe() {
    const mockAccountId = 'acct_1M' + Math.random().toString(36).substr(2, 9).toUpperCase()
    const updated = {
      ...settings,
      stripeAccountId: mockAccountId,
      stripeConnected: true,
      payoutMethod: 'stripe',
    }
    setSettings(updated)

    await fetch('/api/payouts/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId, settings: updated }),
    })

    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } })
    } catch (e) {}
    alert(
      `🎉 Stripe Connect Worldwide Active!\nConnected Account ID: ${mockAccountId}\nAll Visa, MasterCard, Apple Pay & Google Pay transactions across 130+ countries will auto-split 91% directly to you and 9% platform fees.`
    )
  }

  async function handleApprovePayout(payoutId) {
    if (!confirm('Mark this global payout request as settled & transferred to creator?')) return
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
                    Worldwide Creator Wallet & 9% Platform Split
                  </h2>
                  <span style={{ background: '#14B8A625', color: '#2DD4BF', border: '1px solid #14B8A650', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 100 }}>
                    Global (Todo el Mundo)
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
                  Sell worldwide & receive <span style={{ color: '#2DD4BF', fontWeight: 800 }}>91% Net Payout</span> directly to your International Bank, Stripe, PayPal, Wise, Payoneer or Crypto · Platform fee is only <span style={{ color: '#FBBF24', fontWeight: 800 }}>9%</span>.
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
                <span>🌍 Request Global Payout</span>
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
              Your Net Available (91%)
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
              Total Worldwide Sales
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
              Platform Processing (9%)
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
              Total Paid Out
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

      {/* Sub-Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 6, overflowX: 'auto' }}>
        {[
          { id: 'global', label: '🌍 Global Payout Methods (Wise, PayPal, Bank, Crypto)', icon: '🌐' },
          { id: 'stripe', label: '💳 Stripe Connect (130+ Countries Auto-Split)', icon: '⚡' },
          { id: 'history', label: `📋 Sales Ledger & 9% Split (${transactions.length})`, icon: '📊' },
          { id: 'calculator', label: '🧮 9% Fee Calculator', icon: '🔢' },
          { id: 'admin', label: '👑 Admin Global Overview', icon: '🛡️' },
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

      {/* SUB-TAB 1: Global Payout Methods (PayPal, Wise, Payoneer, IBAN, Crypto, etc.) */}
      {activeSubTab === 'global' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              🌍 Configure Your International Payout Destination
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748B' }}>
              Choose where you want your 91% net revenue sent anywhere in the world. Supports USD, EUR, GBP, Wise, PayPal, Payoneer, International IBAN, or USDT Crypto.
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
              Select Your Preferred Global Payout Method:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {GLOBAL_PAYOUT_METHODS.map((method) => {
                const isSelected = settings.payoutMethod === method.id
                return (
                  <div
                    key={method.id}
                    onClick={() => setSettings({ ...settings, payoutMethod: method.id })}
                    style={{
                      border: `2px solid ${isSelected ? '#14B8A6' : '#E2E8F0'}`,
                      background: isSelected ? '#F0FDFA' : '#FAFAFA',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 20 }}>{method.icon}</span>
                      {isSelected && <span style={{ color: '#0D9488', fontWeight: 800, fontSize: 12 }}>✓ ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                      {method.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{method.region}</div>
                    <div style={{ fontSize: 10.5, color: '#14B8A6', fontWeight: 600, marginTop: 4 }}>{method.feeInfo}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Currency Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Default Currency Display
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
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
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
                  Beneficiary Full Name / Business Name
                </label>
                <input
                  placeholder="e.g. John Doe / Studio LLC"
                  value={settings.accountHolder}
                  onChange={(e) => setSettings({ ...settings, accountHolder: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: 13.5,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* DYNAMIC FIELDS PER METHOD */}
            {/* 1. PAYPAL */}
            {settings.payoutMethod === 'paypal' && (
              <div style={{ background: '#0079C10D', border: '1px solid #0079C130', borderRadius: 14, padding: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0079C1', display: 'block', marginBottom: 6 }}>
                  🅿️ PayPal Email Address (Where payouts will be sent)
                </label>
                <input
                  type="email"
                  placeholder="your-paypal-email@example.com"
                  value={settings.paypalEmail}
                  onChange={(e) => setSettings({ ...settings, paypalEmail: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid #0079C160',
                    background: '#FFFFFF',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* 2. WISE / PAYONEER / INTERNATIONAL IBAN & SWIFT */}
            {(settings.payoutMethod === 'wise' || settings.payoutMethod === 'payoneer' || settings.payoutMethod === 'bank_iban') && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Bank Name & Country
                  </label>
                  <input
                    placeholder="e.g. Wise Europe SA / JP Morgan Chase, United States / Deutsche Bank, Germany"
                    value={settings.bankName}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    IBAN / Account Number
                  </label>
                  <input
                    placeholder="e.g. BE12 3456 7890 1234 or US Routing + Account"
                    value={settings.iban}
                    onChange={(e) => setSettings({ ...settings, iban: e.target.value.toUpperCase() })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, fontFamily: 'monospace', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    SWIFT / BIC Code
                  </label>
                  <input
                    placeholder="e.g. CHASUS33XXX / TRWIBEB1"
                    value={settings.swiftBic}
                    onChange={(e) => setSettings({ ...settings, swiftBic: e.target.value.toUpperCase() })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, fontFamily: 'monospace', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* 3. CRYPTO USDT */}
            {settings.payoutMethod === 'crypto_usdt' && (
              <div style={{ background: '#26A17B0D', border: '1px solid #26A17B30', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#26A17B', display: 'block', marginBottom: 6 }}>
                    Network / Blockchain
                  </label>
                  <select
                    value={settings.cryptoNetwork}
                    onChange={(e) => setSettings({ ...settings, cryptoNetwork: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                  >
                    <option value="USDT-TRC20">USDT (TRC-20 / Tron - Low Gas Fees)</option>
                    <option value="USDT-SOLANA">USDT (Solana - Super Fast)</option>
                    <option value="USDT-BEP20">USDT (Binance Smart Chain - BEP20)</option>
                    <option value="USDT-ERC20">USDT (Ethereum - ERC20)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#26A17B', display: 'block', marginBottom: 6 }}>
                    USDT Wallet Address (T... / 0x...)
                  </label>
                  <input
                    placeholder="e.g. TXyz1234567890abcdef..."
                    value={settings.cryptoAddress}
                    onChange={(e) => setSettings({ ...settings, cryptoAddress: e.target.value.trim() })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* 4. MOROCCO LOCAL FALLBACK */}
            {settings.payoutMethod === 'local_morocco' && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Moroccan Bank
                  </label>
                  <input
                    placeholder="CIH, Attijariwafa, BCP, CashPlus..."
                    value={settings.moroccoBankName}
                    onChange={(e) => setSettings({ ...settings, moroccoBankName: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    RIB (24 Digits)
                  </label>
                  <input
                    placeholder="230 780 1234567890123456 89"
                    value={settings.moroccoRib}
                    onChange={(e) => setSettings({ ...settings, moroccoRib: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, fontFamily: 'monospace', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="submit"
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
                <span>💾 Save Worldwide Payout Settings</span>
              </button>
            </div>
          </form>

          {/* Past Payout Requests */}
          {payoutRequests.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                Recent Withdrawal Requests
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
                💳 Stripe Connect (130+ Countries Global Direct Card Checkout)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748B' }}>
                Accept credit card payments worldwide (Visa, MasterCard, Amex, Apple Pay, Google Pay). 91% instantly lands in your local bank account, and 9% platform fees are automatically deducted at checkout time.
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
              <span>{settings.stripeConnected ? '🟢 Active & Linked Worldwide' : '⚪ Not Connected'}</span>
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
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <div>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#635BFF' }}>
                  How Global Stripe Split Payment Works:
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#475569' }}>
                  Buyer anywhere in the world buys your digital pack for $100 ➔ Stripe checkout applies <code style={{ background: '#FFFFFF', padding: '1px 5px', borderRadius: 4 }}>application_fee_amount: 9%</code>. You get <strong>$91.00</strong> straight to your bank, and platform receives $9.00!
                </p>
              </div>
            </div>

            {settings.stripeConnected ? (
              <div style={{ marginTop: 8, background: '#FFFFFF', borderRadius: 14, padding: '14px 16px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Stripe Connected Account ID:
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 14.5, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                      {settings.stripeAccountId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, stripeConnected: false, stripeAccountId: '' })
                      alert('Stripe account unlinked.')
                    }}
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
                    Unlink
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  style={{
                    background: '#635BFF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '13px 22px',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(99,91,255,0.3)',
                  }}
                >
                  <span>Connect Stripe Worldwide Account (1-Click)</span>
                  <span>➔</span>
                </button>
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
              🧮 9% Fee & Profit Split Calculator
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
              Type any product price to preview the exact math of the 9% platform commission and 91% net payout.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Product Price:</label>
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
                🎉 You Get (91% Net Payout)
              </span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#065F46', marginTop: 4 }}>
                {currSym}{calcSellerNet.toFixed(2)}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#047857' }}>Transferred to your bank, Stripe, Wise or PayPal</p>
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '16px' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                ⚡ Platform Retains (9% Fee)
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
                🌍 Withdraw 91% Net Earnings
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
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>Available Balance:</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>
                {currSym}
                {stats.availableBalance.toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleRequestWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Withdrawal Amount ({currSym})
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
                  Transfer Destination
                </label>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>Method: {settings.payoutMethod?.toUpperCase()}</div>
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
                Confirm Global Transfer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
