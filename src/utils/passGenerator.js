// Helper for generating standard Apple Wallet .pkpass web payloads & Google Wallet passes

/**
 * Creates a standard pass definition object for Apple Wallet passes
 */
export function buildPassData(profile, qrDataUrl) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const fullUrl = `${origin}/${profile?.username || ''}`
  const name = profile?.display_name || profile?.username || 'Creator'
  const bio = profile?.bio || 'Check out all my official links and contact info on LinkSocio.'

  return {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.linksocio.card',
    serialNumber: `linksocio_${profile?.username || 'user'}_${Date.now()}`,
    teamIdentifier: 'LINKSOCIO',
    organizationName: 'LinkSocio',
    description: `${name} Digital Pass`,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(15, 23, 42)',
    labelColor: 'rgb(20, 184, 166)',
    generic: {
      primaryFields: [
        {
          key: 'name',
          label: 'NAME / CREATOR',
          value: name,
        },
      ],
      secondaryFields: [
        {
          key: 'handle',
          label: 'PROFILE',
          value: `@${profile?.username || ''}`,
        },
        {
          key: 'verified',
          label: 'STATUS',
          value: 'Verified Profile',
        },
      ],
      auxiliaryFields: [
        {
          key: 'bio',
          label: 'ABOUT',
          value: bio,
        },
      ],
      backFields: [
        {
          key: 'website',
          label: 'LinkSocio Page',
          value: fullUrl,
        },
        {
          key: 'support',
          label: 'Powered By',
          value: 'LinkSocio Digital Card Platform',
        },
      ],
    },
    barcodes: [
      {
        message: fullUrl,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: `@${profile?.username || ''}`,
      },
    ],
  }
}

/**
 * Open direct Apple Wallet / Google Wallet pass handling
 */
export function openWalletDirect(type, profile, qrDataUrl) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const fullUrl = `${origin}/${profile?.username || ''}`
  const name = profile?.display_name || profile?.username || 'Creator'

  if (type === 'apple') {
    // Generate Passbook JSON Blob and prompt direct wallet handling
    const passData = buildPassData(profile, qrDataUrl)
    const jsonStr = JSON.stringify(passData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/vnd.apple.pkpass-data;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // For iOS Safari native opening
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile?.username || 'card'}.pkpass`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return
  }

  if (type === 'google') {
    // Google Wallet Generic Pass direct link
    const googleWalletUrl = `https://pay.google.com/gp/v/save?data=${encodeURIComponent(
      JSON.stringify({
        title: name,
        subtitle: `@${profile?.username || ''}`,
        description: `Official LinkSocio digital pass for ${name}`,
        barcode: {
          type: 'QR_CODE',
          value: fullUrl,
          alternateText: `@${profile?.username || ''}`,
        },
      })
    )}`

    window.open(googleWalletUrl, '_blank')
  }
}
