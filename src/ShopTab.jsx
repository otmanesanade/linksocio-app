import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ShopTab({ user }) {
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    setProducts(data || [])
  }

  async function addProduct(e) {
    e.preventDefault()
    if (!name || !externalUrl) return
    setAdding(true)

    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      name,
      price: price || null,
      image_url: imageUrl || null,
      external_url: externalUrl,
      position: products.length,
    })

    setAdding(false)
    if (!error) {
      setName('')
      setPrice('')
      setImageUrl('')
      setExternalUrl('')
      load()
    }
  }

  async function deleteProduct(id) {
    await supabase.from('products').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add a product</p>
        <form onSubmit={addProduct} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input placeholder="Price (optional, e.g. 25€)" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
          <input placeholder="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={inputStyle} />
          <input placeholder="Link to your shop (Shopify, Etsy...)" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} style={inputStyle} />
          <button
            type="submit"
            disabled={adding}
            style={{ background: adding ? '#5DCAA5' : '#14B8A6', color: 'white', border: 'none', borderRadius: 12, padding: '11px', fontSize: 13, fontWeight: 500, cursor: adding ? 'default' : 'pointer' }}
          >
            {adding ? 'Adding...' : 'Add product'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
            <button
              onClick={() => deleteProduct(p.id)}
              style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(15,23,42,0.6)', color: 'white', border: 'none', fontSize: 11, cursor: 'pointer' }}
            >
              ✕
            </button>
            <div style={{ width: '100%', aspectRatio: '1', background: '#F1F2F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 24 }}>🛍️</span>
              )}
            </div>
            <div style={{ padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#0F172A' }}>{p.name}</p>
              {p.price && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#0D9488', fontWeight: 600 }}>{p.price}</p>}
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#8A97A3', fontSize: 13, marginTop: 12 }}>
            No products yet. Add your first one above.
          </p>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 12,
  border: '1px solid #E7EDEC',
  background: '#FBFCFC',
  padding: '11px 14px',
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
}
