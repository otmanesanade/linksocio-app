import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function normalizeUrl(url) {
  if (!url) return url
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

export default function ShopTab({ user, products = [], reloadProducts }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState(null)

  async function fetchInfo() {
    if (!externalUrl) return
    setFetching(true)
    const cleanUrl = normalizeUrl(externalUrl)
    setExternalUrl(cleanUrl)

    try {
      const res = await fetch(`/api/fetch-product?url=${encodeURIComponent(cleanUrl)}`)
      const data = await res.json()
      if (data.title && !name) setName(data.title)
      if (data.image && !imageUrl) setImageUrl(data.image)
      if (data.price && !price) setPrice(data.price)
    } catch (err) {
      // Silent fail — user can still fill fields manually
    }
    setFetching(false)
  }

  async function addProduct(e) {
    e.preventDefault()
    if (!name || !externalUrl) return
    setAdding(true)

    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      name: name.trim(),
      price: price.trim() || null,
      image_url: imageUrl.trim() || null,
      external_url: normalizeUrl(externalUrl.trim()),
      position: products.length,
    })

    setAdding(false)
    if (!error) {
      setName('')
      setPrice('')
      setImageUrl('')
      setExternalUrl('')
      reloadProducts()
    }
  }

  async function deleteProduct(id) {
    await supabase.from('products').delete().eq('id', id)
    reloadProducts()
  }

  // Drag & drop reorder for products
  const handleDragStart = (idx) => {
    setDraggedIdx(idx)
  }

  const handleDrop = async (dropIdx) => {
    if (draggedIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null)
      return
    }

    const reordered = [...products]
    const [moved] = reordered.splice(draggedIdx, 1)
    reordered.splice(dropIdx, 0, moved)

    setDraggedIdx(null)

    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('products').update({ position: i }).eq('id', reordered[i].id)
    }
    reloadProducts()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Add Product Card */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 14.5, fontWeight: 600, color: '#0F172A' }}>🛍️ Digital Storefront & Products</p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#8A97A3' }}>
              Add affiliate links, courses, e-books, merchandise, or consultation links.
            </p>
          </div>
        </div>

        <form onSubmit={addProduct} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Paste product link (Amazon, Shopify, Etsy, Gumroad...)"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={fetchInfo}
              disabled={!externalUrl || fetching}
              style={{
                flexShrink: 0,
                background: fetching ? '#94A3B8' : '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '0 16px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: !externalUrl || fetching ? 'default' : 'pointer',
              }}
            >
              {fetching ? 'Auto Fetching...' : '⚡ Auto-Fetch Info'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="Product / Service Title *" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <div>
              <input placeholder="Price (e.g. $29, 29 €, 199 DH)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {['$19', '$29', '$49', '$99', '19 €', '29 €', '49 €', '99 DH', '199 DH', '299 DH', 'Free'].map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => setPrice(tag)}
                    style={{
                      background: price === tag ? '#14B8A6' : '#F1F5F9',
                      color: price === tag ? 'white' : '#475569',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <input placeholder="Image URL (optional if auto-fetched)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={inputStyle} />

          <button
            type="submit"
            disabled={adding || !name || !externalUrl}
            style={{
              background: adding || !name || !externalUrl ? '#94A3B8' : '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: adding || !name || !externalUrl ? 'default' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {adding ? 'Adding Product...' : 'Add Product to Store'}
          </button>
        </form>
      </div>

      {/* Product Grid with Drag-to-reorder */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
            Store Catalog ({products.length})
          </p>
          <span style={{ fontSize: 11.5, color: '#8A97A3' }}>
            ↕ Drag to reorder products
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {products.map((p, idx) => {
            const isDragging = draggedIdx === idx
            return (
              <div
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                style={{
                  background: 'white',
                  border: '1px solid #E7EDEC',
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  opacity: isDragging ? 0.4 : 1,
                  cursor: 'grab',
                }}
              >
                <button
                  onClick={() => deleteProduct(p.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'rgba(15,23,42,0.7)',
                    color: 'white',
                    border: 'none',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                  title="Delete Product"
                >
                  ✕
                </button>
                <div style={{ width: '100%', aspectRatio: '1.2', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 32 }}>🛍️</span>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#0D9488', fontWeight: 700 }}>
                      {p.price || 'Free'}
                    </p>
                    <a
                      href={p.external_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: '#64748B', textDecoration: 'none', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6, fontWeight: 500 }}
                    >
                      Visit ↗
                    </a>
                  </div>
                </div>
              </div>
            )
          })}

          {products.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', background: 'white', border: '1px dashed #CBD5E1', borderRadius: 16, padding: '32px 16px', color: '#8A97A3' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: '#0F172A' }}>No products listed yet</p>
              <p style={{ margin: 0, fontSize: 12 }}>Paste an external link above to showcase your merchandise or digital downloads.</p>
            </div>
          )}
        </div>
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
  fontSize: 13.5,
  color: '#0F172A',
  outline: 'none',
}
