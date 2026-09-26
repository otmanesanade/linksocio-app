/**
 * LinkSocio SEO & Structured Data Manager
 * Handles dynamic page titles, OpenGraph, Twitter Cards, Canonical URLs,
 * Robots indexing directives, and Schema.org JSON-LD structured data.
 */

function setMetaTag(attributeName, attributeValue, contentValue) {
  if (typeof document === 'undefined') return
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attributeName, attributeValue)
    document.head.appendChild(element)
  }
  element.setAttribute('content', contentValue || '')
}

function setCanonical(url) {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function setHreflangTags(baseUrl) {
  if (typeof document === 'undefined') return
  const cleanBase = (baseUrl || 'https://linksocio.com').replace(/\/+$/, '')
  const languages = [
    { code: 'ar', path: `${cleanBase}?lang=ar` },
    { code: 'ar-SA', path: `${cleanBase}?lang=ar` },
    { code: 'ar-AE', path: `${cleanBase}?lang=ar` },
    { code: 'ar-MA', path: `${cleanBase}?lang=ar` },
    { code: 'ar-EG', path: `${cleanBase}?lang=ar` },
    { code: 'ar-KW', path: `${cleanBase}?lang=ar` },
    { code: 'ar-QA', path: `${cleanBase}?lang=ar` },
    { code: 'ar-BH', path: `${cleanBase}?lang=ar` },
    { code: 'ar-OM', path: `${cleanBase}?lang=ar` },
    { code: 'ar-JO', path: `${cleanBase}?lang=ar` },
    { code: 'ar-DZ', path: `${cleanBase}?lang=ar` },
    { code: 'ar-TN', path: `${cleanBase}?lang=ar` },
    { code: 'ar-IQ', path: `${cleanBase}?lang=ar` },
    { code: 'fr', path: `${cleanBase}?lang=fr` },
    { code: 'en', path: `${cleanBase}?lang=en` },
    { code: 'es', path: `${cleanBase}?lang=es` },
    { code: 'x-default', path: cleanBase },
  ]

  languages.forEach(({ code, path }) => {
    let link = document.querySelector(`link[rel="alternate"][hreflang="${code}"]`)
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'alternate')
      link.setAttribute('hreflang', code)
      document.head.appendChild(link)
    }
    link.setAttribute('href', path)
  })
}

function setJsonLd(id, jsonContent) {
  if (typeof document === 'undefined') return
  let script = document.getElementById(id)
  if (!jsonContent) {
    if (script) script.remove()
    return
  }
  if (!script) {
    script = document.createElement('script')
    script.setAttribute('id', id)
    script.setAttribute('type', 'application/ld+json')
    document.head.appendChild(script)
  }
  try {
    script.textContent = typeof jsonContent === 'string' ? jsonContent : JSON.stringify(jsonContent)
  } catch (e) {
    console.warn('Error setting JSON-LD:', e)
  }
}

/**
 * Main function to update SEO metadata for the current view
 */
