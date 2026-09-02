import { useState, useEffect, useRef } from 'react'

export const COUNTRIES = [
  { code: '212', flag: '🇲🇦', name: 'Morocco', ar: 'المغرب', placeholder: '6 12 34 56 78' },
  { code: '966', flag: '🇸🇦', name: 'Saudi Arabia', ar: 'السعودية', placeholder: '50 123 4567' },
  { code: '971', flag: '🇦🇪', name: 'United Arab Emirates', ar: 'الإمارات', placeholder: '50 123 4567' },
  { code: '33', flag: '🇫🇷', name: 'France', ar: 'فرنسا', placeholder: '6 12 34 56 78' },
  { code: '34', flag: '🇪🇸', name: 'Spain', ar: 'إسبانيا', placeholder: '612 34 56 78' },
  { code: '213', flag: '🇩🇿', name: 'Algeria', ar: 'الجزائر', placeholder: '550 12 34 56' },
  { code: '216', flag: '🇹🇳', name: 'Tunisia', ar: 'تونس', placeholder: '20 123 456' },
  { code: '20', flag: '🇪🇬', name: 'Egypt', ar: 'مصر', placeholder: '100 123 4567' },
  { code: '974', flag: '🇶🇦', name: 'Qatar', ar: 'قطر', placeholder: '3312 3456' },
  { code: '965', flag: '🇰🇼', name: 'Kuwait', ar: 'الكويت', placeholder: '5123 4567' },
  { code: '973', flag: '🇧🇭', name: 'Bahrain', ar: 'البحرين', placeholder: '3600 1234' },
  { code: '968', flag: '🇴🇲', name: 'Oman', ar: 'عمان', placeholder: '9123 4567' },
  { code: '962', flag: '🇯🇴', name: 'Jordan', ar: 'الأردن', placeholder: '7 9012 3456' },
  { code: '961', flag: '🇱🇧', name: 'Lebanon', ar: 'لبنان', placeholder: '70 123 456' },
  { code: '964', flag: '🇮🇶', name: 'Iraq', ar: 'العراق', placeholder: '770 123 4567' },
  { code: '1', flag: '🇺🇸', name: 'United States / Canada', ar: 'أمريكا / كندا', placeholder: '202 555 0123' },
  { code: '44', flag: '🇬🇧', name: 'United Kingdom', ar: 'بريطانيا', placeholder: '7911 123456' },
  { code: '49', flag: '🇩🇪', name: 'Germany', ar: 'ألمانيا', placeholder: '151 12345678' },
  { code: '39', flag: '🇮🇹', name: 'Italy', ar: 'إيطاليا', placeholder: '312 345 6789' },
  { code: '32', flag: '🇧🇪', name: 'Belgium', ar: 'بلجيكا', placeholder: '470 12 34 56' },
  { code: '31', flag: '🇳🇱', name: 'Netherlands', ar: 'هولندا', placeholder: '6 12345678' },
  { code: '41', flag: '🇨🇭', name: 'Switzerland', ar: 'سويسرا', placeholder: '78 123 45 67' },
  { code: '90', flag: '🇹🇷', name: 'Turkey', ar: 'تركيا', placeholder: '532 123 4567' },
  { code: '221', flag: '🇸🇳', name: 'Senegal', ar: 'السنغال', placeholder: '70 123 45 67' },
  { code: '225', flag: '🇨🇮', name: 'Ivory Coast', ar: 'ساحل العاج', placeholder: '01 23 45 67 89' },
  { code: '222', flag: '🇲🇷', name: 'Mauritania', ar: 'موريتانيا', placeholder: '46 12 34 56' },
  { code: '218', flag: '🇱🇾', name: 'Libya', ar: 'ليبيا', placeholder: '91 123 4567' },
  { code: '249', flag: '🇸🇩', name: 'Sudan', ar: 'السودان', placeholder: '91 234 5678' },
  { code: '970', flag: '🇵🇸', name: 'Palestine', ar: 'فلسطين', placeholder: '59 123 4567' },
  { code: '967', flag: '🇾🇪', name: 'Yemen', ar: 'اليمن', placeholder: '71 234 5678' },
  { code: '46', flag: '🇸🇪', name: 'Sweden', ar: 'السويد', placeholder: '70 123 45 67' },
  { code: '47', flag: '🇳🇴', name: 'Norway', ar: 'النرويج', placeholder: '412 34 567' },
  { code: '45', flag: '🇩🇰', name: 'Denmark', ar: 'الدانمارك', placeholder: '20 12 34 56' },
  { code: '351', flag: '🇵🇹', name: 'Portugal', ar: 'البرتغال', placeholder: '912 345 678' },
  { code: '86', flag: '🇨🇳', name: 'China', ar: 'الصين', placeholder: '138 1234 5678' },
  { code: '91', flag: '🇮🇳', name: 'India', ar: 'الهند', placeholder: '98765 43210' },
  { code: '55', flag: '🇧🇷', name: 'Brazil', ar: 'البرازيل', placeholder: '11 91234 5678' },
  { code: '61', flag: '🇦🇺', name: 'Australia', ar: 'أستراليا', placeholder: '412 345 678' },
  { code: '7', flag: '🇷🇺', name: 'Russia', ar: 'روسيا', placeholder: '912 345 6789' },
]

