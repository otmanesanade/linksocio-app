import React, { createContext, useContext, useState, useEffect } from 'react'
import { TRANSLATIONS } from '../translations'

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇲🇦', dir: 'rtl' },
]

export { TRANSLATIONS }

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (path, fallback) => fallback || path,
  dir: 'ltr',
  isRTL: false,
  availableLanguages: LANGUAGES,
})

const MANUAL_STORAGE_KEY = 'linksocio_manual_language'

// Detect preferred language from client phone / browser settings
function detectDeviceLanguage() {
  try {
    // 1. URL parameter override (?lang=ar, ?lang=fr, ?lang=en, ?lang=es)
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search)
      const urlLang = params.get('lang')?.toLowerCase()
      if (urlLang && LANGUAGES.some((l) => l.code === urlLang)) {
        return urlLang
      }
    }

    // 2. Explicit manual user choice saved in previous session
    if (typeof localStorage !== 'undefined') {
      const manual = localStorage.getItem(MANUAL_STORAGE_KEY)
      if (manual && LANGUAGES.some((l) => l.code === manual)) {
        return manual
      }
    }

    // 3. Client phone / device languages list (iPhone, Android, tablet, etc.)
    if (typeof navigator !== 'undefined') {
      const deviceCandidates = [
        ...(Array.isArray(navigator.languages) ? navigator.languages : []),
        navigator.language,
        navigator.userLanguage,
        navigator.browserLanguage,
      ].filter(Boolean)

      for (const rawLang of deviceCandidates) {
        const primaryCode = String(rawLang).split(/[-_]/)[0].toLowerCase()
        if (LANGUAGES.some((l) => l.code === primaryCode)) {
          return primaryCode
        }
      }
    }
  } catch {
    // ignore
  }
  return 'en'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => detectDeviceLanguage())

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]
  const dir = currentLangObj.dir || 'ltr'
  const isRTL = dir === 'rtl'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir

    if (isRTL) {
      document.body.classList.add('rtl-layout')
    } else {
      document.body.classList.remove('rtl-layout')
    }
  }, [language, dir, isRTL])

  // Listen for device language changes in real-time if client hasn't manually locked one
  useEffect(() => {
    function handleDeviceLanguageChange() {
      const hasManualChoice = typeof localStorage !== 'undefined' && localStorage.getItem(MANUAL_STORAGE_KEY)
      if (!hasManualChoice) {
        const detected = detectDeviceLanguage()
        if (detected && detected !== language) {
          setLanguageState(detected)
        }
      }
    }

    window.addEventListener('languagechange', handleDeviceLanguageChange)
    return () => window.removeEventListener('languagechange', handleDeviceLanguageChange)
  }, [language])

  function setLanguage(newLang) {
    if (LANGUAGES.some((l) => l.code === newLang)) {
      try {
        localStorage.setItem(MANUAL_STORAGE_KEY, newLang)
      } catch {
        // ignore
      }
      setLanguageState(newLang)
    }
  }

  // Helper function to get translation using dot notation (e.g. 'landing.hero.title1')
  function t(path, fallback = '') {
    if (!path) return fallback
    const parts = path.split('.')
    let current = TRANSLATIONS[language]
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        // Fallback to English
        let enCurrent = TRANSLATIONS.en
        for (const enPart of parts) {
          if (enCurrent && typeof enCurrent === 'object' && enPart in enCurrent) {
            enCurrent = enCurrent[enPart]
          } else {
            return fallback || path
          }
        }
        return (typeof enCurrent === 'string' ? enCurrent : '') || fallback || path
      }
    }
    return typeof current === 'string' ? current : fallback || path
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        isRTL,
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
