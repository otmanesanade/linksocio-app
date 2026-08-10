const iconSvg = {
  instagram: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="#14B8A6" stroke="none" />
    </svg>
  ),
  whatsapp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  tiktok: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  ),
}

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
          Share Instagram, WhatsApp, TikTok and more with a single tap — no app, no typing.
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
            {[
              { key: 'instagram', label: 'Instagram' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'tiktok', label: 'TikTok' },
            ].map(({ key, label }) => (
              <div
                key={key}
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
                  }}
                >
                  {iconSvg[key]}
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
          { title: 'Instant QR code', text: 'Print it, stick it, scan it. No app required.' },
          { title: 'Made in seconds', text: 'Sign up, add your links, share your page.' },
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
