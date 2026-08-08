import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    loadProfile()
    loadLinks()
  }, [])

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  async function loadLinks() {
    const { data } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    setLinks(data || [])
  }

  async function addLink(e) {
    e.preventDefault()
    if (!label || !url) return

    const { error } = await supabase.from('links').insert({
      user_id: user.id,
      label,
      url,
      position: links.length,
    })

    if (!error) {
      setLabel('')
      setUrl('')
      loadLinks()
    }
  }

  async function deleteLink(id) {
    await supabase.from('links').delete().eq('id', id)
    loadLinks()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22 }}>Dashboard</h1>
        <button onClick={logout}>Log out</button>
      </div>

      {profile && (
        <p style={{ color: '#666', marginTop: 4 }}>
          Your public page:{' '}
          <a href={`/${profile.username}`} target="_blank" rel="noreferrer">
            linksocio.com/{profile.username}
          </a>
        </p>
      )}

      <form onSubmit={addLink} style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <input
          placeholder="Label (e.g. Instagram)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map((link) => (
          <div
            key={link.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #E7EDEC',
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{link.label}</p>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{link.url}</p>
            </div>
            <button onClick={() => deleteLink(link.id)}>Delete</button>
          </div>
        ))}
        {links.length === 0 && <p style={{ color: '#888' }}>No links yet. Add your first one above.</p>}
      </div>
    </div>
  )
}
