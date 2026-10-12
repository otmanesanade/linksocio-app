// Server endpoint to manage creator booking settings with server-side authentication and Supabase persistence
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
  // Audit Point 6: Strict CORS verification
  if (applyCors(req, res)) return

  // Audit Point 3: Authenticate all private operations including GET
  const authUser = await getAuthenticatedUser(req)
  if (!authUser) {
    return sendJson(res, 401, {
      error: 'Authentication required. Private booking settings can only be accessed with a verified session.',
    })
  }

  // Audit Point 4: Supabase Database persistence (No JSON fallback)
  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in booking-settings:', clientErr)
    return sendJson(res, 500, {
      error: 'Database connection unavailable. Operation failed securely.',
    })
  }

  // Audit Point 3: Use exclusively authUser.id - ignore any client-sent userId/username
  const currentUserId = authUser.id

  // 1. GET: Fetch creator's own booking settings
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('booking_settings')
        .select('settings')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (error) {
        console.error('Failed to query booking_settings from Supabase:', error.message)
        return sendJson(res, 500, { error: 'Database error fetching booking settings.' })
      }

      return sendJson(res, 200, {
        success: true,
        settings: data?.settings || null,
      })
    } catch (err) {
      console.error('Unexpected error in GET booking-settings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 2. POST: Upsert creator's own booking settings
  if (req.method === 'POST') {
    try {
      const payload = await parseBody(req)
      const settings = payload.settings || {}

      const { data, error } = await supabase
        .from('booking_settings')
        .upsert(
          {
            user_id: currentUserId,
            settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) {
        console.error('Failed to save booking_settings to Supabase:', error.message)
        return sendJson(res, 500, { error: 'Database error saving booking settings.' })
      }

      return sendJson(res, 200, {
        success: true,
        settings: data?.settings || settings,
      })
    } catch (err) {
      console.error('Unexpected error in POST booking-settings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
