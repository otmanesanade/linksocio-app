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
      planId,
      planName,
      billingCycle,
      price,
      currency = 'eur',
      userId,
      username,
      customerEmail,
      successUrl,
      cancelUrl,
    } = payload || {}

    const stripe = getStripe()
    if (!stripe) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          configured: false,
          error:
            'STRIPE_SECRET_KEY is missing in Vercel Environment Variables. Please add STRIPE_SECRET_KEY in Vercel Project Settings > Environment Variables.',
        })
      )
      return
    }

    const isYearly = billingCycle === 'yearly'
    const unitAmount = Math.round(Number(price) * 100)
    const validEmail =
      customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')
        ? customerEmail.trim()
        : undefined

    const origin =
      req.headers['origin'] ||
      (req.headers['x-forwarded-proto']
        ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
        : req.headers.host?.includes('localhost')
        ? `http://${req.headers.host}`
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
            recurring: {
              interval: isYearly ? 'year' : 'month',
            },
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
      success_url:
        successUrl ||
        `${origin}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url:
        cancelUrl ||
        `${origin}/dashboard?tab=billing`,
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        configured: true,
        url: session.url,
        sessionId: session.id,
      })
    )
  } catch (err) {
    console.error('Stripe checkout serverless error:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: err.message || 'Failed to create Stripe checkout session',
      })
    )
  }
}
