// Server endpoint to record, retrieve and update booking appointments with RBAC and Supabase persistence
import { applyCors, getAuthenticatedUser, getSupabaseServerClient } from './_supabase.js'

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

  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in bookings:', clientErr)
    return sendJson(res, 500, {
      error: 'Database connection unavailable. Operation failed securely.',
    })
  }

  // 1. GET: Fetch creator's private bookings (Audit Point 2 & 4: Protected route with Supabase only)
  if (req.method === 'GET') {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, {
        error: 'Authentication required. Private booking data cannot be accessed without a valid session.',
      })
    }

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database query error in bookings GET:', error.message)
        return sendJson(res, 500, { error: 'Database error fetching bookings' })
      }

      return sendJson(res, 200, { bookings: bookings || [] })
    } catch (err) {
      console.error('Unexpected error in GET bookings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 2. POST: Create booking (Public client booking a slot on creator's page)
  if (req.method === 'POST') {
    try {
      const payload = await parseBody(req)
      const booking = payload.booking || payload
      const targetUserId = payload.userId || booking.userId

      if (!targetUserId) {
        return sendJson(res, 400, { error: 'Missing target creator userId' })
      }

      const clientName = (booking.name || booking.client_name || '').trim()
      const clientEmail = (booking.email || booking.client_email || '').trim()
      const clientPhone = (booking.phone || booking.client_phone || '').trim()
      const bookingDate = booking.date || booking.booking_date || new Date().toISOString().split('T')[0]
      const bookingTime = booking.time || booking.timeSlot || booking.booking_time || '10:00'
      const notes = booking.notes || booking.service || ''

      if (!clientName || !clientEmail) {
        return sendJson(res, 400, { error: 'Client name and email are required' })
      }

      // Verify target creator exists in profiles
      const { data: creatorProfile, error: profErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', targetUserId)
        .maybeSingle()

      if (profErr || !creatorProfile) {
        return sendJson(res, 400, { error: 'Target creator profile not found' })
      }

      const { data: newBooking, error: insertErr } = await supabase
        .from('bookings')
        .insert({
          user_id: targetUserId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'pending',
          notes,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('Database insert error in bookings POST:', insertErr.message)
        return sendJson(res, 500, { error: 'Database error creating booking' })
      }

      return sendJson(res, 200, { success: true, booking: newBooking })
    } catch (err) {
      console.error('Unexpected error in POST bookings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 3. PATCH: Update booking status (Restricted to authenticated creator)
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required' })
    }

    try {
      const payload = await parseBody(req)
      const { bookingId, status } = payload

      if (!bookingId || !status) {
        return sendJson(res, 400, { error: 'Missing bookingId or status' })
      }

      const { data: updated, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .eq('user_id', authUser.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Database update error in bookings PATCH:', error.message)
        return sendJson(res, 500, { error: 'Database error updating booking' })
      }

      if (!updated) {
        return sendJson(res, 404, { error: 'Booking not found or not owned by caller' })
      }

      return sendJson(res, 200, { success: true, booking: updated })
    } catch (err) {
      console.error('Unexpected error in PATCH bookings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
