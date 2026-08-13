export default function LandingPage({ goToLogin, goToSignUp }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFA',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      }}
    >
      {/* Nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '24px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="26" height="26" viewBox="0 0 46 46">
            <rect x="4" y="4" width="22" height="22" rx="11" fill="none" stroke="#14B8A6" strokeWidth="6" />
            <rect x="20" y="20" width="22" height="22" rx="11" fill="none" stroke="#0F172A" strokeWidth="6" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 600 }}>
            <span style={{ color: '#0F172A' }}>Link</span>
            <span style={{ color: '#14B8A6' }}>Socio</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={goToLogin}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#0F172A', cursor: 'pointer' }}
          >
            Log in
          </button>
          <button
            onClick={goToSignUp}
            style={{
              background: '#0F172A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Sign up
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: '64px 20px 40px' }}>
        <h1 style={{ fontSize: 42, fontWeight: 700, color: '#0F172A', lineHeight: 1.15, margin: 0 }}>
          One link.
          <br />
          Every connection.
        </h1>
        <p
          style={{
            fontSize: 16,
            color: '#8A97A3',
            marginTop: 16,
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Share Instagram, WhatsApp, TikTok, your shop and more with a single tap — no app, no typing.
        </p>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={goToSignUp}
            style={{
              background: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '13px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Create your page →
          </button>
        </div>
      </div>

      {/* Preview mockup */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 20px 64px' }}>
        <div
          style={{
            width: 300,
            background: 'white',
            borderRadius: 28,
            border: '1px solid #E7EDEC',
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            padding: '32px 24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              M
            </div>
            <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: '#0F172A' }}>mia</p>
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Instagram', 'WhatsApp', 'TikTok'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid #E7EDEC',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#F1F2F4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                  }}
                >
                  🔗
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#0F172A' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 20px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}
      >
        {[
          { title: 'One link for everything', text: 'Instagram, WhatsApp, TikTok, your site — all in one place.' },
          { title: 'Sell from your page', text: 'Add products from your shop, no coding needed.' },
          { title: 'Instant QR code', text: 'Print it, stick it, scan it. No app required.' },
          { title: 'See what works', text: 'Track clicks on every link to know what your audience loves.' },
        ].map(({ title, text }) => (
          <div key={title} style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#E6F7F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🔗
            </span>
            <p style={{ marginTop: 14, fontSize: 14.5, fontWeight: 600, color: '#0F172A' }}>{title}</p>
            <p style={{ marginTop: 4, fontSize: 13, color: '#8A97A3', lineHeight: 1.5 }}>{text}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div style={{ background: 'white', borderTop: '1px solid #E7EDEC', borderBottom: '1px solid #E7EDEC', padding: '72px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0 }}>Simple pricing</h2>
          <p style={{ fontSize: 14, color: '#8A97A3', marginTop: 8 }}>Start free. Upgrade whenever you're ready.</p>

          <div
            style={{
              marginTop: 40,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
              maxWidth: 640,
              margin: '40px auto 0',
            }}
          >
            {/* Free plan */}
            <div style={{ border: '1px solid #E7EDEC', borderRadius: 24, padding: '32px 28px', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#8A97A3', letterSpacing: 0.5 }}>FREE</p>
              <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700, color: '#0F172A' }}>
                €0<span style={{ fontSize: 14, fontWeight: 500, color: '#8A97A3' }}>/month</span>
              </p>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Unlimited links', 'Custom LinkSocio page', 'QR code', 'Basic click tracking'].map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0F172A' }}>
                    <span style={{ color: '#14B8A6' }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={goToSignUp}
                style={{
                  marginTop: 24,
                  width: '100%',
                  background: '#F1F2F4',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Start for free
              </button>
            </div>

            {/* Pro plan */}
            <div
              style={{
                position: 'relative',
                border: '2px solid #14B8A6',
                borderRadius: 24,
                padding: '32px 28px',
                textAlign: 'left',
                background: '#FBFDFC',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: -12,
                  right: 24,
                  background: '#14B8A6',
                  color: 'white',
                  fontSize: 10.5,
                  fontWeight: 600,
                  borderRadius: 100,
                  padding: '4px 12px',
                  letterSpacing: 0.5,
                }}
              >
                COMING SOON
              </span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0D9488', letterSpacing: 0.5 }}>PRO</p>
              <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700, color: '#0F172A' }}>
                €9.99<span style={{ fontSize: 14, fontWeight: 500, color: '#8A97A3' }}>/month</span>
              </p>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Everything in Free', 'Advanced analytics', 'Custom colors & themes', 'Priority support'].map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0F172A' }}>
                    <span style={{ color: '#14B8A6' }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                disabled
                style={{
                  marginTop: 24,
                  width: '100%',
                  background: '#E6F7F5',
                  color: '#5DCAA5',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'default',
                }}
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '72px 20px' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: 0 }}>Ready to get started?</h2>
        <p style={{ fontSize: 14, color: '#8A97A3', marginTop: 8 }}>It takes less than a minute.</p>
        <button
          onClick={goToSignUp}
          style={{
            marginTop: 24,
            background: '#14B8A6',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '13px 28px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Create your page →
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          padding: '24px 20px',
          borderTop: '1px solid #E7EDEC',
          fontSize: 12,
          color: '#A6AFB6',
        }}
      >
        LinkSocio · One tap. Instant connection.
      </div>
    </div>
  )
}
