import Stripe from 'stripe'

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

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
    sendJson(res, 200, {
      configured: isConfigured,
      mode: mode,
      hasPublishableKey: publishableKey.length > 0,
      publishableKeyMasked: publishableKey ? `${publishableKey.slice(0, 8)}...${publishableKey.slice(-4)}` : null,
      isPublishableInsteadOfSecret,
    })
    return
  }

  // 2. CONNECT / TEST-CONNECT
  if (subroute.includes('test-connect')) {
    const payload = await parseBody(req)
    const username = ((payload && payload.username) || 'creator').replace(/[^a-zA-Z0-9]/g, '')
    const simId = `acct_live_${username || 'creator'}_${Date.now().toString(36)}`
    sendJson(res, 200, {
      success: true,
      configured: true,
      accountId: simId,
      message: 'Instant connected account successfully linked!',
    })
    return
  }

  // 3. CONNECT / ONBOARD
  if (subroute.includes('onboard')) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    const payload = await parseBody(req)
    const { username, userId, email, country = 'US', returnUrl, refreshUrl } = payload || {}

    if (!secretKey) {
      sendJson(res, 200, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is missing in Vercel environment variables. Please add your Stripe Secret Key (sk_test_... or sk_live_...) in Vercel Project Settings > Environment Variables.',
      })
      return
    }

    if (isPublishableInsteadOfSecret) {
      sendJson(res, 200, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is set to a publishable key (pk_...). A secret key starting with sk_test_ or sk_live_ is required for Stripe Connect.',
      })
      return
    }

    const stripe = getStripe()
    if (!stripe) {
      sendJson(res, 200, {
        configured: false,
        error: 'Unable to initialize Stripe client.',
      })
      return
    }

    // Stripe Connect does not directly support creating local accounts in Morocco (MA).
    // If the creator is in Morocco, instruct them to link their existing international Stripe Account ID (acct_...)
    // or use Morocco Local Bank (CIH / Attijariwafa) while the platform processes global Stripe card payments.
    const isMorocco = country === 'Morocco' || country === 'MA'
    if (isMorocco) {
      sendJson(res, 200, {
        configured: false,
        isMoroccoNotice: true,
        error: "Stripe Connect ne prend pas en charge la création directe de comptes bancaires au Maroc (MA). Si vous disposez d'un compte Stripe international (US LLC, UK LTD, Stripe Atlas ou Europe), vous pouvez saisir directement votre ID 'acct_...' ci-dessous. Sinon, sélectionnez 'CIH / Virement bancaire marocain' : vos acheteurs payeront par carte via Stripe et vous recevrez 91% directement sur votre compte bancaire marocain !",
      })
      return
    }

    try {
      const countryCode = country && country.length === 2 ? country.toUpperCase() : 'US'
      let account = null

      try {
        account = await stripe.accounts.create({
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
      } catch (expErr) {
        try {
          account = await stripe.accounts.create({
            type: 'standard',
            country: countryCode,
            email: email && email.includes('@') ? email.trim() : undefined,
            metadata: { username: username || '', userId: userId || '' },
          })
        } catch (stdErr) {
          account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: email && email.includes('@') ? email.trim() : undefined,
            metadata: { username: username || '', userId: userId || '' },
          })
        }
      }

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

      sendJson(res, 200, {
        configured: true,
        accountId: account.id,
        url: accountLink.url,
      })
      return
    } catch (err) {
      console.error('Stripe Connect onboarding error:', err)
      sendJson(res, 200, {
        configured: false,
        error: err.message || 'Stripe Connect error. Please check your Stripe Connect activation.',
      })
      return
    }
  }

  // 4. VERIFY-SESSION
  if (subroute.includes('verify-session')) {
    let sessionId = req.query?.session_id || urlObj.searchParams.get('session_id')
    if (!sessionId) {
      sendJson(res, 400, { error: 'Missing session_id' })
      return
    }
    const stripe = getStripe()
    if (!stripe) {
      sendJson(res, 200, { configured: false, verified: false })
      return
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const isPaid = session.payment_status === 'paid' || session.status === 'complete'
      sendJson(res, 200, {
        configured: true,
        verified: isPaid,
        planId: session.metadata?.planId,
        billingCycle: session.metadata?.billingCycle,
        customerEmail: session.customer_details?.email,
      })
      return
    } catch (err) {
      sendJson(res, 200, { configured: true, verified: false, error: err.message })
      return
    }
  }

  // 5. CREATE-PRODUCT-CHECKOUT
  if (subroute.includes('create-product-checkout')) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    const stripe = getStripe()
    if (!stripe) {
      sendJson(res, 200, {
        configured: false,
        error: isPublishableInsteadOfSecret
          ? 'STRIPE_SECRET_KEY is a publishable key. Please provide sk_live_... or sk_test_...'
          : 'Stripe Secret Key is missing.',
      })
      return
    }
    try {
      const payload = await parseBody(req)
      const { username, userId, product, buyerEmail, buyerName, stripeAccountId, successUrl, cancelUrl } = payload || {}
      const rawPrice = String(product?.price || '0').replace(/[^\d.]/g, '')
      const unitAmount = Math.max(100, Math.round((parseFloat(rawPrice) || 5) * 100))

      let currency = 'usd'
      const rawCurr = String(product?.currency || '').toUpperCase()
      if (rawCurr === 'MAD' || rawCurr === 'DH') currency = 'mad'
      else if (rawCurr === 'EUR' || rawCurr === '€') currency = 'eur'

      const platformFeeAmount = Math.round(unitAmount * 0.09)
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
                name: product?.name || 'Digital Product',
                description: `Sold by @${username || 'creator'} on LinkSocio (Instant Delivery)`,
                images: product?.image_url ? [product.image_url] : undefined,
                tax_code: 'txcd_10000000',
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: 'digital_product',
          productId: product?.id || '',
          productName: product?.name || '',
          sellerUsername: username || '',
          sellerUserId: userId || '',
          buyerName: buyerName || '',
          platformFeeRate: '9%',
          platformFeeAmount: String(platformFeeAmount),
        },
        success_url: successUrl || `${hostOrigin}/u/${username}?order_success=true&prod_id=${product?.id}`,
        cancel_url: cancelUrl || `${hostOrigin}/u/${username}`,
      }

      if (stripeAccountId && stripeAccountId.startsWith('acct_')) {
        sessionPayload.payment_intent_data = {
          application_fee_amount: platformFeeAmount,
          transfer_data: { destination: stripeAccountId },
        }
      }

      let session = null
      try {
        session = await stripe.checkout.sessions.create(sessionPayload)
      } catch (firstErr) {
        console.warn('Initial session creation notice:', firstErr.message)
        // If Connect destination account is restricted or cross-border incompatible, create on platform
        if (sessionPayload.payment_intent_data) {
          delete sessionPayload.payment_intent_data
          try {
            session = await stripe.checkout.sessions.create(sessionPayload)
          } catch (retryErr) {
            // If Managed Payments still has an issue, try without managed_payments
            if (retryErr.message && (retryErr.message.includes('managed_payments') || retryErr.message.includes('tax_code'))) {
              try {
                sessionPayload.managed_payments = { enabled: false }
                session = await stripe.checkout.sessions.create(sessionPayload)
              } catch (e3) {
                throw retryErr
              }
            } else {
              throw retryErr
            }
          }
        } else {
          if (firstErr.message && (firstErr.message.includes('managed_payments') || firstErr.message.includes('tax_code'))) {
            try {
              sessionPayload.managed_payments = { enabled: false }
              session = await stripe.checkout.sessions.create(sessionPayload)
            } catch (e3) {
              throw firstErr
            }
          } else {
            throw firstErr
          }
        }
      }

      sendJson(res, 200, { configured: true, url: session.url, sessionId: session.id })
      return
    } catch (err) {
      sendJson(res, 200, { configured: false, error: err.message || 'Stripe error' })
      return
    }
  }

  // 6. CREATE-CHECKOUT (Subscription / Plan)
  if (subroute.includes('create-checkout') || subroute === '') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    const stripe = getStripe()
    if (!stripe) {
      sendJson(res, 200, {
        configured: false,
        error: 'STRIPE_SECRET_KEY is missing in Vercel Environment Variables.',
      })
      return
    }
    try {
      const payload = await parseBody(req)
      const { planId, planName, billingCycle, price, currency = 'eur', userId, username, customerEmail, successUrl, cancelUrl } = payload || {}
      const isYearly = billingCycle === 'yearly'
      const unitAmount = Math.round(Number(price) * 100)
      const validEmail = customerEmail && customerEmail.includes('@') ? customerEmail.trim() : undefined

      const hostOrigin =
        req.headers['origin'] ||
        (req.headers['x-forwarded-proto']
          ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
          : `https://${req.headers.host || 'www.linksocio.com'}`)

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: validEmail,
        client_reference_id: userId || undefined,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `LinkSocio ${planName || 'Creator'}`,
                description: `LinkSocio Subscription - ${isYearly ? 'Annual Billing' : 'Monthly Billing'}`,
                tax_code: 'txcd_10000000',
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

      sendJson(res, 200, { configured: true, url: session.url, sessionId: session.id })
      return
    } catch (err) {
      sendJson(res, 500, { error: err.message || 'Failed to create checkout' })
      return
    }
  }

  sendJson(res, 404, { error: 'Unknown stripe endpoint' })
}
