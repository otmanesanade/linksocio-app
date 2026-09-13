import { useState } from 'react'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { useLanguage } from '../context/LanguageContext'

export default function PWAInstallButton({ variant = 'badge', style = {} }) {
  const { isInstalled, isIOS, canInstall, promptInstall } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)
  const { t } = useLanguage()

  // If already installed, hide prompt
  if (isInstalled) return null

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    const outcome = await promptInstall()
    if (!outcome) {
      // Fallback instructions if prompt couldn't trigger directly (e.g. desktop safari/firefox)
      setShowIOSModal(true)
    }
  }

  return (
    <>
      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15,23,42,0.15)',
            transition: 'all 0.2s ease',
            ...style,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📲</span>
            <span>{t('pwa.installApp', 'Install LinkSocio App')}</span>
          </div>
          <span
            style={{
              background: '#14B8A6',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 6,
              textTransform: 'uppercase',
            }}
          >
            PWA
          </span>
        </button>
      )}

      {variant === 'badge' && (
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
            color: '#0D9488',
            borderRadius: 100,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            ...style,
          }}
          title={t('pwa.installTitle', 'Add to your Home Screen as an app')}
        >
          <span>📲</span>
          <span>{t('pwa.installButton', 'Install App')}</span>
        </button>
      )}

      {variant === 'landing' && (
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #E2E8F0',
            color: '#0F172A',
            borderRadius: 14,
            padding: '8px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            whiteSpace: 'nowrap',
            ...style,
          }}
        >
          <span style={{ fontSize: 15 }}>📲</span>
          <span>{t('pwa.installButton', 'Install App')}</span>
        </button>
      )}

      {/* iOS / Browser Manual Add to Home Screen Modal */}
      {showIOSModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.7)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowIOSModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 22,
              padding: '24px 22px',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer',
                fontSize: 13,
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>

            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 46 46">
                <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
                <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#FFFFFF" strokeWidth="6" />
              </svg>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              {t('pwa.modalTitle', 'Install LinkSocio App')}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
              {t('pwa.modalDesc', 'Install this web app on your home screen for fast fullscreen access without an app store.')}
            </p>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '14px 16px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontSize: 13,
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>1️⃣</span>
                <span>
                  {t('pwa.step1', 'Tap the')} <strong>{t('pwa.shareIcon', 'Share button')}</strong> (
                  <span style={{ fontSize: 16 }}>⎋</span> or <span style={{ fontSize: 14 }}>⋮</span>)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>2️⃣</span>
                <span>
                  {t('pwa.step2', 'Scroll down and tap')} <strong>"{t('pwa.addToHome', 'Add to Home Screen')}"</strong> (➕)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>3️⃣</span>
                <span>
                  {t('pwa.step3', 'Tap')} <strong>"{t('pwa.add', 'Add')}"</strong> {t('pwa.step3Done', 'to finish. Ready!')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              style={{
                marginTop: 18,
                width: '100%',
                background: '#14B8A6',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('pwa.gotIt', 'Got it!')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
