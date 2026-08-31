// Server endpoint to record, retrieve and update booking appointments across devices
import fs from 'fs'
import path from 'path'

const BOOKINGS_PATH = path.join(process.cwd(), '.bookings_store.json')

function readBookingsStore() {
  try {
    if (fs.existsSync(BOOKINGS_PATH)) {
      const data = fs.readFileSync(BOOKINGS_PATH, 'utf-8')
      return JSON.parse(data || '{}')
    }
  } catch (e) {}
  return {}
}

function writeBookingsStore(store) {
  try {
    fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method === 'GET') {
    const store = readBookingsStore()
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
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
      addList(store[username])
      addList(store[`@${username}`])
    }
    if (userId) {
      addList(store[userId])
    }

    // If store only has a few records and user query had slight mismatch, collect all relevant
    if (collected.length === 0 && Object.keys(store).length > 0) {
      for (const [k, v] of Object.entries(store)) {
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
    req.on('data', (chunk) => {
      body += chunk
    })
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
          status: booking.status || 'confirmed', // 'confirmed' | 'completed' | 'cancelled'
          ...booking,
        }

        const store = readBookingsStore()

        function saveToKey(key) {
          if (!key) return
          const currentList = store[key] || []
          // Check if already exists by id
          const idx = currentList.findIndex((b) => b.id === newBooking.id)
          if (idx >= 0) {
            currentList[idx] = { ...currentList[idx], ...newBooking }
          } else {
            currentList.unshift(newBooking)
          }
          store[key] = currentList
        }

        if (username) saveToKey(username)
        if (userId) saveToKey(userId)

        writeBookingsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, booking: newBooking }))
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
        const userId = (payload.userId || '').trim()
        const bookingId = payload.bookingId
        const newStatus = payload.status // 'confirmed' | 'completed' | 'cancelled'

        if (!bookingId) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing bookingId' }))
          return
        }

        const store = readBookingsStore()

        for (const [k, list] of Object.entries(store)) {
          if (Array.isArray(list)) {
            store[k] = list.map((b) => (b.id === bookingId ? { ...b, status: newStatus || b.status } : b))
          }
        }

        writeBookingsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  res.statusCode = 405
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
