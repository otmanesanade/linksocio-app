// Server endpoint to record, retrieve and update booking appointments across devices
import fs from 'fs'
import path from 'path'
import os from 'os'

// Multiple fallback paths for serverless and container environments
const PRIMARY_PATH = path.join(process.cwd(), '.bookings_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_bookings_store.json')

// In-memory persistent cache
if (!global.__linksocio_bookings_cache) {
  global.__linksocio_bookings_cache = {}
}

function readBookingsStore() {
  let store = global.__linksocio_bookings_cache || {}
  try {
    if (fs.existsSync(PRIMARY_PATH)) {
      const data = fs.readFileSync(PRIMARY_PATH, 'utf-8')
      const parsed = JSON.parse(data || '{}')
      store = { ...store, ...parsed }
    }
  } catch (e) {}

  try {
    if (fs.existsSync(TMP_PATH)) {
      const data = fs.readFileSync(TMP_PATH, 'utf-8')
      const parsed = JSON.parse(data || '{}')
      store = { ...store, ...parsed }
    }
  } catch (e) {}

  global.__linksocio_bookings_cache = store
  return store
}

function writeBookingsStore(store) {
  global.__linksocio_bookings_cache = store
  const data = JSON.stringify(store, null, 2)
  try {
    fs.writeFileSync(PRIMARY_PATH, data, 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(TMP_PATH, data, 'utf-8')
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
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

    // Fallback search across store if exact key was slightly formatted differently
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
        const singleBooking = payload.booking
        const batchBookings = payload.bookings // array of bookings to sync in batch

        if (!username && !userId) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing username or userId' }))
          return
        }

        const store = readBookingsStore()
        const primaryKey = username || userId

        const existingList = [...(store[primaryKey] || [])]
        if (userId && store[userId]) {
          for (const item of store[userId]) {
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
          }
        }

        existingList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

        if (username) store[username] = existingList
        if (userId) store[userId] = existingList

        writeBookingsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, bookings: existingList }))
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
        const bookingId = payload.bookingId
        const newStatus = payload.status

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

  if (req.method === 'DELETE') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
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

        const store = readBookingsStore()

        for (const [k, list] of Object.entries(store)) {
          if (Array.isArray(list)) {
            store[k] = list.filter((b) => b.id !== bookingId)
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
