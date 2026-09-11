import React, { useState, useRef, useEffect } from 'react'
import { useLanguage, LANGUAGES } from '../context/LanguageContext'

export default function LanguageSwitcher({
  variant = 'default', // 'default' | 'pill' | 'minimal' | 'compact'
  theme = 'light',     // 'light' | 'dark'
  className = '',
  style = {},
}) {
  const { language, setLanguage, isRTL } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

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

  const isDark = theme === 'dark'

  return (
    <div
      ref={dropdownRef}
      className={`language-switcher-wrapper ${className}`}
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
        aria-label="Change language"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #E2E8F0',
          borderRadius: variant === 'pill' ? 100 : 10,
          padding: variant === 'compact' ? '5px 8px' : '7px 11px',
          fontSize: variant === 'compact' ? 12 : 13,
          fontWeight: 600,
          color: isDark ? '#FFFFFF' : '#1E293B',
          cursor: 'pointer',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: variant === 'compact' ? 13 : 14 }}>{current.flag}</span>
        <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{current.code.toUpperCase()}</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            opacity: 0.65,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [isRTL ? 'left' : 'right']: 0,
            minWidth: 145,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: 5,
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            animation: 'linksocio_dropdown_fade 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code)
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  width: '100%',
                  background: isSelected ? '#F0FDFA' : 'transparent',
                  border: 'none',
                  borderRadius: 9,
                  padding: '8px 10px',
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#0D9488' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#F8FAFC'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{lang.flag}</span>
                  <span style={{ fontSize: 13 }}>{lang.name}</span>
                </div>
                {isSelected && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0D9488' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
