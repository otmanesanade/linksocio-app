import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import CountryPhoneInput from './components/CountryPhoneInput'

function normalizeUrl(url) {
  if (!url) return url
  if (url.startsWith('/uploads/')) return url
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

// Digital Product Categories with visual badges
export const DIGITAL_CATEGORIES = [
  { id: 'ebook', label: 'E-Book / PDF Guide', icon: '📄', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'template', label: 'Canva / Design Template', icon: '🎨', color: '#EC4899', bg: '#FDF2F8' },
  { id: 'notion', label: 'Notion / Productivity System', icon: '💻', color: '#10B981', bg: '#ECFDF5' },
  { id: 'course', label: 'Video Course & Masterclass', icon: '🎥', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'software', label: 'Software / Presets / Code', icon: '⚙️', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'audio', label: 'Music / Audio & Beats', icon: '🎧', color: '#06B6D4', bg: '#ECFEFF' },
  { id: 'file', label: 'Digital File / ZIP Package', icon: '📁', color: '#14B8A6', bg: '#F0FDFA' },
]

// 1-Click Starter Presets for Quick Creation
const STARTER_PRESETS = [
  {
    name: 'The Ultimate Freelancer Guide (PDF)',
    category: 'ebook',
    price: '99 DH',
    original_price: '199 DH',
    description: 'A complete step-by-step PDF guide with 45+ pages covering client acquisition, pricing strategies, and contract templates.',
    highlights: ['45+ Pages in High-Quality PDF', 'Ready-to-use Contract Templates', 'Lifetime Updates Included'],
    delivery_type: 'whatsapp',
    file_url: 'https://drive.google.com',
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: '30+ Viral Social Media Canva Templates',
    category: 'template',
    price: '149 DH',
    original_price: '299 DH',
    description: 'Fully editable aesthetic Instagram & TikTok post/carousel templates designed to boost your engagement.',
    highlights: ['30+ Fully Editable Canva Templates', 'Customizable Fonts & Colors', 'Commercial Use License'],
    delivery_type: 'whatsapp',
    file_url: 'https://canva.com',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'All-in-One Life & Business OS (Notion)',
    category: 'notion',
    price: '199 DH',
    original_price: '350 DH',
    description: 'The ultimate Notion workspace to organize your habits, finances, projects, and daily tasks in one clean dashboard.',
    highlights: ['Complete Life & Business Dashboard', 'Finance & Habit Trackers', '1-Click Notion Duplicate'],
    delivery_type: 'whatsapp',
    file_url: 'https://notion.so',
    image_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Pro Mobile & Desktop Lightroom Presets',
    category: 'software',
    price: '79 DH',
    original_price: '150 DH',
    description: '10 professional aesthetic color grading presets for mobile Lightroom & desktop with video install tutorial.',
    highlights: ['10 DNG & XMP Presets', 'One-Click Photo Enhancement', 'Step-by-Step Video Tutorial'],
    delivery_type: 'whatsapp',
    file_url: 'https://drive.google.com',
    image_url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=80',
  },
]

export default function ShopTab({ user, profile, products = [], reloadProducts }) {
  // Mode: 'digital' (digital product creation) | 'external' (affiliate/link)
  const [creationMode, setCreationMode] = useState('digital')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'digital' | 'external'

  // Product Form Fields
  const [name, setName] = useState('')
  const [category, setCategory] = useState('ebook')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [description, setDescription] = useState('')
  const [deliveryType, setDeliveryType] = useState('whatsapp') // 'whatsapp' | 'download' | 'external'
  const [highlightInput, setHighlightInput] = useState('')
  const [highlights, setHighlights] = useState([])

  // Desktop File Upload state for digital product
  const [fileSourceMode, setFileSourceMode] = useState('upload') // 'upload' | 'link'
  const [uploadedFile, setUploadedFile] = useState(null) // { name, size, type, url }
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState(null)

  // Loading & interaction states
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [previewProduct, setPreviewProduct] = useState(null)

  // Upload digital file from desktop
  const handleDigitalFileUpload = async (file) => {
    if (!file) return
    setUploadingFile(true)
    setUploadError('')
    setUploadProgress(15)

    const formattedSize = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
      : Math.max(1, Math.round(file.size / 1024)) + ' KB'

    const ext = (file.name.split('.').pop() || '').toLowerCase()

    // Auto-detect digital category based on file extension
    if (['pdf', 'epub', 'mobi'].includes(ext)) {
      setCategory('ebook')
    } else if (['zip', 'rar', '7z', 'tar', 'gz', 'pkg'].includes(ext)) {
      setCategory('file')
    } else if (['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'].includes(ext)) {
      setCategory('audio')
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      setCategory('course')
    } else if (['psd', 'ai', 'fig', 'sketch', 'xd', 'canva'].includes(ext)) {
      setCategory('template')
    } else if (['exe', 'dmg', 'js', 'py', 'json'].includes(ext)) {
      setCategory('software')
    }

    // Auto-fill title if empty
    if (!name.trim()) {
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim()
      if (cleanTitle) {
        setName(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1))
      }
    }

    // Default delivery to direct instant download
    if (deliveryType === 'external') {
      setDeliveryType('download')
    }

    try {
      setUploadProgress(35)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.min(80, Math.round((e.loaded / e.total) * 45) + 35)
            setUploadProgress(percent)
          }
        }
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setUploadProgress(85)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          base64,
          size: file.size,
          type: file.type || 'application/octet-stream',
        }),
      })

      if (!res.ok) {
        throw new Error('Upload failed on server with status ' + res.status)
      }

      const json = await res.json()
      if (!json.success || !json.url) {
        throw new Error(json.error || 'Upload failed')
      }

      setUploadProgress(100)
      setFileUrl(json.url)
      setUploadedFile({
        name: file.name,
        size: formattedSize,
        type: file.type || ext,
        url: json.url,
      })
      setSuccessMsg(`✓ File "${file.name}" uploaded successfully from your desktop!`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error('File upload error:', err)
      setUploadError(err.message || 'Failed to upload file from desktop')
    } finally {
      setUploadingFile(false)
    }
  }

  // Fetch product info from external URL (Amazon, Shopify, etc.)
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
      // User can fill fields manually
    }
    setFetching(false)
  }

  // Apply a starter preset
  const applyPreset = (preset) => {
    setName(preset.name)
    setCategory(preset.category)
    setPrice(preset.price)
    setOriginalPrice(preset.original_price)
    setDescription(preset.description)
    setHighlights([...preset.highlights])
    setDeliveryType(preset.delivery_type)
    setFileUrl(preset.file_url)
    setImageUrl(preset.image_url)
    setUploadedFile(null)
    setFileSourceMode('link')
    setCreationMode('digital')
    setSuccessMsg(`Loaded preset: "${preset.name}"! You can customize it now.`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // Handle Cover Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 4 * 1024 * 1024) {
      alert('Image file size is too large (max 4MB). Please choose a smaller image.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageUrl(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Add a highlight bullet point
  const addHighlight = () => {
    if (!highlightInput.trim()) return
    if (!highlights.includes(highlightInput.trim())) {
      setHighlights([...highlights, highlightInput.trim()])
    }
    setHighlightInput('')
  }

  const removeHighlight = (idx) => {
    setHighlights(highlights.filter((_, i) => i !== idx))
  }

  const downloadUploadedFile = async (url, fileName) => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Download failed')
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        throw new Error('Server returned HTML')
      }
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'download.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500)
    } catch (e) {
      window.open(url, '_blank')
    }
  }

  // Reset form
  const resetForm = () => {
    setName('')
    setCategory('ebook')
    setPrice('')
    setOriginalPrice('')
    setImageUrl('')
    setExternalUrl('')
    setFileUrl('')
    setDescription('')
    setDeliveryType('whatsapp')
    setHighlightInput('')
    setHighlights([])
    setUploadedFile(null)
    setUploadProgress(0)
    setUploadError('')
    setFileSourceMode('upload')
    setEditingId(null)
  }

  // Start editing an existing product
  const startEdit = (p) => {
    setEditingId(p.id)
    setName(p.name || '')
    setPrice(p.price || '')
    setOriginalPrice(p.original_price || '')
    setImageUrl(p.image_url || '')
    setExternalUrl(p.external_url || '')
    setFileUrl(p.file_url || '')
    setDescription(p.description || '')
    setCategory(p.category || (p.is_digital ? 'ebook' : 'file'))
    setDeliveryType(p.delivery_type || (p.is_digital ? 'whatsapp' : 'external'))
    setHighlights(Array.isArray(p.highlights) ? p.highlights : [])
    setCreationMode(p.is_digital || !p.external_url || p.delivery_type === 'whatsapp' ? 'digital' : 'external')

    // Detect if product has a desktop uploaded file
    if (p.file_url && (p.file_url.startsWith('/uploads/') || p.file_name)) {
      setFileSourceMode('upload')
      setUploadedFile({
        name: p.file_name || p.file_url.split('/').pop().replace(/^\d+_/, ''),
        size: p.file_size || '',
        url: p.file_url,
      })
    } else if (p.file_url) {
      setFileSourceMode('link')
      setUploadedFile(null)
    } else {
      setFileSourceMode('upload')
      setUploadedFile(null)
    }

    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Save (Create or Update) Product
  async function saveProduct(e) {
    if (e) e.preventDefault()
    if (!name.trim()) {
      alert('Please enter a product title.')
      return
    }

    setSaving(true)

    const isDigital = creationMode === 'digital'
    const targetExternalUrl = isDigital
      ? deliveryType === 'download'
        ? normalizeUrl(fileUrl) || 'https://linksocio.com'
        : normalizeUrl(fileUrl || externalUrl) || 'https://linksocio.com'
      : normalizeUrl(externalUrl.trim())

    const productPayload = {
      user_id: user?.id,
      name: name.trim(),
      price: price.trim() || 'Free',
      original_price: originalPrice.trim() || null,
      image_url: imageUrl.trim() || null,
      external_url: targetExternalUrl,
      file_url: fileUrl.trim() || null,
      file_name: uploadedFile?.name || null,
      file_size: uploadedFile?.size || null,
      description: description.trim() || null,
      category: isDigital ? category : 'external',
      delivery_type: isDigital ? deliveryType : 'external',
      highlights: highlights,
      is_digital: isDigital,
      position: editingId ? undefined : products.length,
    }

    try {
      if (editingId) {
        // Update in Supabase
        await supabase
          .from('products')
          .update({
            name: productPayload.name,
            price: productPayload.price,
            image_url: productPayload.image_url,
            external_url: productPayload.external_url,
          })
          .eq('id', editingId)
      } else {
        // Insert in Supabase
        await supabase.from('products').insert({
          user_id: user?.id,
          name: productPayload.name,
          price: productPayload.price,
          image_url: productPayload.image_url,
          external_url: productPayload.external_url,
          position: products.length,
        })
      }

      // Authoritative save to API store (supports full digital product schema)
      const username = profile?.username || user?.user_metadata?.username || ''
      const userId = user?.id || ''
      if (username || userId) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            userId,
            product: {
              id: editingId || 'prod_' + Date.now(),
              ...productPayload,
            },
          }),
        }).catch(() => {})
      }

      setSuccessMsg(editingId ? '✓ Product updated successfully!' : '✓ New digital product added to your storefront!')
      setTimeout(() => setSuccessMsg(''), 4000)
      resetForm()
      if (reloadProducts) reloadProducts()
    } catch (err) {
      console.error('Error saving product:', err)
    }

    setSaving(false)
  }

  // Delete product
  async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await supabase.from('products').delete().eq('id', id)

      const username = profile?.username || user?.user_metadata?.username || ''
      const userId = user?.id || ''
      if (username || userId) {
        await fetch('/api/products', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, userId, productId: id }),
        }).catch(() => {})
      }

      if (reloadProducts) reloadProducts()
    } catch (e) {}
  }

  // Drag & drop reorder
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

    // Sync to API store
    const username = profile?.username || user?.user_metadata?.username || ''
    const userId = user?.id || ''
    if (username || userId) {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId, products: reordered }),
      }).catch(() => {})
    }

    if (reloadProducts) reloadProducts()
  }

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    if (activeFilter === 'digital') return p.is_digital || p.category || p.delivery_type === 'whatsapp' || p.file_url
    if (activeFilter === 'external') return !p.is_digital && p.category !== 'ebook' && p.category !== 'notion' && p.category !== 'template'
    return true
  })

  const digitalCount = products.filter((p) => p.is_digital || p.category || p.delivery_type === 'whatsapp' || p.file_url).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Success Banner */}
      {successMsg && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            borderRadius: 14,
            padding: '12px 18px',
            fontSize: 13.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 6px rgba(16,185,129,0.1)',
          }}
        >
          <span>✨</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Creation Card */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 24, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                {editingId ? 'Edit Product' : 'Digital Products & Storefront'}
              </h2>
              <span
                style={{
                  background: '#F0FDFA',
                  color: '#0D9488',
                  border: '1px solid #CCFBF1',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                }}
              >
                PRO Store
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
              Sell E-Books, Canva templates, Notion systems, courses, presets, or direct file downloads.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              ✕ Cancel Editing
            </button>
          )}
        </div>

        {/* 1-Click Starter Presets Bar */}
        {!editingId && (
          <div style={{ marginBottom: 20, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>⚡</span> Quick Starter Presets (Click to autofill):
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Instant 1-Click Setup</span>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
              {STARTER_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    flexShrink: 0,
                    background: 'white',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    padding: '7px 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#14B8A6'
                    e.currentTarget.style.background = '#F0FDFA'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1'
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  <span>{DIGITAL_CATEGORIES.find((c) => c.id === preset.category)?.icon || '📦'}</span>
                  <span>{preset.name.split(' (')[0]}</span>
                  <span style={{ background: '#14B8A6', color: 'white', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                    {preset.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, background: '#F1F5F9', padding: 4, borderRadius: 14 }}>
          <button
            type="button"
            onClick={() => setCreationMode('digital')}
            style={{
              background: creationMode === 'digital' ? 'white' : 'transparent',
              color: creationMode === 'digital' ? '#0F172A' : '#64748B',
              border: 'none',
              borderRadius: 10,
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: creationMode === 'digital' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>📦</span> Digital Product (E-Book, Course, Template)
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('external')}
            style={{
              background: creationMode === 'external' ? 'white' : 'transparent',
              color: creationMode === 'external' ? '#0F172A' : '#64748B',
              border: 'none',
              borderRadius: 10,
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: creationMode === 'external' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>🔗</span> External Link (Amazon, Shopify, Etsy)
          </button>
        </div>

        {/* Digital Product Form */}
        <form onSubmit={saveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {creationMode === 'digital' ? (
            <>
              {/* Category Selector */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Product Category / Type:
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DIGITAL_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        style={{
                          background: isSelected ? cat.bg : '#F8FAFC',
                          border: isSelected ? `2px solid ${cat.color}` : '1px solid #E2E8F0',
                          color: isSelected ? cat.color : '#64748B',
                          borderRadius: 10,
                          padding: '6px 11px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title & Delivery Type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Product Title *
                  </label>
                  <input
                    placeholder="e.g. Master Freelance Design E-Book (PDF)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Delivery & Checkout Method:
                  </label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600 }}
                  >
                    <option value="whatsapp">💬 Order & Pay via WhatsApp (Recommended)</option>
                    <option value="download">⚡ Instant Direct File Download / Access</option>
                    <option value="external">🔗 External Checkout (Gumroad, Stripe, etc.)</option>
                  </select>
                </div>
              </div>

              {/* Price & Original Price (Discount) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Selling Price *
                  </label>
                  <input
                    placeholder="e.g. 99 DH, $19, 19 €, Free"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={inputStyle}
                  />
                  {/* Quick Price Pills */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {['Free', '49 DH', '99 DH', '149 DH', '199 DH', '299 DH', '$9', '$19', '$29', '$49', '19 €', '29 €'].map(
                      (pTag) => (
                        <button
                          key={pTag}
                          type="button"
                          onClick={() => setPrice(pTag)}
                          style={{
                            background: price === pTag ? '#14B8A6' : '#F1F5F9',
                            color: price === pTag ? 'white' : '#475569',
                            border: 'none',
                            borderRadius: 6,
                            padding: '2px 7px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {pTag}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Original Price (Optional - Displays Discount Badge):
                  </label>
                  <input
                    placeholder="e.g. 199 DH, $49 (Shows strike-through)"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    style={inputStyle}
                  />
                  <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'block' }}>
                    💡 e.g. Original 199 DH + Sale 99 DH shows a "50% OFF" badge!
                  </span>
                </div>
              </div>

              {/* Digital Product File & Desktop Upload Section */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <span>📁</span> Digital Product File & Instant Delivery:
                  </label>
                  {/* Switcher: Desktop Upload vs Cloud Link */}
                  <div style={{ display: 'flex', gap: 4, background: '#E2E8F0', padding: 2, borderRadius: 8 }}>
                    <button
                      type="button"
                      onClick={() => setFileSourceMode('upload')}
                      style={{
                        background: fileSourceMode === 'upload' ? 'white' : 'transparent',
                        color: fileSourceMode === 'upload' ? '#0F172A' : '#64748B',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: fileSourceMode === 'upload' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>💻 Upload from Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileSourceMode('link')}
                      style={{
                        background: fileSourceMode === 'link' ? 'white' : 'transparent',
                        color: fileSourceMode === 'link' ? '#0F172A' : '#64748B',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: fileSourceMode === 'link' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>🔗 Paste Cloud Link</span>
                    </button>
                  </div>
                </div>

                {fileSourceMode === 'upload' ? (
                  <div>
                    {uploadedFile ? (
                      /* File Uploaded Preview Card */
                      <div
                        style={{
                          background: 'white',
                          border: '1px solid #14B8A6',
                          borderRadius: 12,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          boxShadow: '0 2px 6px rgba(20,184,166,0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: '#F0FDFA',
                              color: '#0D9488',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              flexShrink: 0,
                            }}
                          >
                            📄
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={uploadedFile.name}
                            >
                              {uploadedFile.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                              {uploadedFile.size && (
                                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                                  {uploadedFile.size}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
                                ✓ Ready for customer instant download
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {uploadedFile.url && (
                            <button
                              type="button"
                              onClick={() => downloadUploadedFile(uploadedFile.url, uploadedFile.name)}
                              style={{
                                background: '#F1F5F9',
                                color: '#0F172A',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer',
                              }}
                              title="Test Download File"
                            >
                              <span>📥 Test</span>
                            </button>
                          )}
                          <label
                            style={{
                              background: '#0F172A',
                              color: 'white',
                              padding: '6px 10px',
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>🔄 Replace</span>
                            <input
                              type="file"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleDigitalFileUpload(e.target.files[0])
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null)
                              setFileUrl('')
                            }}
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              padding: '6px 8px',
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Remove File"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Desktop Zone */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDraggingFile(true)
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDraggingFile(false)
                          if (e.dataTransfer.files?.[0]) {
                            handleDigitalFileUpload(e.dataTransfer.files[0])
                          }
                        }}
                        style={{
                          border: isDraggingFile ? '2px dashed #14B8A6' : '2px dashed #CBD5E1',
                          background: isDraggingFile ? '#F0FDFA' : 'white',
                          borderRadius: 12,
                          padding: '22px 16px',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          document.getElementById('desktop-digital-file-input')?.click()
                        }}
                      >
                        <input
                          id="desktop-digital-file-input"
                          type="file"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleDigitalFileUpload(e.target.files[0])
                          }}
                          style={{ display: 'none' }}
                        />

                        {uploadingFile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 24 }}>⏳</div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                              Uploading file from your computer ({uploadProgress}%)...
                            </span>
                            <div style={{ width: '80%', maxWidth: 260, height: 6, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${uploadProgress}%`,
                                  height: '100%',
                                  background: '#14B8A6',
                                  borderRadius: 10,
                                  transition: 'width 0.2s ease',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 28, marginBottom: 6 }}>💻</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                              Drag & drop your file from Desktop, or <span style={{ color: '#0D9488', textDecoration: 'underline' }}>Browse from Computer</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 8 }}>
                              Upload PDF guides, ZIP files, audio beats, videos, presets, or eBooks
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
                              {['.PDF', '.ZIP', '.RAR', '.EPUB', '.MP3', '.MP4', '.PSD', '.AI', '.DOCX'].map((extTag) => (
                                <span
                                  key={extTag}
                                  style={{
                                    background: '#F1F5F9',
                                    color: '#475569',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  {extTag}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        {uploadError && (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: '#DC2626', fontWeight: 600 }}>
                            ⚠️ {uploadError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Cloud Link Input */
                  <div>
                    <input
                      placeholder="e.g. https://drive.google.com/file/d/... or https://notion.so/..."
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      style={{ ...inputStyle, background: 'white' }}
                    />
                    <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                      💡 Paste a link from Google Drive, Dropbox, Mega, Canva, or Notion. Buyers will receive direct access.
                    </span>
                  </div>
                )}
              </div>

              {/* Cover Image */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Product Cover Image (Upload from Desktop or paste URL):
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    placeholder="Paste image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <label
                    style={{
                      background: '#0F172A',
                      color: 'white',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>📁 Upload from Desktop</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                {imageUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={imageUrl}
                      alt="Cover Preview"
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0' }}
                    />
                    <span style={{ fontSize: 11.5, color: '#16A34A', fontWeight: 600 }}>✓ Image cover ready</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Key Highlights / Features Checklist */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Key Features / What's Inside (Highlights):
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="e.g. 50+ Pages High Quality PDF, Lifetime Updates..."
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addHighlight()
                      }
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addHighlight}
                    style={{
                      background: '#F1F5F9',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      borderRadius: 12,
                      padding: '0 16px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Add
                  </button>
                </div>

                {highlights.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {highlights.map((h, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#F0FDFA',
                          border: '1px solid #CCFBF1',
                          color: '#0F766E',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 11.5,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>✓ {h}</span>
                        <button
                          type="button"
                          onClick={() => removeHighlight(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Detailed Description (Optional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what value the buyer will get from this digital product..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
                />
              </div>
            </>
          ) : (
            <>
              {/* External Link Form */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Product External URL (Amazon, Shopify, Etsy, Gumroad...):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="https://amazon.com/... or https://etsy.com/..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    required
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={fetchInfo}
                    disabled={!externalUrl || fetching}
                    style={{
                      background: fetching ? '#94A3B8' : '#0F172A',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      padding: '0 16px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: !externalUrl || fetching ? 'default' : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {fetching ? 'Auto Fetching...' : '⚡ Auto-Fetch'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Product Title *
                  </label>
                  <input placeholder="Product Title" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                    Price
                  </label>
                  <input placeholder="e.g. $29, 29 €, 199 DH" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                  Image URL
                </label>
                <input placeholder="Image URL (https://...)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              background: saving || !name.trim() ? '#94A3B8' : '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '13px',
              fontSize: 14,
              fontWeight: 700,
              cursor: saving || !name.trim() ? 'default' : 'pointer',
              boxShadow: '0 2px 8px rgba(20,184,166,0.25)',
              marginTop: 6,
              transition: 'background 0.15s ease',
            }}
          >
            {saving ? 'Saving Product...' : editingId ? '✓ Save Changes' : '✨ Add Product to Storefront'}
          </button>
        </form>
      </div>

      {/* Catalog & Products List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              Your Products Catalog ({products.length})
            </h3>
            {digitalCount > 0 && (
              <span style={{ background: '#F0FDFA', color: '#0D9488', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                {digitalCount} Digital
              </span>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                background: activeFilter === 'all' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                color: activeFilter === 'all' ? '#0F172A' : '#64748B',
                cursor: 'pointer',
              }}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('digital')}
              style={{
                background: activeFilter === 'digital' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                color: activeFilter === 'digital' ? '#0D9488' : '#64748B',
                cursor: 'pointer',
              }}
            >
              📦 Digital ({digitalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('external')}
              style={{
                background: activeFilter === 'external' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                color: activeFilter === 'external' ? '#0F172A' : '#64748B',
                cursor: 'pointer',
              }}
            >
              🔗 Links ({products.length - digitalCount})
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filteredProducts.map((p, idx) => {
            const isDragging = draggedIdx === idx
            const categoryObj = DIGITAL_CATEGORIES.find((c) => c.id === p.category) || DIGITAL_CATEGORIES[0]
            const isDigital = p.is_digital || p.category || p.delivery_type === 'whatsapp'

            return (
              <div
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: 18,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  opacity: isDragging ? 0.4 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Action Buttons: Edit & Delete */}
                <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(15,23,42,0.75)',
                      color: 'white',
                      border: 'none',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                    }}
                    title="Edit Product"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(239,68,68,0.85)',
                      color: 'white',
                      border: 'none',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                    }}
                    title="Delete Product"
                  >
                    ✕
                  </button>
                </div>

                {/* Badge tags overlay */}
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {isDigital && (
                    <span
                      style={{
                        background: categoryObj.color,
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {categoryObj.icon} {categoryObj.label.split(' / ')[0]}
                    </span>
                  )}
                  {p.file_url && p.file_url.startsWith('/uploads/') && (
                    <span
                      style={{
                        background: '#0F172A',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 6,
                      }}
                      title={p.file_name || 'Uploaded File'}
                    >
                      💻 {p.file_size ? `${p.file_size}` : 'File Ready'}
                    </span>
                  )}
                  {p.original_price && (
                    <span
                      style={{
                        background: '#EF4444',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 6,
                      }}
                    >
                      🔥 SALE
                    </span>
                  )}
                </div>

                {/* Cover Image Thumbnail */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1.4',
                    background: categoryObj.bg || '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 38 }}>{categoryObj.icon || '🛍️'}</span>
                  )}
                </div>

                {/* Info & Details */}
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </p>

                  {p.description && (
                    <p
                      style={{
                        margin: '0 0 10px',
                        fontSize: 12,
                        color: '#64748B',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {p.description}
                    </p>
                  )}

                  {/* Highlights preview */}
                  {Array.isArray(p.highlights) && p.highlights.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                      {p.highlights.slice(0, 2).map((h, i) => (
                        <span key={i} style={{ fontSize: 11, color: '#0D9488', fontWeight: 600 }}>
                          ✓ {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price & Action Row */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 10,
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0D9488' }}>{p.price || 'Free'}</span>
                      {p.original_price && (
                        <span style={{ fontSize: 11.5, color: '#94A3B8', textDecoration: 'line-through', marginLeft: 6 }}>
                          {p.original_price}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewProduct(p)}
                      style={{
                        background: '#0F172A',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '5px 10px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>👁️ Preview</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredProducts.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                background: 'white',
                border: '1px dashed #CBD5E1',
                borderRadius: 20,
                padding: '40px 20px',
                color: '#64748B',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No products in this category</h4>
              <p style={{ margin: 0, fontSize: 13 }}>
                Use the form above or pick a starter preset to add your first digital product or link!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal for Seller */}
      {previewProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewProduct(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              maxWidth: 420,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              animation: 'scaleUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header image */}
            <div
              style={{
                width: '100%',
                height: 180,
                background: '#0F172A',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {previewProduct.image_url ? (
                <img src={previewProduct.image_url} alt={previewProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 50 }}>📦</span>
              )}
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: 'none',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    background: '#F0FDFA',
                    color: '#0D9488',
                    border: '1px solid #CCFBF1',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                  }}
                >
                  📦 Digital Download
                </span>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0D9488' }}>{previewProduct.price}</span>
                  {previewProduct.original_price && (
                    <span style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'line-through', marginLeft: 6 }}>
                      {previewProduct.original_price}
                    </span>
                  )}
                </div>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{previewProduct.name}</h3>

              {previewProduct.description && (
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  {previewProduct.description}
                </p>
              )}

              {Array.isArray(previewProduct.highlights) && previewProduct.highlights.length > 0 && (
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#334155' }}>Included with download:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {previewProduct.highlights.map((h, i) => (
                      <span key={i} style={{ fontSize: 12, color: '#0F766E', fontWeight: 600 }}>
                        ✓ {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                style={{
                  width: '100%',
                  background: '#14B8A6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#FBFCFC',
  padding: '11px 14px',
  fontSize: 13.5,
  color: '#0F172A',
  outline: 'none',
}
