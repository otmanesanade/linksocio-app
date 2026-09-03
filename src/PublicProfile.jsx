import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { LivePagePreview } from './components/LivePagePreview'
import { fetchServerInquirySettings } from './InquiryTab'
import { fetchServerBookingSettings } from './BookingTab'
import { fetchServerRestaurantMenu } from './RestaurantTab'

export default function PublicProfile({ username }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [products, setProducts] = useState([])
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

    if (!profileData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    // Fetch server inquiry, booking & restaurant menu settings in parallel
    const [inquirySettings, bookingSettings, restaurantMenu] = await Promise.all([
      fetchServerInquirySettings(username, profileData.id),
      fetchServerBookingSettings(username, profileData.id),
      fetchServerRestaurantMenu(username, profileData.id),
    ])

    if (inquirySettings) {
      profileData._inquirySettings = inquirySettings
      if (inquirySettings.enabled !== undefined) {
        profileData.inquiry_enabled = inquirySettings.enabled
      }
    }

    if (bookingSettings) {
      profileData._bookingSettings = bookingSettings
      if (bookingSettings.enabled !== undefined) {
        profileData.booking_enabled = bookingSettings.enabled
      }
    }

    if (restaurantMenu) {
      profileData._restaurantMenu = restaurantMenu
    }

    if (!profileData.location && profileData.username) {
      const storedLoc = localStorage.getItem(`linksocio_profile_location_${profileData.username}`)
      if (storedLoc) profileData.location = storedLoc
    }

    setProfile(profileData)

    const [{ data: linksData }, { data: productsData }] = await Promise.all([
      supabase
        .from('links')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('active', true)
        .order('position', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .eq('user_id', profileData.id)
        .order('position', { ascending: true }),
    ])

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

    setLinks(linksData || [])
    setProducts(finalProducts)
    setLoading(false)
  }

  const isPaid = profile?.plan === 'pro' || profile?.plan === 'business'
  const isTrialExpired = !isPaid && (profile?.trial_status === 'expired' || profile?.plan === 'expired' || profile?.status === 'suspended')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFA', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #14B8A6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748B', fontSize: 14 }}>Loading profile...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFA', fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h2 style={{ fontSize: 20, color: '#0F172A', margin: '0 0 6px' }}>Page Not Found</h2>
        <p style={{ color: '#64748B', fontSize: 14, maxWidth: 320, margin: '0 0 20px' }}>
          The LinkSocio page @{username} doesn't exist or has been moved.
        </p>
        <a href="/" style={{ background: '#14B8A6', color: 'white', textDecoration: 'none', padding: '10px 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 600 }}>
          Create your LinkSocio page
        </a>
      </div>
    )
  }

  if (isTrialExpired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFA', fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Page Paused</h2>
        <p style={{ color: '#64748B', fontSize: 14, maxWidth: 380, margin: '0 0 24px', lineHeight: 1.5 }}>
          The 14-day free trial for @{username} has ended. The creator needs to activate their LinkSocio subscription to reactivate this page.
        </p>
        <a href="/login" style={{ background: '#14B8A6', color: 'white', textDecoration: 'none', padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700, boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)' }}>
          Creator Login & Activate
        </a>
      </div>
    )
  }

  return <LivePagePreview profile={profile} links={links} products={products} isEmbedded={false} />
}
