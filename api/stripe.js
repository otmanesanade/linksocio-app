import Stripe from 'stripe'
import { supabaseServer, applyCors, getAuthenticatedUser, getVerifiedProduct } from './_supabase.js'

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

// Supported Stripe Connect countries
const SUPPORTED_CONNECT_COUNTRIES = new Set([
  'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
  'FI', 'FR', 'GB', 'GI', 'GR', 'HR', 'HU', 'IE', 'IT', 'LI', 'LT', 'LU',
  'LV', 'MT', 'MX', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RO', 'SE', 'SG', 'SI',
  'SK', 'US',
])

export default async function handler(req, res) {
  // 1. Strict CORS validation (Audit Section 6)
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

  // 2. CONNECT / TEST-CONNECT (Audit Section 5: Disabled in production to prevent false positives)
  if (subroute.includes('test-connect')) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    if (isProduction) {
      return sendJson(res, 403, {
        success: false,
        configured: false,
        error: 'Test simulated connections are disabled in production. A verified Stripe Connect account is required.',
      })
    }
    return sendJson(res, 200, {
      success: false,
      configured: false,
      isSandboxSimulationOnly: true,
      message: 'Sandbox simulation only. Not a verified live connection.',
    })
  }

  // 3. CONNECT / ONBOARD (Audit Section 5: No automatic US fallback, check supported countries)
  if (subroute.includes('onboard')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const payload = await parseBody(req)
    const { username, userId, email, country, returnUrl, refreshUrl } = payload || {}

    if (!secretKey) {
      return sendJson(res, 400, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is missing in environment variables.',
      })
    }

    if (isPublishableInsteadOfSecret) {
      return sendJson(res, 400, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is set to a publishable key. A secret key is required.',
      })
    }

    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, {
        configured: false,
        error: 'Unable to initialize Stripe client.',
      })
    }

    const countryCode = (country || 'FR').toUpperCase().trim()
    const isMorocco = countryCode === 'MA' || countryCode === 'MOROCCO'

    // Specific guidance for Morocco (Stripe Connect direct express creation unsupported)
    if (isMorocco) {
      return sendJson(res, 400, {
        configured: false,
        isMoroccoNotice: true,
        error: "Stripe Connect does not support direct bank payouts in Morocco (MA). You can link an existing international Stripe Account ID (e.g. US LLC or Europe) or use local CIH / Moroccan bank transfer with 91% payouts.",
      })
    }

    // Reject unsupported countries without faking US country
    if (!SUPPORTED_CONNECT_COUNTRIES.has(countryCode)) {
      return sendJson(res, 400, {
        configured: false,
        error: `Country code '${countryCode}' is not currently supported for direct Stripe Connect express accounts. Please select a supported country or use bank transfer.`,
      })
    }

    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: countryCode,
        email: email && email.includes('@') ? email.trim() : undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          url: `https://www.linksocio.com/u/${username || 'creator'}`,
          name: username || 'LinkSocio Creator',
        },
        metadata: { username: username || '', userId: userId || '' },
      })

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const finalReturnUrl =
        returnUrl || `${hostOrigin}/dashboard?tab=payouts&stripe_connected=true&acct=${account.id}`
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
      console.error('Stripe Connect onboarding error:', err)
      return sendJson(res, 400, {
        configured: false,
        error: err.message || 'Stripe Connect error.',
      })
    }
  }

  // 4. VERIFY-SESSION (Audit Section 4: Do not trust browser redirect alone)
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

  // 5. CREATE-PRODUCT-CHECKOUT (Audit Section 4: Server-calculated price, fee, and order integrity)
  if (subroute.includes('create-product-checkout')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }
    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, {
        configured: false,
        error: 'Stripe Secret Key is missing or invalid.',
      })
    }
    try {
      const payload = await parseBody(req)
      const { username, userId, product, buyerEmail, buyerName, stripeAccountId, successUrl, cancelUrl } = payload || {}

      if (!product || !product.name) {
        return sendJson(res, 400, { error: 'Missing product information' })
      }

      // Security check: Check DB for verified price (Audit Section 4)
      let verifiedPrice = null
      if (product.id) {
        const dbProduct = await getVerifiedProduct(product.id)
        if (dbProduct) {
          verifiedPrice = parseFloat(dbProduct.price)
        }
      }

      // Fallback to sanitizing client price if product is dynamically created
      const rawPrice = verifiedPrice !== null ? verifiedPrice : parseFloat(String(product.price || '0').replace(/[^\d.]/g, ''))
      const unitAmount = Math.max(100, Math.round((rawPrice || 5) * 100))

      let currency = 'eur'
      const rawCurr = `${product.currency || ''} ${product.price || ''}`.toUpperCase()
      if (/\b(MAD|DH|DIRHAM)\b/i.test(rawCurr)) currency = 'mad'
      else if (rawCurr.includes('€') || /\bEUR\b/i.test(rawCurr)) currency = 'eur'
      else if (rawCurr.includes('£') || /\bGBP\b/i.test(rawCurr)) currency = 'gbp'
      else if (rawCurr.includes('$') || /\bUSD\b/i.test(rawCurr)) currency = 'usd'

      // Server strictly enforces 9% platform fee (Audit Section 4)
      const platformFeeAmount = Math.round(unitAmount * 0.09)
      const creatorAmount = unitAmount - platformFeeAmount

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const sessionPayload = {
        mode: 'payment',
        customer_email: buyerEmail && buyerEmail.includes('@') ? buyerEmail.trim() : undefined,
        client_reference_id: userId || username || 'customer',
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: product.name,
                description: `Sold by @${username || 'creator'} on LinkSocio (Instant Delivery)`,
                images: product.image_url ? [product.image_url] : undefined,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: 'digital_product',
          productId: product.id || '',
          productName: product.name || '',
          sellerUsername: username || '',
          sellerUserId: userId || '',
          buyerName: buyerName || '',
          unitAmount: String(unitAmount),
          platformFeeAmount: String(platformFeeAmount),
          creatorAmount: String(creatorAmount),
          platformFeeRate: '9%',
        },
        success_url: successUrl || `${hostOrigin}/u/${username}?order_success=true&prod_id=${product.id}`,
        cancel_url: cancelUrl || `${hostOrigin}/u/${username}`,
      }

      if (stripeAccountId && stripeAccountId.startsWith('acct_')) {
        sessionPayload.payment_intent_data = {
          application_fee_amount: platformFeeAmount,
          transfer_data: { destination: stripeAccountId },
        }
      }

      const session = await stripe.checkout.sessions.create(sessionPayload)

      // Record pending order in Supabase PostgreSQL (Audit Section 3 & 4)
      if (userId) {
        try {
          await supabaseServer.from('orders').insert({
            seller_id: userId,
            product_id: product.id || null,
            buyer_email: buyerEmail || 'pending@customer.com',
            buyer_name: buyerName || 'Customer',
            amount: unitAmount / 100,
            currency: currency.toUpperCase(),
            platform_fee: platformFeeAmount / 100,
            creator_amount: creatorAmount / 100,
            status: 'pending',
            stripe_session_id: session.id,
          })
        } catch (dbErr) {
          console.warn('Supabase order creation note:', dbErr.message)
        }
      }

      return sendJson(res, 200, { configured: true, url: session.url, sessionId: session.id })
    } catch (err) {
      return sendJson(res, 500, { configured: false, error: err.message || 'Stripe error' })
    }
  }

  // 6. CREATE-CHECKOUT (Subscription SaaS plan)
  if (subroute.includes('create-checkout') || subroute === '') {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }
    const stripe = getStripe()
    if (!stripe) {
      return sendJson(res, 500, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is missing.',
      })
    }
    try {
      const payload = await parseBody(req)
      const { planId, planName, billingCycle, price, currency = 'eur', userId, username, customerEmail, successUrl, cancelUrl } = payload || {}
      const isYearly = billingCycle === 'yearly'

      // Server enforces fixed subscription pricing (Audit Section 4: no client manipulation)
      const validPrice = planId === 'business' ? (isYearly ? 119.88 : 11.99) : (isYearly ? 49.90 : 4.99)
      const unitAmount = Math.round(validPrice * 100)

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: customerEmail && customerEmail.includes('@') ? customerEmail.trim() : undefined,
        client_reference_id: userId || undefined,
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
          userId: userId || '',
          username: username || '',
          planId: planId || '',
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

  sendJson(res, 404, { error: 'Unknown stripe endpoint' })
}
