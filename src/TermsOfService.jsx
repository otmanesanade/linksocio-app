import { useLanguage } from './context/LanguageContext'
import LanguageSwitcher from './components/LanguageSwitcher'

export default function TermsOfService({ goBack }) {
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
          {t('legal.termsTitle', 'Terms of Service')}
        </h1>
        <p style={{ fontSize: 13, color: '#8A97A3', marginTop: 8 }}>
          {t('legal.lastUpdated', 'Last updated: August 2026')}
        </p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24, fontSize: 14, lineHeight: 1.7, color: '#0F172A' }}>
          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s1Title', '1. Acceptance of terms')}</h2>
            <p style={pStyle}>{t('legal.terms.s1Text', 'By creating a LinkSocio account or using linksocio.com, you agree to these Terms of Service. If you do not agree, please do not use the service.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s2Title', '2. Your account')}</h2>
            <p style={pStyle}>{t('legal.terms.s2Text', 'You are responsible for the content you add to your LinkSocio page, including links, product listings, images, and text. You must not use LinkSocio to share illegal content, impersonate others, or link to malicious or fraudulent websites.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s3Title', '3. Acceptable use')}</h2>
            <p style={pStyle}>{t('legal.terms.s3Text', "You agree not to misuse the service — including attempting to disrupt LinkSocio's systems, scraping other users' data, or using the platform to spam or harass others.")}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s4Title', '4. Content ownership')}</h2>
            <p style={pStyle}>{t('legal.terms.s4Text', 'You retain ownership of the content you add to your page. By publishing it on LinkSocio, you grant us permission to display it publicly at your chosen URL (linksocio.com/yourusername).')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s5Title', '5. Service availability')}</h2>
            <p style={pStyle}>{t('legal.terms.s5Text', 'We aim to keep LinkSocio available at all times but do not guarantee uninterrupted access. Features may change, be added, or be removed as the product evolves.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s6Title', '6. Account termination')}</h2>
            <p style={pStyle}>{t('legal.terms.s6Text', 'We reserve the right to suspend or terminate accounts that violate these terms, including accounts used for spam, fraud, or illegal activity.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s7Title', '7. Limitation of liability')}</h2>
            <p style={pStyle}>{t('legal.terms.s7Text', 'LinkSocio is provided "as is" without warranties of any kind. We are not liable for any damages resulting from the use of, or inability to use, the service.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s8Title', '8. Changes to these terms')}</h2>
            <p style={pStyle}>{t('legal.terms.s8Text', 'We may update these Terms of Service from time to time. Continued use of LinkSocio after changes means you accept the updated terms.')}</p>
          </section>

          <section>
            <h2 style={sectionTitle}>{t('legal.terms.s9Title', '9. Contact')}</h2>
            <p style={pStyle}>
              {t('legal.terms.s9Text', 'Questions about these terms? Contact us at')}{' '}
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

