import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'

export const AVAILABLE_CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar', label: '$ USD' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro', label: '€ EUR' },
  { code: 'MAD', symbol: 'DH', flag: '🇲🇦', name: 'Moroccan Dirham', label: 'DH MAD' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound', label: '£ GBP' },
  { code: 'SAR', symbol: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal (ريال)', label: 'SAR ريال' },
  { code: 'AED', symbol: 'AED', flag: '🇦🇪', name: 'UAE Dirham (درهم)', label: 'AED درهم' },
  { code: 'CAD', symbol: 'CA$', flag: '🇨🇦', name: 'Canadian Dollar', label: 'CA$ CAD' },
  { code: 'USDT', symbol: 'USDT', flag: '🟢', name: 'USDT Tether Crypto', label: 'USDT' },
]

export default function CurrencySwitcher({
  variant = 'compact', // 'compact' | 'pill' | 'minimal' | 'full'
  theme = 'light',
  className = '',
  style = {},
  user = null,
  profile = null,
  onCurrencyChanged = null,
}) {
  const { t, isRTL } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const [currentCode, setCurrentCode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const creatorCurr = localStorage.getItem('linksocio_creator_currency') || localStorage.getItem('linksocio_wallet_currency')
        if (creatorCurr) {
          const parsed = JSON.parse(creatorCurr)
          if (parsed.code) return parsed.code
        }
        const u = profile?.username || user?.user_metadata?.username || ''
        const cached = localStorage.getItem(`linksocio_payout_settings_${u}`) || localStorage.getItem('linksocio_payout_settings_default')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.selectedCurrency) return parsed.selectedCurrency
        }
      } catch (e) {}
    }
    return 'USD'
  })

  // Keep in sync with custom events triggered across the app
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail?.code && e.detail.code !== currentCode) {
        setCurrentCode(e.detail.code)
      }
    }
    window.addEventListener('linksocio:currency_changed', handleSync)
    return () => window.removeEventListener('linksocio:currency_changed', handleSync)
  }, [currentCode])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const activeCurrency = AVAILABLE_CURRENCIES.find((c) => c.code === currentCode) || AVAILABLE_CURRENCIES[0]
  const isDark = theme === 'dark'

  function handleSelect(c) {
    setCurrentCode(c.code)
    setIsOpen(false)

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('linksocio_creator_currency', JSON.stringify({ code: c.code, symbol: c.symbol }))
        localStorage.setItem('linksocio_wallet_currency', JSON.stringify({ code: c.code, symbol: c.symbol }))

        const u = profile?.username || user?.user_metadata?.username || 'default'
        const uid = profile?.id || user?.id || ''
        const cacheKey = `linksocio_payout_settings_${u || uid || 'default'}`
        const cached = localStorage.getItem(cacheKey) || localStorage.getItem('linksocio_payout_settings_default')
        let parsed = {}
        if (cached) {
          try { parsed = JSON.parse(cached) } catch (e) {}
        }
        const updated = {
          ...parsed,
          selectedCurrency: c.code,
          currencySymbol: c.symbol,
        }
        localStorage.setItem(cacheKey, JSON.stringify(updated))
        localStorage.setItem('linksocio_payout_settings_default', JSON.stringify(updated))
        localStorage.setItem('linksocio_payout_settings_otman', JSON.stringify(updated))

        // Notify entire app of currency change
        window.dispatchEvent(
          new CustomEvent('linksocio:currency_changed', {
            detail: { code: c.code, symbol: c.symbol },
          })
        )
      }
    } catch (e) {}

    // Persist to backend asynchronously
    fetch('/api/payouts/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: profile?.username || user?.user_metadata?.username || 'otman',
        userId: profile?.id || user?.id || 'default',
        settings: {
          selectedCurrency: c.code,
          currencySymbol: c.symbol,
        },
      }),
    }).catch(() => {})

    if (onCurrencyChanged) {
      onCurrencyChanged(c)
    }
  }

  return (
    <div
      ref={dropdownRef}
      className={`currency-switcher-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontFamily: 'inherit',
        zIndex: 50,
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change currency"
        aria-expanded={isOpen}
        title={t('currencySwitcher.chooseCurrencyTooltip', 'Devise de votre boutique et portefeuille (USD, EUR, DH, etc.)')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #E2E8F0',
          borderRadius: variant === 'pill' ? 100 : 10,
          padding: variant === 'compact' ? '5px 9px' : '7px 12px',
          fontSize: variant === 'compact' ? 12 : 13,
          fontWeight: 700,
          color: isDark ? '#FFFFFF' : '#0F172A',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 13 }}>{activeCurrency.flag}</span>
        <span style={{ fontWeight: 800 }}>{activeCurrency.symbol}</span>
        <span style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>{activeCurrency.code}</span>
        <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 1 }}>▼</span>
      </button>

      {isOpen && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [isRTL ? 'left' : 'right']: 0,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: 6,
            minWidth: 210,
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid #F1F5F9', marginBottom: 2 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('currencySwitcher.title', 'Devise Créateur (Store & Wallet)')}
            </span>
          </div>

          {AVAILABLE_CURRENCIES.map((c) => {
            const isSelected = c.code === currentCode
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: isSelected ? '#F0FDF4' : 'transparent',
                  color: isSelected ? '#166534' : '#0F172A',
                  fontSize: 12.5,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: isRTL ? 'right' : 'left',
                  width: '100%',
                  transition: 'background 0.1s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{c.flag}</span>
                  <span style={{ fontWeight: 700 }}>{c.symbol}</span>
                  <span style={{ color: isSelected ? '#15803D' : '#475569' }}>{c.name}</span>
                </div>
                {isSelected && <span style={{ color: '#16A34A', fontWeight: 800, fontSize: 12 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