export function updateSEO({
  title,
  description,
  keywords,
  url,
  image,
  type = 'website',
  noIndex = false,
  jsonLd = null,
} = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const defaultTitle = 'LinkSocio — All-in-One Bio Link, Digital Store & Booking Platform'
  const defaultDesc =
    'Build your branded bio link page, sell digital products, book appointments, and capture WhatsApp leads in minutes with LinkSocio. The ultimate creator storefront.'
  const defaultUrl = window.location.origin + window.location.pathname
  const defaultImage = `${window.location.origin}/og-image.svg`

  const finalTitle = title ? (title.includes('LinkSocio') ? title : `${title} — LinkSocio`) : defaultTitle
  const finalDesc = description ? description.slice(0, 200) : defaultDesc
  const finalUrl = url || defaultUrl
  const finalImage = image || defaultImage

  // 1. Title tag
  document.title = finalTitle

  // 2. Standard Meta Tags
  setMetaTag('name', 'description', finalDesc)
  if (keywords) {
    setMetaTag('name', 'keywords', keywords)
  }
  setMetaTag(
    'name',
    'robots',
    noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  )

  // 3. Canonical & Hreflang
  setCanonical(finalUrl)
  setHreflangTags(finalUrl)

  // 4. OpenGraph
  setMetaTag('property', 'og:title', finalTitle)
  setMetaTag('property', 'og:description', finalDesc)
  setMetaTag('property', 'og:url', finalUrl)
  setMetaTag('property', 'og:image', finalImage)
  setMetaTag('property', 'og:type', type)
  setMetaTag('property', 'og:site_name', 'LinkSocio')

  // 5. Twitter / X Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image')
  setMetaTag('name', 'twitter:title', finalTitle)
  setMetaTag('name', 'twitter:description', finalDesc)
  setMetaTag('name', 'twitter:image', finalImage)
  setMetaTag('name', 'twitter:site', '@linksocio')

  // 6. JSON-LD Structured Data
  if (jsonLd) {
    setJsonLd('linksocio-dynamic-jsonld', jsonLd)
  }
}

/**
 * Generates Schema.org JSON-LD for a Creator Public Profile & Storefront
 */
export function generateProfileJSONLD(profile, links = [], products = [], socials = []) {
  if (!profile) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'
  const profileUrl = `${origin}/${profile.username || ''}`
  const displayName = profile.name || profile.full_name || `@${profile.username}`
  const bio = profile.bio || `Boutique et page officielle de ${displayName} sur LinkSocio`

  const sameAsUrls = (socials || [])
    .filter((s) => s && s.url && s.active !== false)
    .map((s) => s.url)

  // Extract products into Schema.org Product items
  const productSchemas = (products || []).slice(0, 10).map((prod) => {
    const pPrice = Number(prod.price) || 0
    const pCurrency = prod.currency || 'MAD'
    return {
      '@type': 'Product',
      name: prod.name || prod.title || 'Produit Digital',
      description: prod.description || `Produit par ${displayName}`,
      image: prod.image || prod.cover_image || profile.avatar_url || `${origin}/favicon.svg`,
      offers: {
        '@type': 'Offer',
        price: pPrice.toString(),
        priceCurrency: pCurrency === 'DH' ? 'MAD' : pCurrency,
        availability: 'https://schema.org/InStock',
        url: `${profileUrl}#product-${prod.id}`,
      },
    }
  })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${profileUrl}#webpage`,
        url: profileUrl,
        name: `${displayName} — LinkSocio`,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          name: 'LinkSocio',
          url: origin,
        },
        mainEntity: {
          '@type': 'Person',
          '@id': `${profileUrl}#person`,
          name: displayName,
          alternateName: `@${profile.username}`,
          description: bio,
          image: profile.avatar_url || `${origin}/og-image.svg`,
          url: profileUrl,
          sameAs: sameAsUrls.length > 0 ? sameAsUrls : undefined,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'LinkSocio',
            item: origin,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Creators',
            item: `${origin}/#showcase`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: displayName,
            item: profileUrl,
          },
        ],
      },
      ...(productSchemas.length > 0 ? productSchemas : []),
    ],
  }
}

/**
 * Generates Schema.org JSON-LD for Landing Page with rich FAQs and SoftwareApplication
 */
