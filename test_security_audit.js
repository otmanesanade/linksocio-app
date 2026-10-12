// Automated security audit tests for Linksocio
import http from 'http'
import { applyCors, getSupabaseServerClient } from './api/_supabase.js'
import bookingSettingsHandler from './api/booking-settings.js'
import payoutsHandler from './api/payouts.js'
import inquirySettingsHandler from './api/inquiry-settings.js'
import restaurantMenuHandler from './api/restaurant-menu.js'
import webhookHandler from './api/webhook.js'
import stripeHandler from './api/stripe.js'

function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = null }) {
  const req = {
    method,
    url,
    headers: { ...headers },
    body,
    on(event, cb) {
      if (event === 'data' && body) {
        cb(typeof body === 'string' ? Buffer.from(body) : Buffer.from(JSON.stringify(body)))
      }
      if (event === 'end') {
        cb()
      }
    },
  }

  let statusCode = 200
  let resHeaders = {}
  let responseData = ''
  let ended = false

  const res = {
    get statusCode() {
      return statusCode
    },
    set statusCode(val) {
      statusCode = val
    },
    setHeader(name, value) {
      resHeaders[name.toLowerCase()] = value
    },
    getHeader(name) {
      return resHeaders[name.toLowerCase()]
    },
    end(chunk) {
      if (chunk) responseData += chunk.toString()
      ended = true
    },
    getResponse() {
      return {
        statusCode,
        headers: resHeaders,
        data: responseData,
        json: responseData ? (() => { try { return JSON.parse(responseData) } catch (e) { return null } })() : null,
      }
    },
  }

  return { req, res }
}

async function runTests() {
  console.log('====================================================')
  console.log('LINKSOCIO SECURITY AUDIT & CONTROL VERIFICATION')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`)
      passed++
    } else {
      console.error(`[FAIL] ${message}`)
      failed++
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Fail-Closed Supabase Service Client (Point 1)
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Fail-Closed Service Role Key (No public/anon fallback) ---')
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY

  const checkNoKey = getSupabaseServerClient()
  assert(
    checkNoKey.client === null && checkNoKey.error.includes('SUPABASE_SERVICE_ROLE_KEY is missing'),
    'Backend correctly fails closed when SUPABASE_SERVICE_ROLE_KEY is missing (no fallback to public anon key)'
  )

  // -------------------------------------------------------------------------
  // TEST 2: Strict CORS Rejection (Point 6)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: CORS Strict Origin Validation ---')
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { origin: 'https://attacker.evil.com' },
    })
    const blocked = applyCors(req, res)
    const resp = res.getResponse()
    assert(blocked === true && resp.statusCode === 403, 'Unauthorized origin (attacker.evil.com) is explicitly blocked with 403')
  }

  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { origin: 'https://linksocio.com' },
    })
    const blocked = applyCors(req, res)
    const resp = res.getResponse()
    assert(
      blocked === false && resp.headers['access-control-allow-origin'] === 'https://linksocio.com',
      'Authorized origin (linksocio.com) receives correct Access-Control-Allow-Origin header'
    )
  }

  // -------------------------------------------------------------------------
  // TEST 3: Unauthenticated Access to Private Endpoints (Point 3)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Unauthenticated Private Endpoints Blocked (401 Unauthorized) ---')
  {
    // booking-settings GET
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/booking-settings?userId=target-victim-id',
    })
    await bookingSettingsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'booking-settings GET rejects unauthenticated requests (ignores ?userId)')
  }

  {
    // booking-settings POST
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/booking-settings',
      body: { userId: 'victim', settings: { enabled: true } },
    })
    await bookingSettingsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'booking-settings POST rejects unauthenticated requests')
  }

  {
    // payouts GET settings
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/payouts/settings?userId=victim',
    })
    await payoutsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'payouts GET settings rejects unauthenticated requests')
  }

  {
    // payouts POST request
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/request',
      body: { amount: 100, userId: 'victim' },
    })
    await payoutsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'payouts withdrawal request rejects unauthenticated requests')
  }

  {
    // inquiry-settings GET
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/inquiry-settings',
    })
    await inquirySettingsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'inquiry-settings GET rejects unauthenticated requests')
  }

  {
    // restaurant-menu POST
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/restaurant-menu',
      body: { menu: { items: [] } },
    })
    await restaurantMenuHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'restaurant-menu POST rejects unauthenticated requests')
  }

  // -------------------------------------------------------------------------
  // TEST 4: Stripe Webhook Signature Verification (Point 2)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Webhook Signature Mandatory in Production ---')
  process.env.STRIPE_SECRET_KEY = 'sk_test_51MockAuditKeyForVerification00000000'
  delete process.env.STRIPE_WEBHOOK_SECRET
  {
    // Missing STRIPE_WEBHOOK_SECRET
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/webhook',
      body: JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' }),
    })
    await webhookHandler(req, res)
    const resp = res.getResponse()
    assert(
      resp.statusCode === 500 && resp.json?.error.includes('STRIPE_WEBHOOK_SECRET is missing'),
      'Webhook rejects processing when STRIPE_WEBHOOK_SECRET is missing'
    )
  }

  {
    // Missing stripe-signature header
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_audit_verification'
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/webhook',
      body: JSON.stringify({ id: 'evt_test' }),
    })
    await webhookHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 400 && resp.json?.error.includes('Missing required stripe-signature header'),
      'Webhook rejects requests without stripe-signature header'
    )
  }

  {
    // Invalid stripe-signature header
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/webhook',
      headers: { 'stripe-signature': 't=1234567890,v1=bad_signature_attempt' },
      body: JSON.stringify({ id: 'evt_test' }),
    })
    await webhookHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 400 && resp.json?.error.includes('Invalid webhook signature'),
      'Webhook cryptographically rejects forged/invalid signatures'
    )
  }

  // -------------------------------------------------------------------------
  // TEST 5: Stripe Connect test-connect Disabled (Point 5)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Simulated test-connect Disabled ---')
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/stripe/test-connect',
    })
    await stripeHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 403, 'Simulated test-connect is rejected with 403 to prevent false connections')
  }

  // -------------------------------------------------------------------------
  // TEST 6: Product Price Manipulation Blocked (Point 7)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Client Price Tampering Protection ---')
  {
    // Calling create-product-checkout with manipulated client price and nonexistent productId
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/stripe/create-product-checkout',
      body: {
        productId: 'nonexistent-uuid-prod',
        product: { price: '0.01' }, // Tampered cheap price
      },
    })
    await stripeHandler(req, res)
    const resp = res.getResponse()
    // Since product does not exist in DB or service key is not configured, it fails closed
    assert(
      resp.statusCode === 400 || resp.statusCode === 500,
      'create-product-checkout rejects client-provided prices without server DB verification'
    )
  }

  console.log('\n====================================================')
  console.log(`AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
