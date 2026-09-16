import Stripe from 'stripe'

let stripeInstance = null
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !key.trim()) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(key.trim())
  }
  return stripeInstance
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

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    let payload = req.body
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch (e) {
        payload = {}
      }
    } else if (!payload) {
      payload = await new Promise((resolve) => {
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

    const {
      username,
      userId,
      product,
      buyerName,
      buyerEmail,
      stripeAccountId,
      successUrl,
      cancelUrl,
    } = payload || {}

    const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
    const stripe = getStripe()

    if (!stripe) {
      const isPk = secretKey.startsWith('pk_')
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          configured: false,
          simulated: false,
          error: isPk
            ? 'STRIPE_SECRET_KEY is currently set to a Publishable Key (starts with pk_...). Please enter your Stripe Secret Key (starts with sk_test_ or sk_live_) in Vercel / Environment Variables.'
            : 'Stripe Secret Key is not configured in environment variables.',
        })
      )
      return
    }

    const rawPrice = String(product?.price || '0').replace(/[^\d.]/g, '')
    const unitAmount = Math.max(100, Math.round((parseFloat(rawPrice) || 5) * 100))

    let currency = 'usd'
    const rawCurr = String(product?.currency || '').toUpperCase()
    if (rawCurr === 'MAD' || rawCurr === 'DH') {
      currency = 'mad'
    } else if (rawCurr === 'EUR' || rawCurr === '€') {
      currency = 'eur'
    }

    // 9% LinkSocio fee
    const platformFeeAmount = Math.round(unitAmount * 0.09)

    const hostOrigin =
      req.headers['origin'] ||
      (req.headers['x-forwarded-proto']
        ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
        : req.headers.host?.includes('localhost')
        ? `http://${req.headers.host}`
        : `https://${req.headers.host || 'www.linksocio.com'}`)

    const sessionPayload = {
      mode: 'payment',
      customer_email: buyerEmail && buyerEmail.includes('@') ? buyerEmail.trim() : undefined,
      client_reference_id: userId || username || 'customer',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: product?.name || 'Digital Product',
              description: `Sold by @${username || 'creator'} on LinkSocio (Instant Delivery)`,
              images: product?.image_url ? [product.image_url] : undefined,
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
      success_url:
        successUrl ||
        `${hostOrigin}/u/${username}?order_success=true&prod_id=${product?.id}`,
      cancel_url:
        cancelUrl ||
        `${hostOrigin}/u/${username}`,
    }

    if (stripeAccountId && stripeAccountId.startsWith('acct_')) {
      sessionPayload.payment_intent_data = {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
      }
    }

    let session = null
    try {
      session = await stripe.checkout.sessions.create(sessionPayload)
    } catch (connectErr) {
      console.warn('Connect direct transfer session failed, retrying on platform:', connectErr.message)
      delete sessionPayload.payment_intent_data
      session = await stripe.checkout.sessions.create(sessionPayload)
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ configured: true, url: session.url, sessionId: session.id }))
  } catch (err) {
    console.error('Stripe product checkout serverless error:', err)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ configured: false, error: err.message || 'Stripe error' }))
  }
}
