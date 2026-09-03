import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'

let stripeInstance = null
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !key.trim()) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(key.trim())
  }
  return stripeInstance
}

function apiPlugin() {
  const STORE_PATH = path.join(process.cwd(), '.inquiry_store.json')
  const LEADS_PATH = path.join(process.cwd(), '.leads_store.json')
  const BOOKING_SETTINGS_PATH = path.join(process.cwd(), '.booking_settings.json')
  const BOOKINGS_PATH = path.join(process.cwd(), '.bookings_store.json')
  const RESTAURANT_MENU_PATH = path.join(process.cwd(), '.restaurant_menu_store.json')
  const PRODUCTS_STORE_PATH = path.join(process.cwd(), '.products_store.json')
  const NOTIF_SETTINGS_PATH = path.join(process.cwd(), '.notification_settings.json')
  const NOTIF_LOGS_PATH = path.join(process.cwd(), '.notification_logs.json')
  const PAYOUT_SETTINGS_PATH = path.join(process.cwd(), '.payout_settings.json')
  const TRANSACTIONS_PATH = path.join(process.cwd(), '.transactions_store.json')
  const PAYOUT_REQUESTS_PATH = path.join(process.cwd(), '.payout_requests.json')

  function readJson(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '{}')
      }
    } catch (e) {}
    return {}
  }

  function writeJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {}
  }

  function appendNotifLog(username, userId, logItem) {
    try {
      const logsStore = readJson(NOTIF_LOGS_PATH)
      const primaryKey = (username || userId || 'default').toLowerCase().trim().replace(/^@/, '')
      const list = Array.isArray(logsStore[primaryKey]) ? logsStore[primaryKey] : []
      const entry = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        createdAt: new Date().toISOString(),
        ...logItem,
      }
      list.unshift(entry)
      logsStore[primaryKey] = list.slice(0, 50) // keep latest 50 logs
      if (userId && userId !== primaryKey) {
        logsStore[userId] = list.slice(0, 50)
      }
      writeJson(NOTIF_LOGS_PATH, logsStore)
    } catch (e) {}
  }

  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Global CORS headers for API routes
        if (req.url && req.url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }
        }

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

        // 1. Fetch Product
        if (urlObj.pathname === '/api/fetch-product') {
          const queryUrl = urlObj.searchParams.get('url')
          if (!queryUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url parameter' }))
            return
          }
          try {
            const response = await fetch(queryUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkSocioBot/1.0)' },
            })
            const html = await response.text()

            const titleMatch =
              html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<title[^>]*>([^<]+)<\/title>/i)

            const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)

            const priceMatch =
              html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                title: titleMatch ? titleMatch[1].trim() : null,
                image: imageMatch ? imageMatch[1].trim() : null,
                price: priceMatch ? priceMatch[1].trim() : null,
              })
            )
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to fetch product info' }))
          }
          return
        }

        // 2. Inquiry Settings API
        if (urlObj.pathname === '/api/inquiry-settings') {
          const store = readJson(STORE_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()
            const userId = urlObj.searchParams.get('userId') || ''
            const userSettings = (username && store[username]) || (userId && store[userId]) || null

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ settings: userSettings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim()
                const userId = payload.userId || ''
                const settings = payload.settings || {}

                if (username) store[username] = settings
                if (userId) store[userId] = settings

                writeJson(STORE_PATH, store)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 3. Inquiry Leads API
        if (urlObj.pathname === '/api/inquiry-leads') {
          if (req.method === 'GET') {
            const leadsStore = readJson(LEADS_PATH)
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let collected = []
            const seenIds = new Set()

            function addList(list) {
              if (Array.isArray(list)) {
                for (const item of list) {
                  if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id)
                    collected.push(item)
                  }
                }
              }
            }

            if (username) {
              addList(leadsStore[username])
              addList(leadsStore[`@${username}`])
            }
            if (userId) {
              addList(leadsStore[userId])
            }

            if (collected.length === 0 && Object.keys(leadsStore).length > 0) {
              for (const [k, v] of Object.entries(leadsStore)) {
                if (username && k.toLowerCase().includes(username)) {
                  addList(v)
                }
              }
            }

            collected.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ leads: collected }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const singleLead = payload.lead
                const batchLeads = payload.leads

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const leadsStore = readJson(LEADS_PATH)
                const primaryKey = username || userId
                const existingList = [...(leadsStore[primaryKey] || [])]

                if (userId && leadsStore[userId]) {
                  for (const item of leadsStore[userId]) {
                    if (item && item.id && !existingList.some((x) => x.id === item.id)) {
                      existingList.push(item)
                    }
                  }
                }

                const itemsToProcess = []
                if (singleLead) itemsToProcess.push(singleLead)
                if (Array.isArray(batchLeads)) {
                  for (const l of batchLeads) {
                    if (l) itemsToProcess.push(l)
                  }
                }

                for (const lead of itemsToProcess) {
                  const newLead = {
                    id: lead.id || 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    createdAt: lead.createdAt || new Date().toISOString(),
                    status: lead.status || 'new',
                    ...lead,
                  }
                  const idx = existingList.findIndex((l) => l.id === newLead.id)
                  if (idx >= 0) {
                    existingList[idx] = { ...existingList[idx], ...newLead }
                  } else {
                    existingList.unshift(newLead)
                    appendNotifLog(username, userId, {
                      type: 'inquiry',
                      title: `New Message from ${newLead.name || 'Visitor'}`,
                      details: `Contact: ${newLead.phone || 'N/A'} | Message: "${(newLead.message || '').slice(0, 70)}"`,
                      data: newLead,
                    })
                  }
                }

                existingList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

                if (username) leadsStore[username] = existingList
                if (userId) leadsStore[userId] = existingList

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, leads: existingList }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'PUT' || req.method === 'PATCH') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const leadId = payload.leadId
                const newStatus = payload.status

                if (!leadId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing leadId' }))
                  return
                }

                const leadsStore = readJson(LEADS_PATH)
                for (const [k, list] of Object.entries(leadsStore)) {
                  if (Array.isArray(list)) {
                    leadsStore[k] = list.map((l) => (l.id === leadId ? { ...l, status: newStatus || l.status } : l))
                  }
                }

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const leadId = payload.leadId

                if (!leadId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing leadId' }))
                  return
                }

                const leadsStore = readJson(LEADS_PATH)
                for (const [k, list] of Object.entries(leadsStore)) {
                  if (Array.isArray(list)) {
                    leadsStore[k] = list.filter((l) => l.id !== leadId)
                  }
                }

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 4. Booking Settings API
        if (urlObj.pathname === '/api/booking-settings') {
          const bStore = readJson(BOOKING_SETTINGS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()
            const userId = urlObj.searchParams.get('userId') || ''
            const userSettings = (username && bStore[username]) || (userId && bStore[userId]) || null

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ settings: userSettings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim()
                const userId = payload.userId || ''
                const settings = payload.settings || {}

                if (username) bStore[username] = settings
                if (userId) bStore[userId] = settings

                writeJson(BOOKING_SETTINGS_PATH, bStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 5. Bookings Management API
        if (urlObj.pathname === '/api/bookings') {
          if (req.method === 'GET') {
            const bookingsStore = readJson(BOOKINGS_PATH)
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let collected = []
            const seenIds = new Set()

            function addList(list) {
              if (Array.isArray(list)) {
                for (const item of list) {
                  if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id)
                    collected.push(item)
                  }
                }
              }
            }

            if (username) {
              addList(bookingsStore[username])
              addList(bookingsStore[`@${username}`])
            }
            if (userId) {
              addList(bookingsStore[userId])
            }

            // Fallback matching if store has entries
            if (collected.length === 0 && Object.keys(bookingsStore).length > 0) {
              for (const [k, v] of Object.entries(bookingsStore)) {
                if (username && k.toLowerCase().includes(username)) {
                  addList(v)
                }
              }
            }

            collected.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ bookings: collected }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const singleBooking = payload.booking
                const batchBookings = payload.bookings

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const bookingsStore = readJson(BOOKINGS_PATH)
                const primaryKey = username || userId
                const existingList = [...(bookingsStore[primaryKey] || [])]

                if (userId && bookingsStore[userId]) {
                  for (const item of bookingsStore[userId]) {
                    if (item && item.id && !existingList.some((x) => x.id === item.id)) {
                      existingList.push(item)
                    }
                  }
                }

                const itemsToProcess = []
                if (singleBooking) itemsToProcess.push(singleBooking)
                if (Array.isArray(batchBookings)) {
                  for (const b of batchBookings) {
                    if (b) itemsToProcess.push(b)
                  }
                }

                for (const booking of itemsToProcess) {
                  const newBooking = {
                    id: booking.id || 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    createdAt: booking.createdAt || new Date().toISOString(),
                    status: booking.status || 'confirmed',
                    ...booking,
                  }
                  const idx = existingList.findIndex((b) => b.id === newBooking.id)
                  if (idx >= 0) {
                    existingList[idx] = { ...existingList[idx], ...newBooking }
                  } else {
                    existingList.unshift(newBooking)
                    appendNotifLog(username, userId, {
                      type: 'booking',
                      title: `New Booking: ${newBooking.service_title || 'Consultation'}`,
                      details: `Client: ${newBooking.client_name || 'Anonymous'} | ${newBooking.date} at ${newBooking.time_slot}`,
                      data: newBooking,
                    })
                  }
                }

                existingList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

                if (username) bookingsStore[username] = existingList
                if (userId) bookingsStore[userId] = existingList

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, bookings: existingList }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'PUT' || req.method === 'PATCH') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const bookingId = payload.bookingId
                const newStatus = payload.status

                if (!bookingId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing bookingId' }))
                  return
                }

                const bookingsStore = readJson(BOOKINGS_PATH)

                for (const [k, list] of Object.entries(bookingsStore)) {
                  if (Array.isArray(list)) {
                    bookingsStore[k] = list.map((b) => (b.id === bookingId ? { ...b, status: newStatus || b.status } : b))
                  }
                }

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const bookingId = payload.bookingId

                if (!bookingId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing bookingId' }))
                  return
                }

                const bookingsStore = readJson(BOOKINGS_PATH)

                for (const [k, list] of Object.entries(bookingsStore)) {
                  if (Array.isArray(list)) {
                    bookingsStore[k] = list.filter((b) => b.id !== bookingId)
                  }
                }

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 6. Restaurant Menu API
        if (urlObj.pathname === '/api/restaurant-menu') {
          const menuStore = readJson(RESTAURANT_MENU_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let menuData = (username && menuStore[username]) || (userId && menuStore[userId]) || null

            if (!menuData && Object.keys(menuStore).length > 0) {
              for (const [k, v] of Object.entries(menuStore)) {
                if (username && k.toLowerCase().replace(/^@/, '') === username) {
                  menuData = v
                  break
                }
              }
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ menu: menuData }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const menu = payload.menu || {}

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                if (username) menuStore[username] = menu
                if (userId) menuStore[userId] = menu

                writeJson(RESTAURANT_MENU_PATH, menuStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, menu }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 6.5. Products & Digital Store API
        if (urlObj.pathname === '/api/products') {
          const productsStore = readJson(PRODUCTS_STORE_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let productsList = (username && productsStore[username]) || (userId && productsStore[userId]) || []
            if (!Array.isArray(productsList)) productsList = []

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ products: productsList }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const product = payload.product
                const productsList = payload.products

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const key = username || userId
                let current = Array.isArray(productsStore[key]) ? [...productsStore[key]] : []

                if (Array.isArray(productsList)) {
                  current = productsList
                } else if (product) {
                  const newProd = {
                    id: product.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    createdAt: product.createdAt || new Date().toISOString(),
                    ...product,
                  }
                  const idx = current.findIndex((p) => p.id === newProd.id)
                  if (idx >= 0) {
                    current[idx] = { ...current[idx], ...newProd }
                  } else {
                    current.push(newProd)
                  }
                }

                if (username) productsStore[username] = current
                if (userId) productsStore[userId] = current

                writeJson(PRODUCTS_STORE_PATH, productsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, products: current }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const productId = payload.productId

                if (!productId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing productId' }))
                  return
                }

                for (const [k, list] of Object.entries(productsStore)) {
                  if (Array.isArray(list)) {
                    productsStore[k] = list.filter((p) => p.id !== productId)
                  }
                }

                writeJson(PRODUCTS_STORE_PATH, productsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 7. Notification Settings API
        if (urlObj.pathname === '/api/notification-settings') {
          const nStore = readJson(NOTIF_SETTINGS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = urlObj.searchParams.get('userId') || ''
            const userSettings = (username && nStore[username]) || (userId && nStore[userId]) || null

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ settings: userSettings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = payload.userId || ''
                const settings = payload.settings || {}

                if (username) nStore[username] = settings
                if (userId) nStore[userId] = settings

                writeJson(NOTIF_SETTINGS_PATH, nStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 8. Notification Logs API
        if (urlObj.pathname === '/api/notification-logs') {
          const logsStore = readJson(NOTIF_LOGS_PATH)
          const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
          const userId = (urlObj.searchParams.get('userId') || '').trim()

          const userLogs = (username && logsStore[username]) || (userId && logsStore[userId]) || []

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ logs: Array.isArray(userLogs) ? userLogs : [] }))
          return
        }

        // 9. Send Alert / Trigger Notification API
        if (urlObj.pathname === '/api/send-alert') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const type = payload.type || 'alert'
                const data = payload.data || {}

                const logTitle =
                  type === 'booking'
                    ? `Booking Alert: ${data.service_title || 'Consultation'}`
                    : type === 'inquiry'
                    ? `Inquiry Message from ${data.name || 'Visitor'}`
                    : data.title || 'System Notification'

                const logDetails =
                  type === 'booking'
                    ? `Client: ${data.client_name || 'N/A'} | ${data.date || ''} ${data.time_slot || ''}`
                    : type === 'inquiry'
                    ? `Contact: ${data.phone || 'N/A'} | "${(data.message || '').slice(0, 60)}"`
                    : data.message || `Dispatched to ${data.recipient || 'recipient'}`

                appendNotifLog(username, userId, {
                  type,
                  title: logTitle,
                  details: logDetails,
                  data,
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    success: true,
                    message: 'Alert logged and notification dispatched successfully',
                    type,
                    timestamp: new Date().toISOString(),
                  })
                )
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
              }
            })
            return
          }
        }

        // 10. Payout & Wallet Settings API (Stripe Connect & Moroccan Banks)
        if (urlObj.pathname === '/api/payouts/settings') {
          const pSettingsStore = readJson(PAYOUT_SETTINGS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            const settings = (username && pSettingsStore[username]) || (userId && pSettingsStore[userId]) || {
              stripeAccountId: '',
              stripeConnected: false,
              payoutMethod: 'stripe', // 'stripe' | 'paypal' | 'wise' | 'payoneer' | 'bank_iban' | 'crypto_usdt' | 'local_morocco'
              selectedCurrency: 'USD',
              currencySymbol: '$',
              accountHolder: '',
              paypalEmail: '',
              payoneerEmail: '',
              bankName: '',
              bankCountry: 'United States',
              iban: '',
              swiftBic: '',
              cryptoAddress: '',
              cryptoNetwork: 'USDT-TRC20',
              moroccoRib: '',
              moroccoBankName: 'CIH Bank',
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, settings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const settings = payload.settings || {}

                if (username) pSettingsStore[username] = settings
                if (userId) pSettingsStore[userId] = settings

                writeJson(PAYOUT_SETTINGS_PATH, pSettingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 11. Payouts Stats & Transactions Ledger API (9% Platform Fee + 91% Seller Net)
        if (urlObj.pathname === '/api/payouts/stats') {
          const txStore = readJson(TRANSACTIONS_PATH)
          const reqStore = readJson(PAYOUT_REQUESTS_PATH)
          const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
          const userId = (urlObj.searchParams.get('userId') || '').trim()

          const userTransactions = (username && txStore[username]) || (userId && txStore[userId]) || []
          const userPayoutRequests = (username && reqStore[username]) || (userId && reqStore[userId]) || []

          // Compute Totals
          let grossSales = 0
          let platformFees = 0
          let netSellerEarnings = 0
          let totalWithdrawn = 0

          for (const tx of userTransactions) {
            const gross = Number(tx.grossAmount) || 0
            const fee = Number(tx.platformFee) || Math.round(gross * 0.09 * 100) / 100
            const net = Number(tx.sellerNet) || Math.round((gross - fee) * 100) / 100
            grossSales += gross
            platformFees += fee
            netSellerEarnings += net
          }

          for (const pr of userPayoutRequests) {
            if (pr.status === 'completed' || pr.status === 'paid') {
              totalWithdrawn += Number(pr.amount) || 0
            }
          }

          const availableBalance = Math.max(0, Math.round((netSellerEarnings - totalWithdrawn) * 100) / 100)

          // Platform wide stats across all users
          let platformAllGross = 0
          let platformAllFees = 0
          let platformAllTransactions = 0
          for (const list of Object.values(txStore)) {
            if (Array.isArray(list)) {
              for (const tx of list) {
                platformAllTransactions++
                const g = Number(tx.grossAmount) || 0
                const f = Number(tx.platformFee) || Math.round(g * 0.09 * 100) / 100
                platformAllGross += g
                platformAllFees += f
              }
            }
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              success: true,
              stats: {
                grossSales: Math.round(grossSales * 100) / 100,
                platformFees: Math.round(platformFees * 100) / 100, // 9%
                netSellerEarnings: Math.round(netSellerEarnings * 100) / 100, // 91%
                totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
                availableBalance,
                feePercentage: 9,
                sellerPercentage: 91,
                currency: 'DH',
              },
              transactions: Array.isArray(userTransactions) ? userTransactions : [],
              payoutRequests: Array.isArray(userPayoutRequests) ? userPayoutRequests : [],
              platformOverview: {
                totalGross: Math.round(platformAllGross * 100) / 100,
                totalFees9Percent: Math.round(platformAllFees * 100) / 100,
                totalTransactions: platformAllTransactions,
              },
            })
          )
          return
        }

        // 12. Create Order & Process 9% Fee + 91% Seller Allocation API
        if (urlObj.pathname === '/api/payouts/order') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const product = payload.product || {}
                const buyer = payload.buyer || {}
                const paymentMethod = payload.paymentMethod || 'card_stripe' // 'card_stripe' | 'bank_cih' | 'whatsapp' | 'free'

                // Parse Price numeric
                const rawPrice = String(product.price || '0').replace(/[^\d.]/g, '')
                const grossAmount = Math.max(0, parseFloat(rawPrice) || 0)

                // 9% Platform fee calculation & 91% Seller net
                const platformFee = Math.round(grossAmount * 0.09 * 100) / 100
                const sellerNet = Math.round((grossAmount - platformFee) * 100) / 100

                const txStore = readJson(TRANSACTIONS_PATH)
                const userKey = username || userId || 'default'
                const userList = Array.isArray(txStore[userKey]) ? txStore[userKey] : []

                const newTransaction = {
                  id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                  productId: product.id || 'prod_unknown',
                  productName: product.name || 'Digital Product',
                  category: product.category || 'digital',
                  grossAmount,
                  platformFee,
                  sellerNet,
                  feePercentage: 9,
                  sellerPercentage: 91,
                  currency: product.currency || 'DH',
                  buyerName: buyer.name || 'Customer',
                  buyerEmail: buyer.email || '',
                  buyerPhone: buyer.phone || '',
                  paymentMethod,
                  status: paymentMethod === 'whatsapp' ? 'pending_settlement' : 'completed',
                  createdAt: new Date().toISOString(),
                  downloadUrl: product.file_url || product.external_url || '',
                }

                userList.unshift(newTransaction)
                txStore[userKey] = userList
                if (username && userKey !== username) txStore[username] = userList
                if (userId && userKey !== userId) txStore[userId] = userList

                writeJson(TRANSACTIONS_PATH, txStore)

                // Trigger Notification to Seller
                appendNotifLog(username, userId, {
                  type: 'order',
                  title: `🛍️ New Sale: ${product.name} (+${sellerNet} DH)`,
                  details: `Gross: ${grossAmount} DH | Net (91%): ${sellerNet} DH | Fee (9%): ${platformFee} DH | Buyer: ${buyer.name || 'Online Customer'}`,
                  data: newTransaction,
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    success: true,
                    transaction: newTransaction,
                    breakdown: {
                      grossAmount,
                      platformFee9Percent: platformFee,
                      sellerNet91Percent: sellerNet,
                    },
                  })
                )
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid order payload' }))
              }
            })
            return
          }
        }

        // 13. Request Payout (Moroccan Bank, CIH, CashPlus, Stripe)
        if (urlObj.pathname === '/api/payouts/request') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const amount = parseFloat(payload.amount) || 0
                const method = payload.method || 'bank'
                const details = payload.details || {}

                if (amount <= 0) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payout amount' }))
                  return
                }

                const reqStore = readJson(PAYOUT_REQUESTS_PATH)
                const userKey = username || userId || 'default'
                const userList = Array.isArray(reqStore[userKey]) ? reqStore[userKey] : []

                const payoutItem = {
                  id: 'payout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                  amount: Math.round(amount * 100) / 100,
                  currency: 'DH',
                  method, // 'bank_cih' | 'stripe' | 'paypal' | 'cashplus'
                  details,
                  status: 'processing', // 'requested' | 'processing' | 'completed'
                  createdAt: new Date().toISOString(),
                }

                userList.unshift(payoutItem)
                reqStore[userKey] = userList
                if (username && userKey !== username) reqStore[username] = userList
                if (userId && userKey !== userId) reqStore[userId] = userList

                writeJson(PAYOUT_REQUESTS_PATH, reqStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, payout: payoutItem }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
              }
            })
            return
          }
        }

        // 14. Admin Approve Payout
        if (urlObj.pathname === '/api/payouts/admin/approve') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const payoutId = payload.payoutId
                const reqStore = readJson(PAYOUT_REQUESTS_PATH)

                let found = false
                for (const [k, list] of Object.entries(reqStore)) {
                  if (Array.isArray(list)) {
                    for (const pr of list) {
                      if (pr.id === payoutId) {
                        pr.status = 'completed'
                        pr.completedAt = new Date().toISOString()
                        found = true
                      }
                    }
                  }
                }

                if (found) {
                  writeJson(PAYOUT_REQUESTS_PATH, reqStore)
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, found }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
              }
            })
            return
          }
        }

        // 15. Stripe Status Endpoint
        if (urlObj.pathname === '/api/stripe/status') {
          const secretKey = process.env.STRIPE_SECRET_KEY || ''
          const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || ''
          const isConfigured = secretKey.trim().length > 0
          const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test'

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              configured: isConfigured,
              mode: mode,
              hasPublishableKey: publishableKey.trim().length > 0,
              publishableKeyMasked: publishableKey
                ? `${publishableKey.slice(0, 8)}...${publishableKey.slice(-4)}`
                : null,
            })
          )
          return
        }

        // 16. Stripe Create Subscription Checkout Session
        if (urlObj.pathname === '/api/stripe/create-checkout') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const {
                  planId,
                  planName,
                  billingCycle,
                  price,
                  currency = 'eur',
                  userId,
                  username,
                  customerEmail,
                  successUrl,
                  cancelUrl,
                } = payload

                const stripe = getStripe()
                if (!stripe) {
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      configured: false,
                      error: 'STRIPE_SECRET_KEY is not configured yet in environment settings.',
                    })
                  )
                  return
                }

                const isYearly = billingCycle === 'yearly'
                const unitAmount = Math.round(Number(price) * 100)
                const validEmail =
                  customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')
                    ? customerEmail.trim()
                    : undefined

                const session = await stripe.checkout.sessions.create({
                  mode: 'subscription',
                  customer_email: validEmail,
                  client_reference_id: userId || undefined,
                  line_items: [
                    {
                      price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                          name: `LinkSocio ${planName || 'Creator'}`,
                          description: `LinkSocio Subscription - ${isYearly ? 'Annual Billing' : 'Monthly Billing'}`,
                          tax_code: 'txcd_10000000',
                        },
                        unit_amount: unitAmount,
                        recurring: {
                          interval: isYearly ? 'year' : 'month',
                        },
                      },
                      quantity: 1,
                    },
                  ],
                  metadata: {
                    userId: userId || '',
                    username: username || '',
                    planId: planId || '',
                    billingCycle: billingCycle || 'monthly',
                  },
                  success_url:
                    successUrl ||
                    `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
                  cancel_url:
                    cancelUrl ||
                    `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}/dashboard?tab=billing`,
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ configured: true, url: session.url, sessionId: session.id }))
              } catch (err) {
                console.error('Stripe checkout error:', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message || 'Failed to create Stripe checkout session' }))
              }
            })
            return
          }
        }

        // 17. Stripe Verify Session
        if (urlObj.pathname === '/api/stripe/verify-session') {
          const sessionId = urlObj.searchParams.get('session_id')
          if (!sessionId) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing session_id' }))
            return
          }

          const stripe = getStripe()
          if (!stripe) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ configured: false, verified: false }))
            return
          }

          try {
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            const isPaid = session.payment_status === 'paid' || session.status === 'complete'

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                configured: true,
                verified: isPaid,
                planId: session.metadata?.planId,
                billingCycle: session.metadata?.billingCycle,
                customerEmail: session.customer_details?.email,
                amountTotal: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency,
                subscriptionId: session.subscription,
              })
            )
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message || 'Failed to retrieve Stripe session' }))
          }
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})

