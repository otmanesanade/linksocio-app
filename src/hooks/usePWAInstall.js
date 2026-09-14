import { useEffect, useState } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [canInstall, setCanInstall] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if running in standalone mode (already installed on Home Screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')

    setIsInstalled(isStandalone)

    // Accurate iOS / iPadOS detection (including modern iPad reporting as Macintosh with maxTouchPoints)
    const ua = window.navigator.userAgent || ''
    const isIOSDevice =
      (/iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !window.MSStream

    setIsIOS(isIOSDevice)

    const handleBeforeInstallPrompt = (e) => {
      // Chrome/Edge/Android native prompt
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setCanInstall(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
      }
      setDeferredPrompt(null)
      return outcome
    }
    return null
  }

  return {
    deferredPrompt,
    isInstalled,
    isIOS,
    canInstall: !isInstalled,
    promptInstall,
  }
}
