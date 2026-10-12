import { supabase } from '../supabaseClient'

/**
 * Enhanced fetch wrapper that automatically attaches Supabase Auth Bearer token
 * to ensure all backend requests are authenticated and authorized securely.
 */
export async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {})

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
    }
  } catch (err) {
    console.warn('Failed to attach Supabase session token:', err)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
