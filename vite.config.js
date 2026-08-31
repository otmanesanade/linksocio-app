import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function apiPlugin() {
  const STORE_PATH = path.join(process.cwd(), '.inquiry_store.json')
  const LEADS_PATH = path.join(process.cwd(), '.leads_store.json')
  const BOOKING_SETTINGS_PATH = path.join(process.cwd(), '.booking_settings.json')
  const BOOKINGS_PATH = path.join(process.cwd(), '.bookings_store.json')

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

  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Global CORS headers for API routes
        if (req.url && req.url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS')
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
          const leadsStore = readJson(LEADS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()
            const userLeads = (username && leadsStore[username]) || []

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ leads: userLeads }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim()
                const lead = payload.lead || {}

                if (!username) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username' }))
                  return
                }

                const newLead = {
                  id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                  createdAt: new Date().toISOString(),
                  status: 'new',
                  ...lead,
                }

                const currentList = leadsStore[username] || []
                leadsStore[username] = [newLead, ...currentList]

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, lead: newLead }))
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
                const booking = payload.booking || {}

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const newBooking = {
                  id: booking.id || 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                  createdAt: booking.createdAt || new Date().toISOString(),
                  status: booking.status || 'confirmed',
                  ...booking,
                }

                const bookingsStore = readJson(BOOKINGS_PATH)

                function saveToKey(key) {
                  if (!key) return
                  const currentList = bookingsStore[key] || []
                  const idx = currentList.findIndex((b) => b.id === newBooking.id)
                  if (idx >= 0) {
                    currentList[idx] = { ...currentList[idx], ...newBooking }
                  } else {
                    currentList.unshift(newBooking)
                  }
                  bookingsStore[key] = currentList
                }

                if (username) saveToKey(username)
                if (userId) saveToKey(userId)

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, booking: newBooking }))
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

