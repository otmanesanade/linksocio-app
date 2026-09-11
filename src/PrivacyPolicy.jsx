import { useLanguage } from './context/LanguageContext'
import LanguageSwitcher from './components/LanguageSwitcher'

export default function PrivacyPolicy({ goBack }) {
  const { t, isRTL } = useLanguage()

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        background: '#F8FAFA',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '32px 20px 80px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 20, right: isRTL ? 'auto' : 20, left: isRTL ? 20 : 'auto' }}>
        <LanguageSwitcher />
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button
          onClick={goBack}
          style={{
            background: 'none',
            border: '1px solid #E7EDEC',
            borderRadius: 10,
            padding: '7px 14px',
            fontSize: 13,
            color: '#0F172A',
            cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          {t('legal.back', '← Back')}
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          {t('legal.privacyTitle', 'Privacy Policy')}
        </h1>
        <p style={{ fontSize: 13, color: '#8A97A3', marginTop: 8 }}>
          {t('legal.lastUpdated', 'Last updated: August 2026')}
        </p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24, fontSize: 14, lineHeight: 1.7, color: '#0F172A' }}>
          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s1Title', '1. Information we collect')}</h2>
            <p style={pStyle}>{t('legal.privacy.s1Text', 'When you create a LinkSocio account, we collect your email address, the username you choose, and any links, images, or product information you add to your page. We also record click counts on your links to provide you with analytics.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s2Title', '2. How we use your information')}</h2>
            <p style={pStyle}>{t('legal.privacy.s2Text', 'We use your information to operate your public LinkSocio page, let you log in to your dashboard, and show you analytics about your own links. We do not sell your personal data to third parties.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s3Title', '3. Public information')}</h2>
            <p style={pStyle}>{t('legal.privacy.s3Text', 'Your username, display name, bio, links, and shop products are publicly visible to anyone who visits your LinkSocio page (linksocio.com/yourusername). Do not add private or sensitive information to your public profile.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s4Title', '4. Data storage')}</h2>
            <p style={pStyle}>{t('legal.privacy.s4Text', 'Your data is stored securely using Supabase, our database provider. We take reasonable measures to protect your information from unauthorized access.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s5Title', '5. Your rights')}</h2>
            <p style={pStyle}>{t('legal.privacy.s5Text', 'You can update or delete your links, products, and profile information at any time from your dashboard. To request full account deletion, contact us using the details below.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s6Title', '6. Cookies')}</h2>
            <p style={pStyle}>{t('legal.privacy.s6Text', 'LinkSocio uses only the essential technical data needed to keep you logged in. We do not use third-party advertising or tracking cookies.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.privacy.s7Title', '7. Contact')}</h2>
            <p style={pStyle}>
              {t('legal.privacy.s7Text', 'If you have questions about this Privacy Policy or your data, contact us at')}{' '}
              <span style={{ color: '#14B8A6', fontWeight: 500 }}>support@linksocio.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

const sectionTitle = { fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 8px' }
const pStyle = { margin: 0, color: '#4B5563' }