export function generateLandingJSONLD(language = 'fr') {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linksocio.com'

  const faqs = {
    fr: [
      {
        q: "Qu'est-ce que LinkSocio ?",
        a: "LinkSocio est une plateforme tout-en-un pour les créateurs de contenu et entrepreneurs permettant de créer une page bio link personnalisée, vendre des produits digitaux, réserver des rendez-vous et collecter des prospects WhatsApp en quelques minutes."
      },
      {
        q: "Comment fonctionne la vente de produits digitaux sur LinkSocio ?",
        a: "Vous pouvez uploader des ebooks, fichiers PDF, cours ou presets. Vos clients paient en ligne de manière sécurisée et reçoivent leur fichier instantanément par téléchargement et email."
      },
      {
        q: "Quels sont les frais de la plateforme ?",
        a: "LinkSocio prélève une commission transparente de 9% sur les ventes. 91% des gains reviennent directement au créateur avec retrait bancaire direct (CIH, Attijariwafa, BMCE...) ou PayPal."
      }
    ],
    ar: [
      {
        q: "ما هي منصة LinkSocio لصناع المحتوى في العالم العربي؟",
        a: "منصة LinkSocio هي منصة متكاملة لصناع المحتوى والمهنيين والمستقلين في السعودية، الإمارات، المغرب، مصر وباقي الدول العربية، تتيح إنشاء رابط بايو احترافي، متجر رقمي لبيع الكتب والدورات، ونظام حجز مواعيد واستشارات مع تنبيهات واتساب الفورية."
      },
      {
        q: "كيف يمكن بيع المنتجات الرقمية واستلام الأرباح في الدول العربية؟",
        a: "يمكنك رفع ملفاتك الرقمية وتحديد السعر بالريال السعودي (SAR)، الدرهم الإماراتي (AED)، الدرهم المغربي (MAD) أو الدولار (USD). يستلم صانع المحتوى 91% من صافي الأرباح عبر Stripe Connect (في 130+ دولة)، التحويل البنكي الدولي IBAN/SWIFT، الحسابات البنكية بالمغرب، PayPal، أو العملات الرقمية USDT."
      },
      {
        q: "ما هي العملات المدعومة في متجر ومحفظة LinkSocio؟",
        a: "تدعم المنصة جميع العملات العربية والعالمية الرئيسية: الريال السعودي (SAR)، الدرهم الإماراتي (AED)، الدرهم المغربي (MAD / DH)، الدولار الأمريكي ($ USD)، اليورو (€ EUR)، الجنيه الإسترليني (£ GBP)، والدولار الرقمي المشفر (USDT)."
      },
      {
        q: "هل توفر المنصة نظام حجز مواعيد وتنبيهات واتساب المباشرة؟",
        a: "نعم، تدعم المنصة تقويم حجز استشارات ومواعيد ذكي يتيح للعميل اختيار الوقت المناسب، مع إرسال إشعارات فورية مباشرة إلى واتساب، تيليجرام والإيميل."
      }
    ],
    en: [
      {
        q: "What is LinkSocio?",
        a: "LinkSocio is an all-in-one bio link, digital store, and appointment booking platform for creators, freelancers, and businesses."
      },
      {
        q: "How do digital product sales work?",
        a: "Upload your PDFs, ebooks, digital templates, or guides. Buyers purchase securely and receive instant digital downloads and email confirmations."
      },
      {
        q: "What is the platform fee?",
        a: "LinkSocio takes a flat 9% platform commission, allowing creators to keep 91% of their gross earnings with direct bank payouts."
      }
    ],
  }

  const activeFaqs = faqs[language] || faqs.fr

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: 'LinkSocio',
        description: 'All-in-One Bio Link, Digital Store & Booking Platform',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/{search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'LinkSocio',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        areaServed: [
          'Saudi Arabia',
          'United Arab Emirates',
          'Morocco',
          'Egypt',
          'Kuwait',
          'Qatar',
          'Bahrain',
          'Oman',
          'Jordan',
          'Algeria',
          'Tunisia',
          'Iraq',
        ],
        featureList: [
          'Customizable Bio Link & Storefront',
          'Digital Products Storefront (PDFs, templates, courses)',
          'Appointments & Bookings Calendar',
          'Direct WhatsApp Contact & Lead Capture',
          'Real-time WhatsApp, Email & Telegram Notifications',
          'Multi-currency Support (USD $, EUR €, SAR ريال, AED درهم, MAD DH, USDT)',
          'Global Payouts via Stripe Connect, IBAN Wire, PayPal, and Local Banks',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: activeFaqs.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  }
}
