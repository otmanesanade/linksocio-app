import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { LivePagePreview } from './components/LivePagePreview'
import { fetchServerInquirySettings } from './InquiryTab'
import { fetchServerBookingSettings } from './BookingTab'
import { fetchServerRestaurantMenu } from './RestaurantTab'
import { fetchServerSocials, fetchServerLinksMeta, fetchServerProfileMeta, fetchServerLinks, getStoredProfileMeta, getStoredLinks } from './utils/socialPlatforms'
import { useLanguage } from './context/LanguageContext'
import { updateSEO, generateProfileJSONLD } from './utils/seo'

export default function PublicProfile({ username }) {
  const { t } = useLanguage()
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [products, setProducts] = useState([])
  const [socials, setSocials] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [username])

  async function load() {
    setLoading(true)
    setNotFound(false)
    const cleanUser = username ? String(username).trim().replace(/^@+/, '') : ''

    if (!cleanUser) {
      setNotFound(true)
      setLoading(false)
      updateSEO({
        title: 'Page Not Found — LinkSocio',
        description: 'The requested LinkSocio page could not be found.',
        noIndex: true,
      })
      return
    }

    // Try case-insensitive lookup first so e.g. Otman, otman, OTMAN all work
    let { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUser)
      .limit(1)
      .maybeSingle()

    if (!profileData) {
      const fallback = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUser)
        .limit(1)
        .maybeSingle()
      profileData = fallback.data
    }

    // Alias resolution strictly for otmank514 primary account
    if (!profileData && cleanUser.toLowerCase() === 'otmank514') {
      const { data: aliasData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '33373cca-beb6-43c8-ac2f-8ad4e8f54b85')
        .maybeSingle()
      if (aliasData) profileData = aliasData
    }

    if (!profileData) {
      try {
        const meta = await fetchServerProfileMeta(cleanUser)
        const localMeta = getStoredProfileMeta(cleanUser)
        const mergedMeta = { ...(localMeta || {}), ...(meta || {}) }
        if (mergedMeta && (mergedMeta.display_name || mergedMeta.bio || mergedMeta.theme_preset || mergedMeta.email)) {
          profileData = {
            id: mergedMeta.userId || `user_${cleanUser}`,
            username: cleanUser,
            display_name: mergedMeta.display_name || cleanUser,
            bio: mergedMeta.bio || '',
            theme_preset: mergedMeta.theme_preset || 'default',
            theme_color: '#14B8A6',
            plan: 'business',
            avatar_url: mergedMeta.avatar_url || '',
            location: mergedMeta.location || '',
            contact_email: mergedMeta.email || '',
            whatsapp: mergedMeta.whatsapp || '',
          }
        }
      } catch (e) {}
    }

    if (!profileData) {
      setNotFound(true)
      setLoading(false)
      updateSEO({
        title: `@${cleanUser} — Page Not Found · LinkSocio`,
        description: `The LinkSocio profile @${cleanUser} does not exist or has been moved.`,
        noIndex: true,
      })
      return
    }

    // Fetch server inquiry, booking, restaurant menu, socials, links & profile metadata in parallel safely
    const cleanU = (username || profileData.username || '').toLowerCase().trim().replace(/^@+/, '')
    const isOwnerAccount = profileData.id === '33373cca-beb6-43c8-ac2f-8ad4e8f54b85' || String(profileData.email || '').toLowerCase().trim() === 'otmank514@gmail.com'

    const [inquirySettings, bookingSettings, restaurantMenu, serverSocials, serverLinksMeta, serverProfileMeta] = await Promise.all([
      fetchServerInquirySettings(cleanU, profileData.id).catch(() => null),
      fetchServerBookingSettings(cleanU, profileData.id).catch(() => null),
      fetchServerRestaurantMenu(cleanU, profileData.id).catch(() => null),
      fetchServerSocials(cleanU, profileData.id).catch(() => []),
      fetchServerLinksMeta(cleanU, profileData.id).catch(() => ({})),
      fetchServerProfileMeta(cleanU, profileData.id).catch(() => ({})),
    ])

    if (serverProfileMeta) {
      if (serverProfileMeta.display_name) profileData.display_name = serverProfileMeta.display_name
      if (serverProfileMeta.theme_preset) profileData.theme_preset = serverProfileMeta.theme_preset
      if (serverProfileMeta.font_family) profileData.font_family = serverProfileMeta.font_family
      if (serverProfileMeta.font_color) profileData.font_color = serverProfileMeta.font_color
      if (serverProfileMeta.button_style) profileData.button_style = serverProfileMeta.button_style
      if (serverProfileMeta.header_cover_style) profileData.header_cover_style = serverProfileMeta.header_cover_style
      if (serverProfileMeta.avatar_url) profileData.avatar_url = serverProfileMeta.avatar_url
      if (serverProfileMeta.bio) profileData.bio = serverProfileMeta.bio
      if (serverProfileMeta.email) profileData.contact_email = serverProfileMeta.email
      if (serverProfileMeta.whatsapp) profileData.whatsapp = serverProfileMeta.whatsapp
      if (serverProfileMeta.location) profileData.location = serverProfileMeta.location
    }

    if (isOwnerAccount) {
      if (!profileData.display_name) {
        profileData.display_name = 'otmane sanade'
      }
      if (!profileData.theme_preset || profileData.theme_preset === 'default') {
        profileData.theme_preset = 'studio_noir'
      }
      profileData.is_owner = true
    }

    if (!profileData.location) {
      const storedLoc = (profileData.username && localStorage.getItem(`linksocio_profile_location_${profileData.username}`)) ||
                        (profileData.id && localStorage.getItem(`linksocio_profile_location_${profileData.id}`))
      if (storedLoc) profileData.location = storedLoc
    }

    if (!profileData.whatsapp) {
      const storedWa = (profileData.username && localStorage.getItem(`linksocio_contact_whatsapp_${profileData.username}`)) ||
                        (profileData.id && localStorage.getItem(`linksocio_contact_whatsapp_${profileData.id}`))
      if (storedWa) profileData.whatsapp = storedWa
    }

    if (!profileData.contact_email) {
      const storedEmail = (profileData.username && localStorage.getItem(`linksocio_contact_email_${profileData.username}`)) ||
                          (profileData.id && localStorage.getItem(`linksocio_contact_email_${profileData.id}`))
      if (storedEmail) profileData.contact_email = storedEmail
    }

    let finalSocials = Array.isArray(serverSocials) && serverSocials.length > 0 ? [...serverSocials] : []
    const contactEmail = profileData.contact_email || profileData.email || ''
    if (contactEmail && !finalSocials.some((s) => s.platformId === 'email' || (s.url && s.url.toLowerCase().includes(contactEmail.toLowerCase())))) {
      finalSocials.push({
        platformId: 'email',
        name: 'Email',
        url: `mailto:${contactEmail}`,
        rawHandle: contactEmail,
        active: true,
      })
    }

    const contactWa = profileData.whatsapp || (isOwnerAccount ? '+34642887658' : '')
    if (contactWa) {
      const cleanWa = contactWa.replace(/[^0-9]/g, '')
      const waIdx = finalSocials.findIndex((s) => s.platformId === 'whatsapp')
      if (waIdx >= 0) {
        if (!finalSocials[waIdx].url || finalSocials[waIdx].url.includes('212600000000')) {
          finalSocials[waIdx].url = `https://wa.me/${cleanWa}`
          finalSocials[waIdx].rawHandle = contactWa
        }
      } else {
        finalSocials.push({
          platformId: 'whatsapp',
          name: 'WhatsApp',
          url: `https://wa.me/${cleanWa}`,
          rawHandle: contactWa,
          active: true,
        })
      }
    }

    if (isOwnerAccount && !finalSocials.some((s) => s.platformId === 'instagram')) {
      finalSocials.push({
        platformId: 'instagram',
        name: 'Instagram',
        url: 'https://instagram.com/Sa_GP06',
        rawHandle: 'Sa_GP06',
        active: true,
      })
    }
    setSocials(finalSocials)

    if (inquirySettings) {
      profileData._inquirySettings = inquirySettings
      profileData.inquiry_enabled = Boolean(inquirySettings.enabled)
    } else {
      profileData._inquirySettings = { enabled: false }
      profileData.inquiry_enabled = false
    }

    if (bookingSettings) {
      profileData._bookingSettings = bookingSettings
      profileData.booking_enabled = Boolean(bookingSettings.enabled)
    } else {
      profileData._bookingSettings = { enabled: false }
      profileData.booking_enabled = false
    }

    if (restaurantMenu) {
      profileData._restaurantMenu = restaurantMenu
    }

    setProfile(profileData)

    const targetIds = [profileData.id]
    const [{ data: linksData }, { data: productsData }, serverLinks] = await Promise.all([
      supabase
        .from('links')
        .select('*')
        .in('user_id', targetIds)
        .eq('active', true)
        .order('position', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .in('user_id', targetIds)
        .order('position', { ascending: true }),
      fetchServerLinks(profileData.username, profileData.id).catch(() => []),
    ])

    let combinedLinks = linksData && Array.isArray(linksData) ? [...linksData] : []
    if (Array.isArray(serverLinks) && serverLinks.length > 0) {
      for (const sl of serverLinks) {
        if (!combinedLinks.some((l) => l.id === sl.id || (l.url === sl.url && l.label === sl.label))) {
          combinedLinks.push(sl)
        }
      }
    }

    let finalProducts = productsData ? [...productsData] : []
    try {
      const pRes = await fetch(`/api/products?username=${encodeURIComponent(profileData.username)}&userId=${encodeURIComponent(profileData.id)}`)
      if (pRes.ok) {
        const pJson = await pRes.json()
        if (pJson.products && Array.isArray(pJson.products)) {
          for (const sp of pJson.products) {
            const idx = finalProducts.findIndex((p) => p.id === sp.id || (p.name && sp.name && p.name.trim() === sp.name.trim()))
            if (idx >= 0) {
              finalProducts[idx] = { ...finalProducts[idx], ...sp }
            } else {
              finalProducts.push(sp)
            }
          }
        }
      }
    } catch (e) {}

    // Clean any corrupted URLs and ensure digital assets are ready for customer download
    finalProducts = finalProducts.map((p) => {
      let extUrl = p.external_url || ''
      if (/^https?:\/\/(data:|blob:)/i.test(extUrl)) {
        extUrl = extUrl.replace(/^https?:\/\//i, '')
      }
      let fUrl = p.file_url || ''
      if (/^https?:\/\/(data:|blob:)/i.test(fUrl)) {
        fUrl = fUrl.replace(/^https?:\/\//i, '')
      }
      if (!fUrl && (extUrl.startsWith('data:') || extUrl.startsWith('/uploads/') || extUrl.startsWith('/api/download'))) {
        fUrl = extUrl
      }
      // Only treat as digital if explicitly true, or not explicitly false and has a downloadable file or digital category with digital delivery
      const isExternalStore =
        p.is_digital === false ||
        p.category === 'external' ||
        p.category === 'store' ||
        p.category === 'shop' ||
        p.delivery_type === 'external'

      const hasFile = !!fUrl || extUrl.startsWith('data:') || extUrl.startsWith('/uploads/') || extUrl.startsWith('/api/download')
      const isDig = !isExternalStore && (p.is_digital === true || hasFile || (Boolean(p.category) && p.category !== 'external'))

      return {
        ...p,
        external_url: extUrl,
        file_url: isDig ? (fUrl || null) : null,
        is_digital: isDig,
      }
    })

    const enrichedLinks = (linksData || []).map((l) => {
      const m = (serverLinksMeta && serverLinksMeta[l.id]) || {}
      return {
        ...l,
        style: l.style || m.style || 'button',
        icon_position: l.icon_position || m.icon_position || 'top',
        custom_icon: l.custom_icon || m.icon || null,
      }
    })

    // Guarantee that any icon links saved in Supabase are also merged into socials for visitors
    for (const l of enrichedLinks) {
      if (l.style === 'icon' || l.icon_position === 'top') {
        const normUrl = (l.url || '').toLowerCase().trim()
        const matchIdx = finalSocials.findIndex(
          (s) => (s.url && s.url.toLowerCase().trim() === normUrl) ||
                 (s.name && l.label && s.name.toLowerCase() === l.label.toLowerCase()) ||
                 (s.platformId && l.icon && s.platformId === l.icon)
        )
        if (matchIdx >= 0) {
          if (!finalSocials[matchIdx].url || finalSocials[matchIdx].url.includes('212600000000')) {
            finalSocials[matchIdx].url = l.url
            finalSocials[matchIdx].rawHandle = l.url
          }
        } else {
          finalSocials.push({
            platformId: l.icon || 'globe',
            name: l.label,
            url: l.url,
            rawHandle: l.url,
            active: l.active !== false,
          })
        }
      }
    }
    setSocials([...finalSocials])
    setLinks(enrichedLinks)
    setProducts(finalProducts)
    setLoading(false)

    // Dynamic SEO & Structured Data (Schema.org JSON-LD)
    const displayName = profileData.name || profileData.full_name || `@${profileData.username || cleanUser}`
    const bioText = profileData.bio ? profileData.bio.trim() : `Boutique et profil officiel de ${displayName} sur LinkSocio. Liens utiles, produits digitaux et prise de rendez-vous.`
    const prodNames = finalProducts.map((p) => p.name || p.title).filter(Boolean)
    const keywordsList = [
      profileData.username,
      displayName,
      'LinkSocio',
      'bio link',
      'boutique digitale',
      'digital products',
      'booking',
      ...prodNames,
    ].filter(Boolean).join(', ')

    updateSEO({
      title: `${displayName} (@${profileData.username || cleanUser})`,
      description: bioText,
      keywords: keywordsList,
      image: profileData.avatar_url,
      url: `${typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'}/${profileData.username || cleanUser}`,
      type: 'profile',
      jsonLd: generateProfileJSONLD(profileData, enrichedLinks, finalProducts, finalSocials),
    })
  }

  const isPaid =
    profile?.plan === 'pro' ||
    profile?.plan === 'business' ||
    profile?.plan === 'lifetime' ||
    profile?.plan === 'owner' ||
    String(profile?.email || '').toLowerCase().trim() === 'otmank514@gmail.com'
  const isTrialExpired = !isPaid && (profile?.trial_status === 'expired' || profile?.plan === 'expired' || profile?.status === 'suspended')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFA', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #14B8A6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748B', fontSize: 14 }}>{t('publicProfile.loading', 'Loading profile...')}</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFA', fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h2 style={{ fontSize: 20, color: '#0F172A', margin: '0 0 6px' }}>{t('publicProfile.notFoundTitle', 'Page Not Found')}</h2>
        <p style={{ color: '#64748B', fontSize: 14, maxWidth: 320, margin: '0 0 20px' }}>
          {t('publicProfile.notFoundDesc', "The LinkSocio page @{username} doesn't exist or has been moved.").replace('{username}', username || '')}
        </p>
        <a href="/" style={{ background: '#14B8A6', color: 'white', textDecoration: 'none', padding: '10px 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 600 }}>
          {t('publicProfile.createPage', 'Create your LinkSocio page')}
        </a>
      </div>
    )
  }

  if (isTrialExpired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFA', fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>{t('publicProfile.pausedTitle', 'Page Paused')}</h2>
        <p style={{ color: '#64748B', fontSize: 14, maxWidth: 380, margin: '0 0 24px', lineHeight: 1.5 }}>
          {t('publicProfile.pausedDesc', 'The 14-day free trial for @{username} has ended. The creator needs to activate their LinkSocio subscription to reactivate this page.').replace('{username}', username || '')}
        </p>
        <a href="/login" style={{ background: '#14B8A6', color: 'white', textDecoration: 'none', padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700, boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)' }}>
          {t('publicProfile.creatorLogin', 'Creator Login & Activate')}
        </a>
      </div>
    )
  }

  return <LivePagePreview profile={profile} links={links} products={products} socials={socials} isEmbedded={false} />
}
