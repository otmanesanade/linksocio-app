import React, { createContext, useContext, useState, useEffect } from 'react'
import { TRANSLATIONS } from '../translations'

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🌐', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🌍', dir: 'rtl' },
]

export { TRANSLATIONS }

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (path, fallback) => fallback || path,
  dir: 'ltr',
  isRTL: false,
  isAuto: true,
  autoDetectedLanguage: 'en',
  availableLanguages: LANGUAGES,
})

const MANUAL_STORAGE_KEY = 'linksocio_manual_language'

// Detect preferred language from client phone / browser settings
export function detectDeviceLanguage() {
  try {
    // 1. URL parameter override (?lang=ar, ?lang=fr, ?lang=en, ?lang=es)
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search)
      const urlLang = params.get('lang')?.toLowerCase()
      if (urlLang && LANGUAGES.some((l) => l.code === urlLang)) {
        return urlLang
      }
    }

    // 2. Client phone / device languages list (iPhone, Android, tablet, PC)
    if (typeof navigator !== 'undefined') {
      const deviceCandidates = [
        ...(Array.isArray(navigator.languages) ? navigator.languages : []),
        navigator.language,
        navigator.userLanguage,
        navigator.browserLanguage,
      ].filter(Boolean)

      for (const rawLang of deviceCandidates) {
        const code = String(rawLang).toLowerCase()
        if (code.startsWith('ar') || code === 'ary' || code.includes('-ma') || code.includes('-sa')) {
          return 'ar'
        }
        if (code.startsWith('fr')) {
          return 'fr'
        }
        if (code.startsWith('es')) {
          return 'es'
        }
        if (code.startsWith('en')) {
          return 'en'
        }
      }
    }

    // 3. Region/Timezone heuristic (Morocco / North Africa / Europe)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() || ''
      if (tz.includes('casablanca') || tz.includes('morocco') || tz.includes('tunis') || tz.includes('algiers')) {
        return 'fr' // Standard primary French/Arabic in Maghreb
      }
      if (tz.includes('paris') || tz.includes('brussels') || tz.includes('geneva')) {
        return 'fr'
      }
      if (tz.includes('madrid')) {
        return 'es'
      }
    }
  } catch {
    // ignore
  }
  return 'fr' // Default friendly fallback for international / Morocco
}

export function LanguageProvider({ children }) {
  // Check if user explicitly chose a language or is in automatic mode
  const [isAuto, setIsAuto] = useState(() => {
    if (typeof localStorage === 'undefined') return true
    const saved = localStorage.getItem(MANUAL_STORAGE_KEY)
    return !saved || saved === 'auto'
  })

  const [deviceLang, setDeviceLang] = useState(() => detectDeviceLanguage())

  const [manualLang, setManualLang] = useState(() => {
    if (typeof localStorage === 'undefined') return null
    const saved = localStorage.getItem(MANUAL_STORAGE_KEY)
    if (!saved || saved === 'auto') return null
    return LANGUAGES.some((l) => l.code === saved) ? saved : null
  })

  // The active language: either manual preference or auto-detected device language
  const activeLangCode = isAuto || !manualLang ? deviceLang : manualLang
  const currentLangObj = LANGUAGES.find((l) => l.code === activeLangCode) || LANGUAGES[1] || LANGUAGES[0]
  const dir = currentLangObj.dir || 'ltr'
  const isRTL = dir === 'rtl'

  useEffect(() => {
    document.documentElement.lang = activeLangCode
    document.documentElement.dir = dir

    if (isRTL) {
      document.body.classList.add('rtl-layout')
    } else {
      document.body.classList.remove('rtl-layout')
    }
  }, [activeLangCode, dir, isRTL])

  // Listen for device language changes in real-time
  useEffect(() => {
    function handleDeviceLanguageChange() {
      const detected = detectDeviceLanguage()
      if (detected) {
        setDeviceLang(detected)
      }
    }

    window.addEventListener('languagechange', handleDeviceLanguageChange)
    return () => window.removeEventListener('languagechange', handleDeviceLanguageChange)
  }, [])

  function setLanguage(newLang) {
    if (newLang === 'auto') {
      try {
        localStorage.setItem(MANUAL_STORAGE_KEY, 'auto')
      } catch {
        // ignore
      }
      setIsAuto(true)
      setManualLang(null)
      setDeviceLang(detectDeviceLanguage())
      return
    }

    if (LANGUAGES.some((l) => l.code === newLang)) {
      try {
        localStorage.setItem(MANUAL_STORAGE_KEY, newLang)
      } catch {
        // ignore
      }
      setIsAuto(false)
      setManualLang(newLang)
    }
  }

  // Helper function to get translation using dot notation (e.g. 'landing.hero.title1')
  function t(path, fallback = '') {
    if (!path) return fallback
    const parts = path.split('.')
    let current = TRANSLATIONS[activeLangCode]
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        // Fallback to French or English
        let fallbackCurrent = TRANSLATIONS.fr || TRANSLATIONS.en
        for (const enPart of parts) {
          if (fallbackCurrent && typeof fallbackCurrent === 'object' && enPart in fallbackCurrent) {
            fallbackCurrent = fallbackCurrent[enPart]
          } else {
            return fallback || path
          }
        }
        return (typeof fallbackCurrent === 'string' ? fallbackCurrent : '') || fallback || path
      }
    }
    return typeof current === 'string' ? current : fallback || path
  }

  return (
    <LanguageContext.Provider
      value={{
        language: activeLangCode,
        setLanguage,
        t,
        dir,
        isRTL,
        isAuto,
        autoDetectedLanguage: deviceLang,
        availableLanguages: LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
