import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nknauhsucrnrhmtldick.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hd83zLKF-81g4pj-hKMK3w_MOcEX4fD'

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Allowed origins for CORS protection (Audit Section 6)
const ALLOWED_ORIGINS = [
  'https://linksocio.com',
  'https://www.linksocio.com',
  'https://linksocio-app.vercel.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
]

/**
 * Validates and applies CORS headers based on verified origin whitelist.
 */
export function applyCors(req, res) {
  const origin = req.headers?.origin || ''
  const isDev = process.env.NODE_ENV !== 'production'
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.aistudio.') || origin.includes('.run.app')
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || (isDev && isLocalhost)

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else {
    // Fallback safe origin for known Linksocio domains
    res.setHeader('Access-Control-Allow-Origin', 'https://www.linksocio.com')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return true
  }
  return false
}

/**
 * Extracts and verifies the Supabase Auth session token from the Authorization header.
 * Rejects forged or unverified client IDs.
 * (Audit Section 2: P0 API Security & Access Control)
 */
export async function getAuthenticatedUser(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return null
  }

  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token)
    if (error || !user) {
      return null
    }
    return user
  } catch (err) {
    console.error('Failed to authenticate token:', err)
    return null
  }
}

/**
 * Validates product details from server/DB to prevent client-side price tampering.
 * (Audit Section 4: P0 Order & Price Integrity)
 */
export async function getVerifiedProduct(productId) {
  if (!productId) return null
  try {
    const { data, error } = await supabaseServer
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }
    return data
  } catch (e) {
    return null
  }
}
