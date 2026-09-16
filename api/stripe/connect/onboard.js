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

    const { username, userId, email, returnUrl, refreshUrl } = payload || {}
    const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
    const stripe = getStripe()

    if (!stripe) {
      const isPk = secretKey.startsWith('pk_')
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          configured: false,
          error: isPk
            ? 'STRIPE_SECRET_KEY is currently set to a Publishable Key (starting with pk_...). Please enter your Stripe Secret Key (starting with sk_test_ or sk_live_) in Vercel / Settings Environment Variables.'
            : 'STRIPE_SECRET_KEY is missing in your hosting environment variables (e.g. Vercel). Please add STRIPE_SECRET_KEY in Vercel Project Settings > Environment Variables, or use 1-Click Instant Connect below.',
          canInstantConnect: true,
        })
      )
      return
    }

    // Map country to valid ISO 2-letter code supported by Stripe Connect
    let countryCode = 'US'
    if (payload.country && typeof payload.country === 'string') {
      const upper = payload.country.trim().toUpperCase()
      const map = {
        'UNITED STATES': 'US',
        'USA': 'US',
        'US': 'US',
        'UNITED KINGDOM': 'GB',
        'UK': 'GB',
        'GB': 'GB',
        'FRANCE': 'FR',
        'FR': 'FR',
        'SPAIN': 'ES',
        'ES': 'ES',
        'GERMANY': 'DE',
        'DE': 'DE',
        'CANADA': 'CA',
        'CA': 'CA',
        'ITALY': 'IT',
        'IT': 'IT',
        'NETHERLANDS': 'NL',
        'NL': 'NL',
        'UNITED ARAB EMIRATES': 'AE',
        'UAE': 'AE',
        'AE': 'AE',
        'MOROCCO': 'MA',
        'MAROC': 'MA',
        'MA': 'MA',
      }
      if (map[upper]) {
        countryCode = map[upper]
      }
    }

    const accountParams = {
      type: 'express',
      country: countryCode,
      email: email && email.includes('@') ? email.trim() : undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        username: username || '',
        userId: userId || '',
        platform: 'LinkSocio',
      },
    }

    let account
    try {
      account = await stripe.accounts.create(accountParams)
    } catch (createErr) {
      console.warn('Express account create attempt with country failed, falling back:', createErr.message)
      try {
        account = await stripe.accounts.create({
          type: 'standard',
          email: email && email.includes('@') ? email.trim() : undefined,
          metadata: {
            username: username || '',
            userId: userId || '',
            platform: 'LinkSocio',
          },
        })
      } catch (standardErr) {
        account = await stripe.accounts.create({
          type: 'express',
          metadata: {
            username: username || '',
            userId: userId || '',
            platform: 'LinkSocio',
          },
        })
      }
    }

    const hostOrigin =
      req.headers['origin'] ||
      (req.headers['x-forwarded-proto']
        ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
        : req.headers.host?.includes('localhost')
        ? `http://${req.headers.host}`
        : `https://${req.headers.host || 'www.linksocio.com'}`)

    const finalReturnUrl = returnUrl || `${hostOrigin}/dashboard?tab=payouts&stripe_connected=true&acct=${account.id}`
    const finalRefreshUrl = refreshUrl || `${hostOrigin}/dashboard?tab=payouts&stripe_retry=true`

    // Generate official Stripe account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: finalRefreshUrl,
      return_url: finalReturnUrl,
      type: 'account_onboarding',
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        configured: true,
        accountId: account.id,
        url: accountLink.url,
      })
    )
  } catch (err) {
    console.error('Stripe Connect onboarding serverless error:', err)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        configured: false,
        error: err.message || 'Stripe Connect could not be initialized. Please check your Stripe Dashboard settings.',
        canInstantConnect: true,
      })
    )
  }
}
