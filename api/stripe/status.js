export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || ''
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || ''
  const isConfigured = secretKey.trim().length > 0
  const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test'

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      configured: isConfigured,
      mode: mode,
      hasPublishableKey: publishableKey.trim().length > 0,
      publishableKeyMasked: publishableKey
        ? `${publishableKey.slice(0, 8)}...${publishableKey.slice(-4)}`
        : null,
    })
  )
}
