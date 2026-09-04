export const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    prefix: 'https://instagram.com/',
    placeholder: 'username (e.g. otman)',
    brandColor: '#E1306C',
    iconKey: 'Instagram',
    formatUrl: (val) => {
      const clean = String(val || '').trim().replace(/^@/, '')
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://instagram.com/${clean}`
    },
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    prefix: 'https://wa.me/',
    placeholder: 'phone number with country code (e.g. 212600000000)',
    brandColor: '#25D366',
    iconKey: 'WhatsApp',
    formatUrl: (val) => {
      const clean = String(val || '').replace(/[^0-9]/g, '')
      if (!clean) return ''
      return `https://wa.me/${clean}`
    },
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    prefix: 'https://tiktok.com/@',
    placeholder: 'username (e.g. otman)',
    brandColor: '#000000',
    iconKey: 'TikTok',
    formatUrl: (val) => {
      const clean = String(val || '').trim().replace(/^@/, '')
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://tiktok.com/@${clean}`
    },
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    prefix: 'https://x.com/',
    placeholder: 'username (e.g. otman)',
    brandColor: '#000000',
    iconKey: 'Twitter',
    formatUrl: (val) => {
      const clean = String(val || '').trim().replace(/^@/, '')
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://x.com/${clean}`
    },
  },
  {
    id: 'youtube',
    name: 'YouTube',
    prefix: 'https://youtube.com/@',
    placeholder: 'channel handle or full URL',
    brandColor: '#FF0000',
    iconKey: 'YouTube',
    formatUrl: (val) => {
      const clean = String(val || '').trim()
      if (!clean) return ''
      if (clean.startsWith('http')) return clean
      return clean.startsWith('@') ? `https://youtube.com/${clean}` : `https://youtube.com/@${clean}`
    },
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    prefix: 'https://linkedin.com/in/',
    placeholder: 'profile name or full URL',
    brandColor: '#0A66C2',
    iconKey: 'LinkedIn',
    formatUrl: (val) => {
      const clean = String(val || '').trim()
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://linkedin.com/in/${clean.replace(/^\/+/, '')}`
    },
  },
  {
    id: 'telegram',
    name: 'Telegram',
    prefix: 'https://t.me/',
    placeholder: 'username or channel (e.g. otman)',
    brandColor: '#229ED9',
    iconKey: 'Telegram',
    formatUrl: (val) => {
      const clean = String(val || '').trim().replace(/^@/, '')
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://t.me/${clean}`
    },
  },
  {
    id: 'facebook',
    name: 'Facebook',
    prefix: 'https://facebook.com/',
    placeholder: 'page name or profile URL',
    brandColor: '#1877F2',
    iconKey: 'Facebook',
    formatUrl: (val) => {
      const clean = String(val || '').trim()
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://facebook.com/${clean}`
    },
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    prefix: 'https://snapchat.com/add/',
    placeholder: 'username',
    brandColor: '#FFFC00',
    iconKey: 'Snapchat',
    formatUrl: (val) => {
      const clean = String(val || '').trim().replace(/^@/, '')
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://snapchat.com/add/${clean}`
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    prefix: 'https://open.spotify.com/artist/',
    placeholder: 'artist, playlist or track URL',
    brandColor: '#1DB954',
    iconKey: 'Spotify',
    formatUrl: (val) => {
      const clean = String(val || '').trim()
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://open.spotify.com/${clean}`
    },
  },
  {
    id: 'email',
    name: 'Email',
    prefix: 'mailto:',
    placeholder: 'contact email address',
    brandColor: '#475569',
    iconKey: 'Email',
    formatUrl: (val) => {
      const clean = String(val || '').trim()
      if (!clean) return ''
      return clean.startsWith('mailto:') ? clean : `mailto:${clean}`
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    prefix: 'https://github.com/',
    placeholder: 'username (e.g. otman)',
    brandColor: '#181717',
    iconKey: 'GitHub',
    formatUrl: (val) => {
      const clean = String(val || '').trim().replace(/^@/, '')
      if (!clean) return ''
      return clean.startsWith('http') ? clean : `https://github.com/${clean}`
    },
  },
]

export function getStoredSocials(username, userId) {
  if (typeof window === 'undefined') return []
  const clean = username ? String(username).toLowerCase().trim().replace(/^@/, '') : ''
  const k1 = clean ? `linksocio_socials_${clean}` : null
  const k2 = userId ? `linksocio_socials_${userId}` : null

  let raw = (k1 && localStorage.getItem(k1)) || (k2 && localStorage.getItem(k2))
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {}
  }
  return []
}

export function saveStoredSocials(username, userId, socials) {
  if (typeof window === 'undefined') return
  const clean = username ? String(username).toLowerCase().trim().replace(/^@/, '') : ''
  const jsonStr = JSON.stringify(socials)
  if (clean) localStorage.setItem(`linksocio_socials_${clean}`, jsonStr)
  if (userId) localStorage.setItem(`linksocio_socials_${userId}`, jsonStr)
  window.dispatchEvent(new CustomEvent('linksocio_socials_updated', { detail: { socials, username: clean } }))
}
