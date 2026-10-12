import Stripe from 'stripe'
import { applyCors, getAuthenticatedUser, getSupabaseServerClient } from './_supabase.js'

let stripeInstance = null
function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim()
  if (!key || key.startsWith('pk_')) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
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

const SUPPORTED_CONNECT_COUNTRIES = new Set([
  'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
  'FI', 'FR', 'GB', 'GI', 'GR', 'HR', 'HU', 'IE', 'IT', 'LI', 'LT', 'LU',
  'LV', 'MT', 'MX', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RO', 'SE', 'SG', 'SI',
  'SK', 'US',
])

export default async function handler(req, res) {
  // Audit Point 6: Strict CORS validation
  if (applyCors(req, res)) return

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const subroute = (
    req.query?.subroute ||
    urlObj.searchParams.get('subroute') ||
    urlObj.pathname.replace(/^\/api\/stripe\/?/, '')
  ).toLowerCase().trim()

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
  const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || '').trim()
  const isPublishableInsteadOfSecret = secretKey.startsWith('pk_')

  // 1. STATUS
  if (subroute === 'status' || subroute.endsWith('/status')) {
    const isConfigured = secretKey.length > 0 && !isPublishableInsteadOfSecret
    const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test'
    return sendJson(res, 200, {
      configured: isConfigured,
      mode: mode,
      hasPublishableKey: publishableKey.length > 0,
      publishableKeyMasked: publishableKey ? `${publishableKey.slice(0, 8)}...${publishableKey.slice(-4)}` : null,
      isPublishableInsteadOfSecret,
    })
  }

  // 2. CONNECT / TEST-CONNECT: Strictly disabled to prevent simulated accounts
  if (subroute.includes('test-connect')) {
    return sendJson(res, 403, {
      success: false,
      configured: false,
      error: 'Simulated connections are disabled. Real verified Stripe Connect accounts are required.',
    })
  }

  // 3. CONNECT / ONBOARD: Server-verified creator onboarding
  if (subroute.includes('onboard')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required for Stripe Connect onboarding' })
    }

    const payload = await parseBody(req)
    const { country, returnUrl, refreshUrl } = payload || {}

    if (!secretKey || isPublishableInsteadOfSecret) {
      return sendJson(res, 400, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is missing or invalid in server environment.',
      })
    }

    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, { configured: false, error: 'Unable to initialize Stripe client' })
    }

    const countryCode = (country || 'FR').toUpperCase().trim()
    const isMorocco = countryCode === 'MA' || countryCode === 'MOROCCO'

    if (isMorocco) {
      return sendJson(res, 400, {
        configured: false,
        isMoroccoNotice: true,
        error: "Stripe Connect does not support direct accounts in Morocco (MA). Use local CIH/Attijariwafa transfer or link an existing international Stripe Account ID.",
      })
    }

    if (!SUPPORTED_CONNECT_COUNTRIES.has(countryCode)) {
      return sendJson(res, 400, {
        configured: false,
        error: `Country code '${countryCode}' is not supported for direct Stripe Connect. Please select a supported region.`,
      })
    }

    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: countryCode,
        email: authUser.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { userId: authUser.id },
      })

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const finalReturnUrl = returnUrl || `${hostOrigin}/dashboard?tab=payouts&stripe_connected=true&acct=${account.id}`
      const finalRefreshUrl = refreshUrl || `${hostOrigin}/dashboard?tab=payouts`

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: finalRefreshUrl,
        return_url: finalReturnUrl,
        type: 'account_onboarding',
      })

      return sendJson(res, 200, {
        configured: true,
        accountId: account.id,
        url: accountLink.url,
        status: 'pending_verification',
      })
    } catch (err) {
      console.error('Stripe Connect error:', err)
      return sendJson(res, 400, { configured: false, error: err.message })
    }
  }

  // 4. VERIFY-SESSION
  if (subroute.includes('verify-session')) {
    const sessionId = req.query?.session_id || urlObj.searchParams.get('session_id')
    if (!sessionId) {
      return sendJson(res, 400, { error: 'Missing session_id' })
    }
    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, { configured: false, verified: false, error: 'Stripe unavailable' })
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const isPaid = session.payment_status === 'paid' || session.status === 'complete'
      return sendJson(res, 200, {
        configured: true,
        verified: isPaid,
        status: session.status,
        paymentStatus: session.payment_status,
        planId: session.metadata?.planId,
        billingCycle: session.metadata?.billingCycle,
        customerEmail: session.customer_details?.email,
      })
    } catch (err) {
      return sendJson(res, 400, { configured: true, verified: false, error: err.message })
    }
  }

  // 5. CREATE-PRODUCT-CHECKOUT: Server-Side Price & Product Integrity (Audit Point 7)
  if (subroute.includes('create-product-checkout')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, { error: 'Stripe Secret Key is missing or invalid' })
    }

    const { client: supabase, error: clientErr } = getSupabaseServerClient()
    if (clientErr || !supabase) {
      console.error('Database connection error in checkout:', clientErr)
      return sendJson(res, 500, { error: 'Database service unavailable' })
    }

    try {
      const payload = await parseBody(req)
      const { productId, buyerEmail, buyerName, successUrl, cancelUrl } = payload || {}

      if (!productId) {
        return sendJson(res, 400, { error: 'Missing required productId parameter' })
      }

      // Audit Point 7: Fetch verified product directly from database (Do NOT accept client price!)
      const { data: dbProduct, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('is_active', true)
        .single()

      if (prodErr || !dbProduct) {
        return sendJson(res, 400, {
          error: 'Product not found or inactive. Cannot process payment for unverified items.',
        })
      }

      const verifiedPrice = parseFloat(dbProduct.price)
      if (isNaN(verifiedPrice) || verifiedPrice < 0) {
        return sendJson(res, 400, { error: 'Invalid product pricing in database' })
      }

      // Calculate unit amounts in cents based on database price strictly
      const unitAmount = Math.max(100, Math.round(verifiedPrice * 100))
      const currency = (dbProduct.currency || 'eur').toLowerCase()

      // Server enforces 9% platform fee strictly
      const platformFeeAmount = Math.round(unitAmount * 0.09)
      const creatorAmount = unitAmount - platformFeeAmount
      const sellerUserId = dbProduct.user_id

      // Check if seller has a verified Stripe Connect account
      const { data: sellerPayoutSettings } = await supabase
        .from('payout_settings')
        .select('stripe_account_id, stripe_status')
        .eq('user_id', sellerUserId)
        .maybeSingle()

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const sessionPayload = {
        mode: 'payment',
        customer_email: buyerEmail && buyerEmail.includes('@') ? buyerEmail.trim() : undefined,
        client_reference_id: sellerUserId,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: dbProduct.name,
                description: `LinkSocio Digital Product (Instant Delivery)`,
                images: dbProduct.image_url ? [dbProduct.image_url] : undefined,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: 'digital_product',
          productId: dbProduct.id,
          productName: dbProduct.name,
          sellerUserId: sellerUserId,
          buyerName: buyerName || '',
          unitAmount: String(unitAmount),
          platformFeeAmount: String(platformFeeAmount),
          creatorAmount: String(creatorAmount),
          platformFeeRate: '9%',
        },
        success_url: successUrl || `${hostOrigin}/order-success?prod_id=${dbProduct.id}`,
        cancel_url: cancelUrl || `${hostOrigin}/`,
      }

      if (
        sellerPayoutSettings &&
        sellerPayoutSettings.stripe_status === 'active' &&
        sellerPayoutSettings.stripe_account_id
      ) {
        sessionPayload.payment_intent_data = {
          application_fee_amount: platformFeeAmount,
          transfer_data: { destination: sellerPayoutSettings.stripe_account_id },
        }
      }

      const session = await stripe.checkout.sessions.create(sessionPayload)

      // Audit Point 4 & 7: Insert order with status 'pending' in database
      const { error: orderInsertErr } = await supabase.from('orders').insert({
        seller_id: sellerUserId,
        product_id: dbProduct.id,
        buyer_email: buyerEmail || 'pending@customer.com',
        buyer_name: buyerName || 'Customer',
        amount: unitAmount / 100,
        currency: currency.toUpperCase(),
        platform_fee: platformFeeAmount / 100,
        creator_amount: creatorAmount / 100,
        status: 'pending',
        stripe_session_id: session.id,
      })

      if (orderInsertErr) {
        console.error('Database error recording pending order:', orderInsertErr.message)
        return sendJson(res, 500, { error: 'Database error creating order record' })
      }

      return sendJson(res, 200, { configured: true, url: session.url, sessionId: session.id })
    } catch (err) {
      console.error('Error creating product checkout:', err)
      return sendJson(res, 500, { error: err.message || 'Stripe error' })
    }
  }

  // 6. CREATE-CHECKOUT (Subscription SaaS plan)
  if (subroute.includes('create-checkout') || subroute === '') {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required to subscribe to plans' })
    }

    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, { error: 'STRIPE_SECRET_KEY is missing' })
    }

    try {
      const payload = await parseBody(req)
      const { planId, planName, billingCycle, currency = 'eur', successUrl, cancelUrl } = payload || {}
      const isYearly = billingCycle === 'yearly'

      // Server enforces fixed subscription pricing (No client manipulation)
      const validPrice = planId === 'business' ? (isYearly ? 119.88 : 11.99) : (isYearly ? 49.90 : 4.99)
      const unitAmount = Math.round(validPrice * 100)

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: authUser.email || undefined,
        client_reference_id: authUser.id,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `LinkSocio ${planName || 'Creator'} Plan`,
                description: `LinkSocio Subscription - ${isYearly ? 'Annual Billing' : 'Monthly Billing'}`,
              },
              unit_amount: unitAmount,
              recurring: { interval: isYearly ? 'year' : 'month' },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: authUser.id,
          planId: planId || 'pro',
          billingCycle: billingCycle || 'monthly',
        },
        success_url: successUrl || `${hostOrigin}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
        cancel_url: cancelUrl || `${hostOrigin}/dashboard?tab=billing`,
      })

      return sendJson(res, 200, { configured: true, url: session.url, sessionId: session.id })
    } catch (err) {
      return sendJson(res, 500, { error: err.message || 'Failed to create subscription checkout' })
    }
  }

  return sendJson(res, 404, { error: 'Unknown stripe endpoint' })
}