export default function CountryPhoneInput({
  value = '',
  onChange,
  placeholder = 'Phone number',
  required = false,
  theme = {},
  isEmbedded = false,
  label = '',
  defaultCountryCode = '212',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(() => {
    // Detect country from existing value if any
    const clean = String(value || '').replace(/^\+/, '')
    const matched = COUNTRIES.find((c) => clean.startsWith(c.code))
    return matched || COUNTRIES.find((c) => c.code === defaultCountryCode) || COUNTRIES[0]
  })

  const [localNumber, setLocalNumber] = useState(() => {
    if (!value) return ''
    const clean = String(value || '').replace(/^\+/, '')
    if (clean.startsWith(selectedCountry.code)) {
      return clean.slice(selectedCountry.code.length)
    }
    return clean
  })

  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Auto focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [isOpen])

  // Sync if value prop changes externally
  useEffect(() => {
    if (!value) {
      setLocalNumber('')
      return
    }
    const clean = String(value).replace(/^\+/, '')
    const matched = COUNTRIES.find((c) => clean.startsWith(c.code))
    if (matched) {
      setSelectedCountry(matched)
      setLocalNumber(clean.slice(matched.code.length))
    } else {
      setLocalNumber(clean)
    }
  }, [value])

  function handleCountrySelect(country) {
    setSelectedCountry(country)
    setIsOpen(false)

    // Reconstruct full formatted phone
    const cleanDigits = localNumber.replace(/[^0-9]/g, '')
    const fullPhone = cleanDigits ? `+${country.code}${cleanDigits}` : ''
    if (onChange) {
      onChange(fullPhone)
    }
  }

  function handleNumberChange(e) {
    const raw = e.target.value
    // Remove leading zeros if user types 06...
    let clean = raw.replace(/[^0-9]/g, '')
    if (clean.startsWith('0') && selectedCountry.code !== '1') {
      clean = clean.replace(/^0+/, '')
    }
    setLocalNumber(clean)

    const fullPhone = clean ? `+${selectedCountry.code}${clean}` : ''
    if (onChange) {
      onChange(fullPhone)
    }
  }

  const filteredCountries = COUNTRIES.filter((c) => {
    if (!search.trim()) return true
    const s = search.toLowerCase().trim()
    return (
      c.name.toLowerCase().includes(s) ||
      (c.ar && c.ar.includes(s)) ||
      c.code.includes(s) ||
      `+${c.code}`.includes(s)
    )
  })

  const color = theme.accent || theme.btnColor || '#14B8A6'

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: isEmbedded ? 11 : 12.5,
            fontWeight: 700,
            color: theme.textColor || '#334155',
            marginBottom: 4,
          }}
        >
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}

      {/* Input Group Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 12,
          border: isOpen ? `2px solid ${color}` : `1px solid ${color}40`,
          background: 'rgba(255, 255, 255, 0.95)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? `0 0 0 3px ${color}20` : 'none',
        }}
      >
        {/* Country Picker Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: isEmbedded ? '8px 8px' : '10px 10px',
            background: '#F8FAFC',
            border: 'none',
            borderRight: '1px solid #CBD5E1',
            cursor: 'pointer',
            fontSize: isEmbedded ? 12 : 13,
            fontWeight: 700,
            color: '#0F172A',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background 0.15s ease',
          }}
          title="Click to select country code"
        >
          <span style={{ fontSize: isEmbedded ? 15 : 17 }}>{selectedCountry.flag}</span>
          <span style={{ fontFamily: 'monospace', fontSize: isEmbedded ? 11.5 : 12.5, color: '#334155' }}>
            +{selectedCountry.code}
          </span>
          <span style={{ fontSize: 9, color: '#94A3B8', marginLeft: -1 }}>▼</span>
        </button>

        {/* Local Number Input Field */}
        <input
          type="tel"
          required={required}
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder || selectedCountry.placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            padding: isEmbedded ? '8px 10px' : '10px 12px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: '#0F172A',
            fontSize: isEmbedded ? 12 : 13.5,
            fontFamily: 'inherit',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        />
      </div>

      {/* Country Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 250,
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #CBD5E1',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Search Box Header */}
          <div style={{ padding: '8px 10px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search country or +code..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
                background: '#FFFFFF',
              }}
            />
          </div>

          {/* List of Countries */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
                No country found
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code
                return (
                  <button
                    key={c.code + c.name}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: isSelected ? '#F0FDFA' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s ease',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#F8FAFC'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 16 }}>{c.flag}</span>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#0D9488' : '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.name} {c.ar ? `(${c.ar})` : ''}
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: isSelected ? '#0D9488' : '#64748B',
                        padding: '2px 6px',
                        background: isSelected ? '#CCFBF1' : '#F1F5F9',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      +{c.code}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
