// Server endpoint to manage restaurant & cafe menus with authentication and Supabase persistence
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

  // 1. GET: Fetch restaurant menu for public or creator view
  if (req.method === 'GET') {
    const { client: supabase, error: clientErr } = getSupabaseServerClient()
    if (clientErr || !supabase) {
      console.error('Database connection error in restaurant-menu:', clientErr)
      return sendJson(res, 500, {
        error: 'Database connection unavailable. Operation failed securely.',
      })
    }

    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
    const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
    const requestedUserId = (urlObj.searchParams.get('userId') || '').trim()

    const authUser = await getAuthenticatedUser(req)
    let targetUserId = authUser ? authUser.id : requestedUserId

    try {
      if (!targetUserId && username) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle()

        if (profile) {
          targetUserId = profile.id
        }
      }

      if (!targetUserId) {
        return sendJson(res, 200, { menu: null })
      }

      const { data, error } = await supabase
        .from('restaurant_menus')
        .select('menu')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching restaurant_menus:', error.message)
        return sendJson(res, 500, { error: 'Database error fetching restaurant menu' })
      }

      return sendJson(res, 200, { menu: data?.menu || null })
    } catch (err) {
      console.error('Unexpected error in GET restaurant-menu:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 2. POST: Upsert restaurant menu (Strictly restricted to authenticated creator)
  if (req.method === 'POST') {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required to update restaurant menu' })
    }

    const { client: supabase, error: clientErr } = getSupabaseServerClient()
    if (clientErr || !supabase) {
      console.error('Database connection error in restaurant-menu:', clientErr)
      return sendJson(res, 500, {
        error: 'Database connection unavailable. Operation failed securely.',
      })
    }

    try {
      const payload = await parseBody(req)
      const menu = payload.menu || {}

      const { data, error } = await supabase
        .from('restaurant_menus')
        .upsert(
          {
            user_id: authUser.id,
            menu,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) {
        console.error('Error saving restaurant_menus:', error.message)
        return sendJson(res, 500, { error: 'Database error saving restaurant menu' })
      }

      return sendJson(res, 200, { success: true, menu: data?.menu || menu })
    } catch (err) {
      console.error('Unexpected error in POST restaurant-menu:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
