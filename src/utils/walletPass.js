// Utility to generate Digital Business Cards & Wallet Passes for Apple Wallet, Google Wallet, and Contacts

export function generateVCardData(profile, whatsappPhone = '') {
  const name = profile?.display_name || profile?.username || 'LinkSocio User'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const profileUrl = `${origin}/${profile?.username || ''}`
  const bio = profile?.bio || ''

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${name};;;`,
    `FN:${name}`,
    `TITLE:Creator / Business Profile`,
    `URL;type=pref:${profileUrl}`,
  ]

  if (whatsappPhone) {
    vcardLines.push(`TEL;TYPE=CELL,VOICE,MSG:${whatsappPhone}`)
  }

  if (profile?.email) {
    vcardLines.push(`EMAIL;TYPE=INTERNET:${profile.email}`)
  }

  if (bio) {
    vcardLines.push(`NOTE:${bio.replace(/\n/g, ' ')}`)
  }

  // Adding Apple Address Book URL label
  vcardLines.push(`item1.URL:${profileUrl}`)
  vcardLines.push(`item1.X-ABLabel:LinkSocio Profile`)

  vcardLines.push('END:VCARD')
  return vcardLines.join('\r\n')
}

export function downloadVCard(profile, whatsappPhone = '') {
  const vcardContent = generateVCardData(profile, whatsappPhone)
  const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${profile?.username || 'contact'}_card.vcf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Generate Google Wallet Generic Pass Save Link
export function getGoogleWalletSaveUrl(profile, qrDataUrl = '') {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const profileUrl = `${origin}/${profile?.username || ''}`
  const name = profile?.display_name || profile?.username || 'Creator'
  
  // Google Wallet Generic Pass intent or web landing
  // Direct Google Wallet Generic Pass deep link structure with fallback
  const passDetails = {
    title: name,
    subtitle: `@${profile?.username || 'profile'}`,
    barcode: profileUrl,
    header: 'LinkSocio Digital Pass',
  }

  const encoded = encodeURIComponent(JSON.stringify(passDetails))
  return `https://pay.google.com/gp/v/save?data=${encoded}`
}
