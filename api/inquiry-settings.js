// Server endpoint to manage creator inquiry and WhatsApp settings with authentication and Supabase persistence
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

  const authUser = await getAuthenticatedUser(req)
  if (!authUser) {
    return sendJson(res, 401, {
      error: 'Authentication required. Private inquiry settings require an active session.',
    })
  }

  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in inquiry-settings:', clientErr)
    return sendJson(res, 500, {
      error: 'Database connection unavailable. Operation failed securely.',
    })
  }

  const currentUserId = authUser.id

  // 1. GET: Fetch creator's inquiry settings
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('inquiry_settings')
        .select('settings')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (error) {
        console.error('Failed to query inquiry_settings from Supabase:', error.message)
        return sendJson(res, 500, { error: 'Database error fetching inquiry settings' })
      }

      return sendJson(res, 200, {
        success: true,
        settings: data?.settings || null,
      })
    } catch (err) {
      console.error('Unexpected error in GET inquiry-settings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 2. POST: Upsert creator's inquiry settings
  if (req.method === 'POST') {
    try {
      const payload = await parseBody(req)
      const settings = payload.settings || {}

      const { data, error } = await supabase
        .from('inquiry_settings')
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
        console.error('Failed to save inquiry_settings to Supabase:', error.message)
        return sendJson(res, 500, { error: 'Database error saving inquiry settings' })
      }

      return sendJson(res, 200, {
        success: true,
        settings: data?.settings || settings,
      })
    } catch (err) {
      console.error('Unexpected error in POST inquiry-settings:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
