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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  // Parse query params safely in Vercel or Node
  let sessionId = req.query?.session_id
  if (!sessionId && req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost')
      sessionId = parsed.searchParams.get('session_id')
    } catch (e) {}
  }

  if (!sessionId) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing session_id' }))
    return
  }

  const stripe = getStripe()
  if (!stripe) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ configured: false, verified: false }))
    return
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const isPaid = session.payment_status === 'paid' || session.status === 'complete'

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        configured: true,
        verified: isPaid,
        planId: session.metadata?.planId,
        billingCycle: session.metadata?.billingCycle,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        subscriptionId: session.subscription,
      })
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message || 'Failed to retrieve Stripe session' }))
  }
}
