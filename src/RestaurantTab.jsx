import { useEffect, useState } from 'react'

export async function fetchServerRestaurantMenu(username, userId) {
  try {
    const clean = (username || '').toLowerCase().replace(/^@/, '').trim()
    const query = `username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(userId || '')}`
    const res = await fetch(`/api/restaurant-menu?${query}`)
    if (res.ok) {
      const data = await res.json()
      return data.menu || null
    }
  } catch (e) {}
  return null
}

const DEFAULT_CATEGORIES = [
  'Burgers & Sandwiches 🍔',
  'Pizzas & Pastas 🍕',
  'Plats & Grills 🥩',
  'Salades & Entrées 🥗',
  'Tacos & Fast Food 🌯',
  'Boissons & Cocktails 🍹',
  'Café & Thé ☕',
  'Desserts & Pâtisserie 🍰',
  'Petit Déjeuner 🥐',
]

const FOOD_PHOTO_PRESETS = [
  { label: 'Burger Gourmet', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80' },
  { label: 'Pizza Margherita', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80' },
  { label: 'Tagine / Meat Dish', url: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=500&auto=format&fit=crop&q=80' },
  { label: 'Italian Pasta', url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281242?w=500&auto=format&fit=crop&q=80' },
  { label: 'Fresh Caesar Salad', url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=500&auto=format&fit=crop&q=80' },
  { label: 'French Tacos / Wrap', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80' },
  { label: 'Mixed Grill / BBQ', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80' },
  { label: 'Sushi Combo', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80' },
  { label: 'Fresh Juice / Smoothie', url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=80' },
  { label: 'Artisan Coffee / Latte', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=80' },
  { label: 'Chocolate Cake / Dessert', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80' },
  { label: 'Croissant / Breakfast', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80' },
]

const SAMPLE_DEMO_MENU = {
  enabled: true,
  restaurantName: 'Le Gourmet Lounge',
  cuisineType: 'Burgers, Pizzas, Grill & Specialty Coffee',
  currency: 'DH',
  whatsappNumber: '+212600000000',
  allowTableOrders: true,
  allowTakeaway: true,
  wifiName: 'LeGourmet_Guest',
  wifiPass: 'welcome2026',
  openingHours: '11:30 AM - 11:30 PM (Daily)',
  pdfMenuUrl: '',
  categories: [
    'Burgers & Sandwiches 🍔',
    'Pizzas & Pastas 🍕',
    'Salades & Entrées 🥗',
    'Boissons & Cocktails 🍹',
    'Desserts & Café ☕',
  ],
  items: [
    {
      id: 'dish_demo_1',
      name: 'Burger Le Signature',
      category: 'Burgers & Sandwiches 🍔',
      price: '65',
      description: 'Double steak de boeuf 180g, cheddar affiné, oignons caramélisés, sauce secrète & frites maison.',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      tags: ['⭐ Best Seller', '🥩 Chef Special'],
      available: true,
    },
    {
      id: 'dish_demo_2',
      name: 'Pizza Truffe & Mozzarella',
      category: 'Pizzas & Pastas 🍕',
      price: '85',
      description: 'Pâte artisanale levée 48h, crème de truffe, mozzarella fior di latte, champignons frais & roquette.',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
      tags: ['⭐ Best Seller', '🥗 Veggie'],
      available: true,
    },
    {
      id: 'dish_demo_3',
      name: 'Salade César Croustillante',
      category: 'Salades & Entrées 🥗',
      price: '55',
      description: 'Poulet mariné pané, coeur de romaine, copeaux de parmesan, croûtons dorés à l’ail & sauce César crémeuse.',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=500&auto=format&fit=crop&q=80',
      tags: ['🥗 Fresh'],
      available: true,
    },
    {
      id: 'dish_demo_4',
      name: 'Mojito Passion Frais',
      category: 'Boissons & Cocktails 🍹',
      price: '35',
      description: 'Fruits de la passion frais, menthe fraîche pilée, citron vert, sucre de canne & eau gazeuse.',
      imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=80',
      tags: ['🍹 Refreshing'],
      available: true,
    },
    {
      id: 'dish_demo_5',
      name: 'Fondant au Chocolat Coeur Coulant',
      category: 'Desserts & Café ☕',
      price: '40',
      description: 'Chocolat noir 70%, servi tiède avec une boule de glace vanille de Madagascar.',
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
      tags: ['🍰 Sweet'],
      available: true,
    },
  ],
}

export default function RestaurantTab({ profile, onUpdated }) {
  const [enabled, setEnabled] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [currency, setCurrency] = useState('DH')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [allowTableOrders, setAllowTableOrders] = useState(true)
  const [allowTakeaway, setAllowTakeaway] = useState(true)
  const [wifiName, setWifiName] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [openingHours, setOpeningHours] = useState('11:00 - 23:30')
  const [pdfMenuUrl, setPdfMenuUrl] = useState('')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [items, setItems] = useState([])

  // Item form modal / state
  const [isEditingItem, setIsEditingItem] = useState(false)
  const [currentItemId, setCurrentItemId] = useState(null)
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState(DEFAULT_CATEGORIES[0])
  const [itemPrice, setItemPrice] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemImage, setItemImage] = useState('')
  const [itemTags, setItemTags] = useState([])
  const [itemAvailable, setItemAvailable] = useState(true)

  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [showCatModal, setShowCatModal] = useState(false)

  const username = profile?.username || ''
  const userId = profile?.id || ''

  useEffect(() => {
    loadMenuData()
  }, [username, userId])

  async function loadMenuData() {
    let localData = null
    try {
      const stored = localStorage.getItem(`linksocio_restaurant_menu_${username || userId}`)
      if (stored) localData = JSON.parse(stored)
    } catch (e) {}

    if (localData) {
      applyState(localData)
    }

    const serverData = await fetchServerRestaurantMenu(username, userId)
    if (serverData) {
      applyState(serverData)
      try {
        localStorage.setItem(`linksocio_restaurant_menu_${username || userId}`, JSON.stringify(serverData))
      } catch (e) {}
    }
  }

  function applyState(data) {
    if (!data) return
    setEnabled(data.enabled ?? false)
    setRestaurantName(data.restaurantName || '')
    setCuisineType(data.cuisineType || '')
    setCurrency(data.currency || 'DH')
    setWhatsappNumber(data.whatsappNumber || '')
    setAllowTableOrders(data.allowTableOrders ?? true)
    setAllowTakeaway(data.allowTakeaway ?? true)
    setWifiName(data.wifiName || '')
    setWifiPass(data.wifiPass || '')
    setOpeningHours(data.openingHours || '11:00 - 23:30')
    setPdfMenuUrl(data.pdfMenuUrl || '')
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      setCategories(data.categories)
      if (!data.categories.includes(itemCategory)) {
        setItemCategory(data.categories[0])
      }
    }
    if (Array.isArray(data.items)) {
      setItems(data.items)
    }
  }

  async function saveAll(overrides = {}) {
    setSaving(true)
    const payload = {
      enabled: overrides.enabled !== undefined ? overrides.enabled : enabled,
      restaurantName: overrides.restaurantName !== undefined ? overrides.restaurantName : restaurantName,
      cuisineType: overrides.cuisineType !== undefined ? overrides.cuisineType : cuisineType,
      currency: overrides.currency !== undefined ? overrides.currency : currency,
      whatsappNumber: overrides.whatsappNumber !== undefined ? overrides.whatsappNumber : whatsappNumber,
      allowTableOrders: overrides.allowTableOrders !== undefined ? overrides.allowTableOrders : allowTableOrders,
      allowTakeaway: overrides.allowTakeaway !== undefined ? overrides.allowTakeaway : allowTakeaway,
      wifiName: overrides.wifiName !== undefined ? overrides.wifiName : wifiName,
      wifiPass: overrides.wifiPass !== undefined ? overrides.wifiPass : wifiPass,
      openingHours: overrides.openingHours !== undefined ? overrides.openingHours : openingHours,
      pdfMenuUrl: overrides.pdfMenuUrl !== undefined ? overrides.pdfMenuUrl : pdfMenuUrl,
      categories: overrides.categories !== undefined ? overrides.categories : categories,
      items: overrides.items !== undefined ? overrides.items : items,
    }

    try {
      localStorage.setItem(`linksocio_restaurant_menu_${username || userId}`, JSON.stringify(payload))
    } catch (e) {}

    try {
      await fetch('/api/restaurant-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userId,
          menu: payload,
        }),
      })
    } catch (e) {}

    setSaving(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
    if (onUpdated) onUpdated()
  }

  function handleOpenAddItem() {
    setCurrentItemId(null)
    setItemName('')
    setItemCategory(categories[0] || 'Plats')
    setItemPrice('')
    setItemDesc('')
    setItemImage('')
    setItemTags([])
    setItemAvailable(true)
    setIsEditingItem(true)
  }

  function handleEditItem(item) {
    setCurrentItemId(item.id)
    setItemName(item.name || '')
    setItemCategory(item.category || categories[0] || 'Plats')
    setItemPrice(item.price || '')
    setItemDesc(item.description || '')
    setItemImage(item.imageUrl || '')
    setItemTags(item.tags || [])
    setItemAvailable(item.available ?? true)
    setIsEditingItem(true)
  }

  function handleSaveItem(e) {
    e.preventDefault()
    if (!itemName.trim()) return

    const newItem = {
      id: currentItemId || `dish_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemName.trim(),
      category: itemCategory || categories[0] || 'General',
      price: itemPrice.trim(),
      description: itemDesc.trim(),
      imageUrl: itemImage.trim(),
      tags: itemTags,
      available: itemAvailable,
    }

    let updatedItems
    if (currentItemId) {
      updatedItems = items.map((it) => (it.id === currentItemId ? newItem : it))
    } else {
      updatedItems = [newItem, ...items]
    }

    setItems(updatedItems)
    setIsEditingItem(false)
    saveAll({ items: updatedItems })
  }

  function handleDeleteItem(id) {
    if (!window.confirm('Delete this menu item?')) return
    const updated = items.filter((it) => it.id !== id)
    setItems(updated)
    saveAll({ items: updated })
  }

  function handleToggleAvailability(item) {
    const updated = items.map((it) => (it.id === item.id ? { ...it, available: !it.available } : it))
    setItems(updated)
    saveAll({ items: updated })
  }

  function handleAddCategory(e) {
    e.preventDefault()
    const clean = newCatInput.trim()
    if (!clean || categories.includes(clean)) return
    const updated = [...categories, clean]
    setCategories(updated)
    setNewCatInput('')
    saveAll({ categories: updated })
  }

  function handleDeleteCategory(cat) {
    if (categories.length <= 1) {
      alert('You must have at least one category.')
      return
    }
    if (!window.confirm(`Delete category "${cat}"? Items under this category will remain in your menu.`)) return
    const updated = categories.filter((c) => c !== cat)
    setCategories(updated)
    saveAll({ categories: updated })
  }

  function handleLoadDemo() {
    if (items.length > 0 && !window.confirm('Load sample demo restaurant menu? This will replace current items.')) {
      return
    }
    applyState(SAMPLE_DEMO_MENU)
    saveAll(SAMPLE_DEMO_MENU)
  }

  const filteredItems = items.filter((it) => {
    const matchCat = filterCategory === 'all' || it.category === filterCategory
    const matchSearch =
      !searchQuery ||
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.description && it.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchCat && matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner Card: Feature Enable & Quick Setup */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🍽️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Restaurant & Cafe Digital Menu</p>
                {enabled && (
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                    ACTIVE ON PAGE
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
                Showcase your food & drink menu, categories, prices, food photos, and allow direct WhatsApp table or takeaway orders.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {items.length === 0 && (
              <button
                type="button"
                onClick={handleLoadDemo}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: '9px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>⚡ Load Demo Menu</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const nextState = !enabled
                setEnabled(nextState)
                saveAll({ enabled: nextState })
              }}
              style={{
                background: enabled ? '#10B981' : '#E2E8F0',
                color: enabled ? 'white' : '#475569',
                border: 'none',
                borderRadius: 100,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{enabled ? '✓ Enabled' : 'Disabled'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restaurant Settings Box */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>⚙️ Restaurant & Ordering Info</p>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#8A97A3' }}>Configure your restaurant details and ordering preferences.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Restaurant / Cafe Name
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Bistro Parisien or Cafe Marrakech"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Cuisine & Specialty
            </label>
            <input
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g. Burgers, Artisan Pizzas, Smoothies"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Currency Symbol / Devise
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="DH, MAD, €, $, DA..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              WhatsApp Number for Food Orders
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. +212612345678"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Opening Hours / Horaires
            </label>
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. 11:00 AM - 11:30 PM"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              WiFi Guest Network (Optional)
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={wifiName}
                onChange={(e) => setWifiName(e.target.value)}
                placeholder="WiFi Name"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
              />
              <input
                type="text"
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                placeholder="Password"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowTableOrders}
                onChange={(e) => setAllowTableOrders(e.target.checked)}
              />
              <span>Table Ordering (Prompts for Table #)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowTakeaway}
                onChange={(e) => setAllowTakeaway(e.target.checked)}
              />
              <span>Takeaway / Delivery option</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => saveAll()}
            disabled={saving}
            style={{
              background: '#0F172A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{saving ? 'Saving...' : savedMsg ? '✓ Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Menu Categories Management */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>📑 Menu Categories</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A97A3' }}>Organize your food & beverage items by sections.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCatModal(!showCatModal)}
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showCatModal ? 'Close Category Editor' : '+ Manage / Add Categories'}
          </button>
        </div>

        {/* Categories Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length
            return (
              <div
                key={cat}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: 100,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{cat}</span>
                <span style={{ background: '#CBD5E1', color: '#0F172A', borderRadius: 100, padding: '1px 6px', fontSize: 10.5 }}>
                  {count}
                </span>
                {showCatModal && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
                    title="Delete category"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {showCatModal && (
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              placeholder="New category name (e.g. Seafood & Fish 🐟)"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
            />
            <button
              type="submit"
              style={{ background: '#14B8A6', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Add Category
            </button>
          </form>
        )}
      </div>

      {/* Dishes & Menu Items Management */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>🍲 Dishes & Items ({items.length})</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A97A3' }}>Add, edit, or toggle availability for your food and drinks.</p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddItem}
            style={{
              background: '#14B8A6',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(20, 184, 166, 0.25)',
            }}
          >
            <span>+ Add New Dish / Item</span>
          </button>
        </div>

        {/* Filter bar & Search */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search dishes by name or ingredients..."
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12.5 }}
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12.5, background: 'white', color: '#1E293B' }}
          >
            <option value="all">All Categories ({items.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c} ({items.filter((i) => i.category === c).length})
              </option>
            ))}
          </select>
        </div>

        {/* Item List Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: 12,
                display: 'flex',
                gap: 12,
                background: item.available ? 'white' : '#F8FAFC',
                opacity: item.available ? 1 : 0.7,
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: '#F1F5F9',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>🍽️</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </p>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0D9488', whiteSpace: 'nowrap' }}>
                    {item.price ? `${item.price} ${currency}` : 'Free'}
                  </span>
                </div>

                <p style={{ margin: '2px 0 4px', fontSize: 11, color: '#94A3B8' }}>{item.category}</p>

                {item.description && (
                  <p style={{ margin: '0 0 6px', fontSize: 11.5, color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {item.tags.map((t) => (
                      <span key={t} style={{ background: '#FEF3C7', color: '#92400E', fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(item)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: item.available ? '#10B981' : '#94A3B8',
                      cursor: 'pointer',
                    }}
                  >
                    {item.available ? '● Available' : '○ Out of stock'}
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      style={{ background: '#F1F5F9', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: 16, color: '#94A3B8' }}>
              <p style={{ fontSize: 24, margin: '0 0 6px' }}>🍽️</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>No dishes found</p>
              <p style={{ fontSize: 12, margin: '0 0 14px' }}>Click below to add dishes to your restaurant menu or load our sample template.</p>
              <button
                type="button"
                onClick={handleOpenAddItem}
                style={{ background: '#14B8A6', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                + Add Dish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dish Modal */}
      {isEditingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsEditingItem(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 20,
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                {currentItemId ? '✏️ Edit Dish / Item' : '➕ Add New Dish / Item'}
              </p>
              <button
                type="button"
                onClick={() => setIsEditingItem(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Dish / Drink Title *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Burger Gourmet Beef 180g"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, background: 'white' }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                    Price ({currency})
                  </label>
                  <input
                    type="text"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="e.g. 65"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Description & Ingredients
                </label>
                <textarea
                  rows={3}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="e.g. Double steak 150g, cheddar affiné, sauce maison, salade & frites fraîches."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Image URL
                </label>
                <input
                  type="url"
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  placeholder="https://... or choose from presets below"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }}
                />

                {/* Preset food photo selector */}
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8' }}>Quick sample photos:</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {FOOD_PHOTO_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setItemImage(p.url)}
                        style={{
                          background: itemImage === p.url ? '#0F172A' : '#F1F5F9',
                          color: itemImage === p.url ? 'white' : '#475569',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 10.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Badges & Tags
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['⭐ Best Seller', '🌶️ Spicy', '🥗 Veggie', '🥩 Chef Special', '🆕 New', '🥐 Breakfast'].map((tag) => {
                    const active = itemTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (active) setItemTags(itemTags.filter((t) => t !== tag))
                          else setItemTags([...itemTags, tag])
                        }}
                        style={{
                          background: active ? '#FEF3C7' : '#F8FAFC',
                          color: active ? '#92400E' : '#64748B',
                          border: active ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                          borderRadius: 100,
                          padding: '4px 10px',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {active ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="dish-available"
                  checked={itemAvailable}
                  onChange={(e) => setItemAvailable(e.target.checked)}
                />
                <label htmlFor="dish-available" style={{ fontSize: 12.5, color: '#334155', cursor: 'pointer' }}>
                  Available in stock (dish is ready to order)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingItem(false)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#14B8A6', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}
                >
                  {currentItemId ? 'Save Changes' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
