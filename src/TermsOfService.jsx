export default function TermsOfService({ goBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFA', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', padding: '32px 20px 80px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button onClick={goBack} style={{ background: 'none', border: '1px solid #E7EDEC', borderRadius: 10, padding: '7px 14px', fontSize: 13, color: '#0F172A', cursor: 'pointer', marginBottom: 24 }}>
          ← Back
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: 0 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: '#8A97A3', marginTop: 8 }}>Last updated: August 2026</p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24, fontSize: 14, lineHeight: 1.7, color: '#0F172A' }}>
          <section>
            <h2 style={sectionTitle}>1. Acceptance of terms</h2>
            <p style={pStyle}>
              By creating a LinkSocio account or using linksocio.com, you agree to these Terms of Service. If you do
              not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>2. Your account</h2>
            <p style={pStyle}>
              You are responsible for the content you add to your LinkSocio page, including links, product listings,
              images, and text. You must not use LinkSocio to share illegal content, impersonate others, or link to
              malicious or fraudulent websites.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>3. Acceptable use</h2>
            <p style={pStyle}>
              You agree not to misuse the service — including attempting to disrupt LinkSocio's systems, scraping
              other users' data, or using the platform to spam or harass others.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>4. Content ownership</h2>
            <p style={pStyle}>
              You retain ownership of the content you add to your page. By publishing it on LinkSocio, you grant us
              permission to display it publicly at your chosen URL (linksocio.com/yourusername).
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>5. Service availability</h2>
            <p style={pStyle}>
              We aim to keep LinkSocio available at all times but do not guarantee uninterrupted access. Features may
              change, be added, or be removed as the product evolves.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>6. Account termination</h2>
            <p style={pStyle}>
              We reserve the right to suspend or terminate accounts that violate these terms, including accounts used
              for spam, fraud, or illegal activity.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>7. Limitation of liability</h2>
            <p style={pStyle}>
              LinkSocio is provided "as is" without warranties of any kind. We are not liable for any damages
              resulting from the use of, or inability to use, the service.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>8. Changes to these terms</h2>
            <p style={pStyle}>
              We may update these Terms of Service from time to time. Continued use of LinkSocio after changes means
              you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>9. Contact</h2>
            <p style={pStyle}>
              Questions about these terms? Contact us at{' '}
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
