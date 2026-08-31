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
  const store = readBookingsStore()

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
    const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()

    const userBookings = (username && store[username]) || []

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ bookings: userBookings }))
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
        const username = (payload.username || '').toLowerCase().trim()
        const booking = payload.booking || {}

        if (!username) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing username' }))
          return
        }

        const newBooking = {
          id: 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          createdAt: new Date().toISOString(),
          status: 'confirmed', // 'confirmed' | 'completed' | 'cancelled'
          ...booking,
        }

        const currentList = store[username] || []
        store[username] = [newBooking, ...currentList]

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
        const username = (payload.username || '').toLowerCase().trim()
        const bookingId = payload.bookingId
        const newStatus = payload.status // 'confirmed' | 'completed' | 'cancelled'

        if (!username || !bookingId) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing username or bookingId' }))
          return
        }

        const currentList = store[username] || []
        const updatedList = currentList.map((b) => {
          if (b.id === bookingId) {
            return { ...b, status: newStatus || b.status }
          }
          return b
        })
        store[username] = updatedList

        writeBookingsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, bookings: updatedList }))
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
