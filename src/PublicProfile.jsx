import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { LivePagePreview } from './components/LivePagePreview'

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
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (profileErr || !profileData) {
      setNotFound(true)
      setLoading(false)
      return
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

    setLinks(linksData || [])
    setProducts(productsData || [])
    setLoading(false)
  }

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

  return <LivePagePreview profile={profile} links={links} products={products} isEmbedded={false} />
}
