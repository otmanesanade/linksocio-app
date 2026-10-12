// Server endpoint to record, retrieve and update booking appointments with RBAC & Supabase integration
import fs from 'fs'
import path from 'path'
import os from 'os'
import { supabaseServer, applyCors, getAuthenticatedUser } from './_supabase.js'

const PRIMARY_PATH = path.join(process.cwd(), '.bookings_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_bookings_store.json')

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

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body)
      } catch (e) {
        return {}
      }
    }
    return req.body
  }
  return new Promise((resolve) => {
    let bodyStr = ''
    req.on('data', (chunk) => {
      bodyStr += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(bodyStr || '{}'))
      } catch (e) {
        resolve({})
      }
    })
  })
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return

  const authUser = await getAuthenticatedUser(req)

  // 1. GET: FETCH CREATOR'S BOOKINGS (Audit Section 2: Protected Private Route)
  if (req.method === 'GET') {
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required to view private bookings.' })
    }

    const currentUserId = authUser.id

    // Fetch from Supabase PostgreSQL bookings table (Audit Section 3)
    try {
      const { data: dbBookings, error } = await supabaseServer
        .from('bookings')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (!error && dbBookings && dbBookings.length > 0) {
        return sendJson(res, 200, { bookings: dbBookings })
      }
    } catch (e) {}

    // Fallback store scoped strictly to current authenticated user
    const store = readBookingsStore()
    const userBookings = store[currentUserId] || store[authUser.email] || []
    return sendJson(res, 200, { bookings: Array.isArray(userBookings) ? userBookings : [] })
  }

  // 2. POST: CREATE OR SYNC BOOKING
  if (req.method === 'POST') {
    const payload = await parseBody(req)
    const singleBooking = payload.booking
    const batchBookings = payload.bookings
    const targetUserId = payload.userId || (authUser ? authUser.id : null)

    if (!singleBooking && !Array.isArray(batchBookings)) {
      return sendJson(res, 400, { error: 'Missing booking payload' })
    }

    // Insert to Supabase if target user identified
    if (targetUserId) {
      try {
        if (singleBooking) {
          await supabaseServer.from('bookings').insert({
            user_id: targetUserId,
            client_name: singleBooking.name || singleBooking.client_name || 'Guest',
            client_email: singleBooking.email || singleBooking.client_email || '',
            client_phone: singleBooking.phone || singleBooking.client_phone || '',
            booking_date: singleBooking.date || new Date().toISOString().split('T')[0],
            booking_time: singleBooking.time || singleBooking.timeSlot || '10:00',
            status: singleBooking.status || 'pending',
            notes: singleBooking.notes || singleBooking.service || '',
          })
        }
      } catch (dbErr) {
        console.warn('Supabase booking insert note:', dbErr.message)
      }
    }

    // Save to local cache
    const store = readBookingsStore()
    const key = targetUserId || (authUser ? authUser.id : 'default')
    const list = Array.isArray(store[key]) ? store[key] : []

    if (singleBooking) {
      list.unshift(singleBooking)
    } else if (Array.isArray(batchBookings)) {
      list.unshift(...batchBookings)
    }

    store[key] = list
    writeBookingsStore(store)

    return sendJson(res, 200, { success: true, count: list.length })
  }

  // 3. PATCH / PUT: UPDATE BOOKING STATUS (Requires auth)
  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required' })
    }

    const payload = await parseBody(req)
    const { bookingId, status } = payload

    if (!bookingId || !status) {
      return sendJson(res, 400, { error: 'Missing bookingId or status' })
    }

    try {
      await supabaseServer
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .eq('user_id', authUser.id)
    } catch (e) {}

    return sendJson(res, 200, { success: true, bookingId, status })
  }

  sendJson(res, 405, { error: 'Method not allowed' })
}
