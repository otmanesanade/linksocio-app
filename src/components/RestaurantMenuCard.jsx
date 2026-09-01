import { useEffect, useState } from 'react'
import { fetchServerRestaurantMenu } from '../RestaurantTab'

export function RestaurantMenuCard({ profile, theme, isEmbedded }) {
  const [menu, setMenu] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState({}) // { itemId: quantity }
  const [showCartModal, setShowCartModal] = useState(false)
  const [orderType, setOrderType] = useState('table') // 'table' | 'takeaway' | 'delivery'
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [wifiCopied, setWifiCopied] = useState(false)

  const username = profile?.username || ''
  const userId = profile?.id || ''

  useEffect(() => {
    if (profile?._restaurantMenu) {
      setMenu(profile._restaurantMenu)
    }
    load()
  }, [username, userId, profile?._restaurantMenu, profile?._ts])

  async function load() {
    if (profile?._restaurantMenu) {
      setMenu(profile._restaurantMenu)
    }
    let localData = null
    try {
      const stored = localStorage.getItem(`linksocio_restaurant_menu_${username || userId}`)
      if (stored) localData = JSON.parse(stored)
    } catch (e) {}

    if (localData && !profile?._restaurantMenu) setMenu(localData)

    const serverData = await fetchServerRestaurantMenu(username, userId)
    if (serverData) {
      setMenu(serverData)
      try {
        localStorage.setItem(`linksocio_restaurant_menu_${username || userId}`, JSON.stringify(serverData))
      } catch (e) {}
    }
  }

  if (!menu || !menu.enabled || !Array.isArray(menu.items) || menu.items.length === 0) {
    return null
  }

  const currency = menu.currency || 'DH'
  const items = menu.items || []
  const categories = menu.categories || []

  // Filter items
  const filtered = items.filter((it) => {
    const matchCat = activeCategory === 'all' || it.category === activeCategory
    const matchSearch =
      !search ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.description && it.description.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  // Cart calculation
  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id)
    if (!item) return sum
    const priceNum = parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0
    return sum + priceNum * qty
  }, 0)

  function updateQuantity(itemId, delta) {
    setCart((prev) => {
      const current = prev[itemId] || 0
      const next = current + delta
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return { ...prev, [itemId]: next }
    })
  }

  function handleCopyWifi() {
    if (!menu.wifiPass) return
    navigator.clipboard.writeText(menu.wifiPass)
    setWifiCopied(true)
    setTimeout(() => setWifiCopied(false), 2000)
  }

  function handleSendWhatsAppOrder() {
    let targetPhone = (menu.whatsappNumber || profile?.whatsapp || '').replace(/[^0-9]/g, '')
    if (!targetPhone) {
      alert('Restaurant WhatsApp number is not configured yet.')
      return
    }

    const orderLines = []
    Object.entries(cart).forEach(([id, qty]) => {
      const item = items.find((i) => i.id === id)
      if (item) {
        orderLines.push(`• ${qty}x *${item.name}* (${item.price || '0'} ${currency})`)
      }
    })

    const orderTypeLabel =
      orderType === 'table'
        ? `Sur place (Table: ${tableNumber || 'Non spécifiée'})`
        : orderType === 'takeaway'
        ? 'À emporter (Takeaway)'
        : `Livraison (${customerAddress || 'Adresse à confirmer'})`

    const message = [
      `🍽️ *NOUVELLE COMMANDE - Menu Digital*`,
      `━━━━━━━━━━━━━━━━━━━`,
      customerName ? `👤 *Client:* ${customerName}` : '',
      `📍 *Type:* ${orderTypeLabel}`,
      ``,
      `📋 *Détails des articles:*`,
      ...orderLines,
      ``,
      `💰 *Total Estimé:* ${cartTotal} ${currency}`,
      orderNotes ? `📝 *Remarque:* ${orderNotes}` : '',
      `━━━━━━━━━━━━━━━━━━━`,
      `_Envoyé depuis le menu LinkSocio_`,
    ]
      .filter(Boolean)
      .join('\n')

    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const primaryColor = theme?.btnColor || '#14B8A6'
  const cardBg = theme?.cardBg || '#FFFFFF'
  const textColor = theme?.textColor || '#0F172A'
  const subColor = theme?.subTextColor || '#64748B'

  return (
    <div
      style={{
        marginTop: isEmbedded ? 14 : 20,
        background: cardBg,
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 22,
        padding: isEmbedded ? 12 : 18,
        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
        position: 'relative',
      }}
    >
      {/* Restaurant Header Banner */}
      <div style={{ marginBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: isEmbedded ? 15 : 18 }}>🍽️</span>
              <h3 style={{ margin: 0, fontSize: isEmbedded ? 14 : 16, fontWeight: 700, color: textColor }}>
                {menu.restaurantName || 'Digital Menu'}
              </h3>
            </div>
            {menu.cuisineType && (
              <p style={{ margin: '2px 0 0', fontSize: isEmbedded ? 11 : 12, color: subColor }}>
                {menu.cuisineType}
              </p>
            )}
          </div>

          {/* Opening hours badge */}
          {menu.openingHours && (
            <span
              style={{
                fontSize: isEmbedded ? 10 : 11,
                fontWeight: 600,
                color: '#15803D',
                background: '#DCFCE7',
                padding: '3px 8px',
                borderRadius: 100,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>🕒</span> {menu.openingHours}
            </span>
          )}
        </div>

        {/* WiFi & Info tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {menu.wifiName && (
            <button
              type="button"
              onClick={handleCopyWifi}
              style={{
                background: 'rgba(0,0,0,0.04)',
                border: 'none',
                borderRadius: 100,
                padding: '3px 10px',
                fontSize: isEmbedded ? 10 : 11,
                fontWeight: 600,
                color: textColor,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Click to copy WiFi password"
            >
              <span>📶 WiFi: {menu.wifiName}</span>
              {menu.wifiPass && (
                <span style={{ color: primaryColor }}>
                  {wifiCopied ? '✓ Copied!' : `(${menu.wifiPass})`}
                </span>
              )}
            </button>
          )}

          {menu.pdfMenuUrl && (
            <a
              href={menu.pdfMenuUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'rgba(0,0,0,0.04)',
                borderRadius: 100,
                padding: '3px 10px',
                fontSize: isEmbedded ? 10 : 11,
                fontWeight: 600,
                color: textColor,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>📄 Download PDF Menu</span>
            </a>
          )}
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 6,
          marginBottom: 12,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          style={{
            whiteSpace: 'nowrap',
            border: 'none',
            borderRadius: 100,
            padding: isEmbedded ? '4px 10px' : '6px 12px',
            fontSize: isEmbedded ? 10.5 : 12,
            fontWeight: 600,
            cursor: 'pointer',
            background: activeCategory === 'all' ? primaryColor : 'rgba(0,0,0,0.04)',
            color: activeCategory === 'all' ? '#FFFFFF' : textColor,
            transition: 'all 0.15s ease',
          }}
        >
          All ({items.length})
        </button>

        {categories.map((cat) => {
          const count = items.filter((i) => i.category === cat).length
          if (count === 0) return null
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                whiteSpace: 'nowrap',
                border: 'none',
                borderRadius: 100,
                padding: isEmbedded ? '4px 10px' : '6px 12px',
                fontSize: isEmbedded ? 10.5 : 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: isActive ? primaryColor : 'rgba(0,0,0,0.04)',
                color: isActive ? '#FFFFFF' : textColor,
                transition: 'all 0.15s ease',
              }}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Dishes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((item) => {
          const qty = cart[item.id] || 0
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: 10,
                padding: isEmbedded ? '8px' : '10px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.04)',
                alignItems: 'center',
                opacity: item.available === false ? 0.6 : 1,
              }}
            >
              {/* Dish Thumbnail */}
              {item.imageUrl ? (
                <div
                  style={{
                    width: isEmbedded ? 60 : 70,
                    height: isEmbedded ? 60 : 70,
                    borderRadius: 12,
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : null}

              {/* Dish Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <p style={{ margin: 0, fontSize: isEmbedded ? 12 : 13.5, fontWeight: 700, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <span style={{ fontSize: isEmbedded ? 12 : 13.5, fontWeight: 800, color: primaryColor, whiteSpace: 'nowrap' }}>
                    {item.price ? `${item.price} ${currency}` : 'Free'}
                  </span>
                </div>

                {item.description && (
                  <p style={{ margin: '2px 0 4px', fontSize: isEmbedded ? 10.5 : 11.5, color: subColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                    {item.description}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                    {item.tags.map((t) => (
                      <span key={t} style={{ fontSize: 9, fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#B45309', padding: '1px 5px', borderRadius: 4 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add to order / Quantity Controls */}
              {item.available === false ? (
                <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, padding: '4px 6px' }}>
                  Épuisé
                </span>
              ) : qty > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', borderRadius: 100, border: '1px solid #E2E8F0', padding: '2px 6px' }}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    style={{ background: 'none', border: 'none', width: 22, height: 22, fontWeight: 800, cursor: 'pointer', color: textColor, padding: 0 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: 'center', color: primaryColor }}>
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    style={{ background: 'none', border: 'none', width: 22, height: 22, fontWeight: 800, cursor: 'pointer', color: textColor, padding: 0 }}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, 1)}
                  style={{
                    background: primaryColor,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 100,
                    padding: isEmbedded ? '4px 8px' : '5px 10px',
                    fontSize: isEmbedded ? 10.5 : 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  }}
                >
                  + Add
                </button>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: subColor, fontSize: 12, padding: '16px 0' }}>
            No dishes found in this category.
          </p>
        )}
      </div>

      {/* Sticky Bottom Order Bar */}
      {cartItemCount > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 14,
            background: '#0F172A',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            boxShadow: '0 6px 16px rgba(15,23,42,0.2)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>
              🛒 {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} · {cartTotal} {currency}
            </p>
            <p style={{ margin: 0, fontSize: 10.5, color: '#94A3B8' }}>
              Tap to review & order on WhatsApp
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCartModal(true)}
            style={{
              background: '#22C55E',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Order Now ↗
          </button>
        </div>
      )}

      {/* Cart & WhatsApp Ordering Modal */}
      {showCartModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(5px)',
          }}
          onClick={() => setShowCartModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 22,
              maxWidth: 380,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                🛒 Review Your Order
              </p>
              <button
                type="button"
                onClick={() => setShowCartModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Item summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {Object.entries(cart).map(([id, qty]) => {
                const item = items.find((i) => i.id === id)
                if (!item) return null
                const priceNum = parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: '#F8FAFC',
                      borderRadius: 10,
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>
                        {item.price} {currency} each
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(id, -1)}
                        style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: 4, width: 22, height: 22, cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(id, 1)}
                        style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: 4, width: 22, height: 22, cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total:</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                {cartTotal} {currency}
              </span>
            </div>

            {/* Order Type Selector */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Dining / Delivery Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setOrderType('table')}
                  style={{
                    padding: '6px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: orderType === 'table' ? '2px solid #0F172A' : '1px solid #E2E8F0',
                    background: orderType === 'table' ? '#0F172A' : '#FFFFFF',
                    color: orderType === 'table' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  🍽️ Sur place
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  style={{
                    padding: '6px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: orderType === 'takeaway' ? '2px solid #0F172A' : '1px solid #E2E8F0',
                    background: orderType === 'takeaway' ? '#0F172A' : '#FFFFFF',
                    color: orderType === 'takeaway' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  🛍️ À emporter
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  style={{
                    padding: '6px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: orderType === 'delivery' ? '2px solid #0F172A' : '1px solid #E2E8F0',
                    background: orderType === 'delivery' ? '#0F172A' : '#FFFFFF',
                    color: orderType === 'delivery' ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  🛵 Livraison
                </button>
              </div>
            </div>

            {/* Table Number if Dine-in */}
            {orderType === 'table' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Numéro de Table (Table #)
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 4 or Terrasse 2"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5 }}
                />
              </div>
            )}

            {/* Delivery address if Delivery */}
            {orderType === 'delivery' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Adresse de livraison
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Résidence Al Manar, Casablanca"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5 }}
                />
              </div>
            )}

            {/* Customer Name */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Votre Nom (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Otman"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5 }}
              />
            </div>

            {/* Special Instructions */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                Remarques / Préférences
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Sans oignon, sauce algérienne..."
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5 }}
              />
            </div>

            {/* Big Send on WhatsApp button */}
            <button
              type="button"
              onClick={handleSendWhatsAppOrder}
              style={{
                width: '100%',
                background: '#22C55E',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              }}
            >
              <span>📲 Commander sur WhatsApp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
