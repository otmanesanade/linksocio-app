import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nknauhsucrnrhmtldick.supabase.co'

/**
 * Audit Point 1: Secure Server-Side Supabase Client (Fail-Closed).
 * Absolutely NO fallback to VITE_SUPABASE_ANON_KEY or public keys for service-role operations.
 * If SUPABASE_SERVICE_ROLE_KEY is missing, privileged operations must fail securely.
 */
let _supabaseServerInstance = null
let _mockSupabaseClient = null

export function __setMockSupabaseClient(client) {
  _mockSupabaseClient = client
}

export function getSupabaseServerClient() {
  if (_mockSupabaseClient !== null) {
    return { client: _mockSupabaseClient, error: null }
  }

  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!serviceKey) {
    return {
      client: null,
      error: 'CRITICAL_SECURITY_CONFIGURATION: SUPABASE_SERVICE_ROLE_KEY is missing. Backend operations fail closed.',
    }
  }

  if (!_supabaseServerInstance) {
    _supabaseServerInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return { client: _supabaseServerInstance, error: null }
}

/**
 * Dedicated auth verification client for checking Bearer JWTs.
 * Uses service key if available, or anon key strictly for verifying user tokens.
 */
const authKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const authClient = authKey
  ? createClient(supabaseUrl, authKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

let _mockAuthUser = null

export function __setMockAuthUser(user) {
  _mockAuthUser = user
}

/**
 * Extracts and verifies the Supabase Auth session token from Authorization header.
 * Rejects forged or missing credentials.
 */
export async function getAuthenticatedUser(req) {
  if (_mockAuthUser !== null) {
    return _mockAuthUser
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return null
  }

  if (!authClient) {
    console.error('Cannot verify auth: Supabase client not initialized')
    return null
  }

  try {
    const { data: { user }, error } = await authClient.auth.getUser(token)
    if (error || !user) {
      return null
    }
    return user
  } catch (err) {
    console.error('Error during token verification:', err.message)
    return null
  }
}

/**
 * Audit Point 6: Strict CORS Guard.
 * Explicitly rejects unallowed origins and verifies whitelisted domains.
 */
const ALLOWED_ORIGINS = new Set([
  'https://linksocio.com',
  'https://www.linksocio.com',
  'https://linksocio-app.vercel.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : []),
])

export function applyCors(req, res) {
  const origin = req.headers?.origin || ''
  const isDev = process.env.NODE_ENV !== 'production'
  const isLocalhost =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('.aistudio.') ||
    origin.includes('.run.app')
  const isAllowed = ALLOWED_ORIGINS.has(origin) || (isDev && isLocalhost)

  // 1. Explicitly reject unauthorized cross-origin requests
  if (origin && !isAllowed) {
    res.statusCode = 403
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'CORS policy: Request origin is not allowed' }))
    return true
  }

  // 2. Set strict headers for authorized origins
  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  return false
}

/**
 * Audit Point 7: Server-side Product Verification.
 * Fetches verified price, currency, and seller from Supabase database.
 */
export async function getVerifiedProduct(productId) {
  if (!productId) return null
  const { client, error } = getSupabaseServerClient()
  if (error || !client) {
    console.error('getVerifiedProduct failed:', error)
    return null
  }

  try {
    const { data, error: dbError } = await client
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single()

    if (dbError || !data) {
      return null
    }
    return data
  } catch (e) {
    return null
  }
}
