// Automated security audit tests for Linksocio
import {
  applyCors,
  getSupabaseServerClient,
  __setMockAuthUser,
  __setMockSupabaseClient,
} from './api/_supabase.js'
import { __setMockStripe } from './api/_stripe.js'
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
  // TEST 1: Fail-Closed Supabase Service Client
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Fail-Closed Service Role Key (No public/anon fallback) ---')
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  __setMockSupabaseClient(null)
  __setMockAuthUser(null)

  const checkNoKey = getSupabaseServerClient()
  assert(
    checkNoKey.client === null && checkNoKey.error.includes('SUPABASE_SERVICE_ROLE_KEY is missing'),
    'Backend correctly fails closed when SUPABASE_SERVICE_ROLE_KEY is missing (no fallback to public anon key)'
  )

  // -------------------------------------------------------------------------
  // TEST 2: Strict CORS Rejection
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
  // TEST 3: Unauthenticated Access to Private Endpoints
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Unauthenticated Private Endpoints Blocked (401 Unauthorized) ---')
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/booking-settings?userId=target-victim-id',
    })
    await bookingSettingsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'booking-settings GET rejects unauthenticated requests (ignores ?userId)')
  }

  {
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
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/payouts/settings?userId=victim',
    })
    await payoutsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'payouts GET settings rejects unauthenticated requests')
  }

  {
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
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/inquiry-settings',
    })
    await inquirySettingsHandler(req, res)
    const resp = res.getResponse()
    assert(resp.statusCode === 401, 'inquiry-settings GET rejects unauthenticated requests')
  }

  {
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
  // TEST 4: Stripe Webhook Signature Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Webhook Signature Mandatory in Production ---')
  process.env.STRIPE_SECRET_KEY = 'sk_test_51MockAuditKeyForVerification00000000'
  delete process.env.STRIPE_WEBHOOK_SECRET
  {
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
  // TEST 5: Stripe Connect test-connect Disabled
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
  // MANDATORY TEST 1: Attempt to Manually Set stripeStatus: "active" (Priority 1)
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 1: Reject Manual stripeStatus: "active" ---')
  {
    __setMockAuthUser({ id: 'user_audit_100', email: 'creator@audit.test' })
    const mockDb = {
      from(table) {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: { user_id: 'user_audit_100', stripe_account_id: '', stripe_status: 'not_connected' }, error: null }),
                  single: async () => ({ data: { user_id: 'user_audit_100' }, error: null }),
                }
              },
            }
          },
          upsert: async () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
        }
      },
    }
    __setMockSupabaseClient(mockDb)

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/settings',
      body: {
        settings: {
          stripeStatus: 'active', // Direct malicious attempt
        },
      },
    })
    await payoutsHandler(req, res)
    const resp = res.getResponse()
    assert(
      resp.statusCode === 400 && resp.json?.error.includes('stripeStatus cannot be manually set to active'),
      'payouts/settings strictly rejects client-supplied stripeStatus: "active"'
    )
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 2: Webhook Retries with Simulated Failure (Priority 2)
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 2: Webhook Retries & Real Idempotency ---')
  {
    const eventId = 'evt_retry_audit_999'
    let webhookEventsStore = {}
    let failureSimulationActive = true

    const mockStripe = {
      webhooks: {
        constructEvent: () => ({
          id: eventId,
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_retry_audit_999',
              mode: 'payment',
              payment_intent: 'pi_retry_audit_999',
              amount_total: 5000,
              currency: 'eur',
              metadata: {
                type: 'digital_product',
                productId: 'prod_audit_1',
                sellerUserId: 'seller_audit_1',
                creatorAmount: '4550',
              },
            },
          },
        }),
      },
    }
    __setMockStripe(mockStripe)

    const mockDb = {
      from(table) {
        if (table === 'webhook_events') {
          return {
            select() {
              return {
                eq(field, val) {
                  return {
                    maybeSingle: async () => ({
                      data: webhookEventsStore[val] || null,
                      error: null,
                    }),
                  }
                },
              }
            },
            insert: async (row) => {
              webhookEventsStore[row.event_id] = { ...row }
              return { error: null }
            },
            update(fields) {
              return {
                eq(field, val) {
                  if (webhookEventsStore[val]) {
                    Object.assign(webhookEventsStore[val], fields)
                  }
                  return Promise.resolve({ error: null })
                },
              }
            },
          }
        }

        if (table === 'orders') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => {
                      if (failureSimulationActive) {
                        throw new Error('SIMULATED_DATABASE_TIMEOUT: orders query failed during attempt 1')
                      }
                      return {
                        data: {
                          id: 'order_audit_1',
                          status: 'pending',
                          stripe_session_id: 'cs_retry_audit_999',
                        },
                        error: null,
                      }
                    },
                  }
                },
              }
            },
            update() {
              return {
                eq() {
                  return {
                    neq() {
                      return {
                        select: () => ({
                          maybeSingle: async () => ({
                            data: { id: 'order_audit_1', status: 'paid' },
                            error: null,
                          }),
                        }),
                      }
                    },
                  }
                },
              }
            },
          }
        }

        if (table === 'payments') {
          return {
            insert: async () => ({ error: null }),
          }
        }

        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { wallet_balance: 100 }, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          }
        }

        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      },
      rpc: async () => ({ error: null }),
    }
    __setMockSupabaseClient(mockDb)

    // Delivery 1: Failure during processing
    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        url: '/api/webhook',
        headers: { 'stripe-signature': 'valid_sig' },
        body: JSON.stringify({ id: eventId }),
      })
      await webhookHandler(req, res)
      const resp = res.getResponse()
      assert(
        resp.statusCode === 500 && webhookEventsStore[eventId]?.status === 'failed',
        'Attempt 1 fails gracefully, marks event as status="failed" with last_error recorded'
      )
    }

    // Delivery 2: Stripe resends the same event after resolution
    failureSimulationActive = false
    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        url: '/api/webhook',
        headers: { 'stripe-signature': 'valid_sig' },
        body: JSON.stringify({ id: eventId }),
      })
      await webhookHandler(req, res)
      const resp = res.getResponse()
      assert(
        resp.statusCode === 200 && webhookEventsStore[eventId]?.status === 'processed',
        'Attempt 2 retries safely, does NOT treat previous run as completed, and marks status="processed"'
      )
    }

    // Delivery 3: Idempotent duplicate delivery after successful processing
    {
      const { req, res } = createMockReqRes({
        method: 'POST',
        url: '/api/webhook',
        headers: { 'stripe-signature': 'valid_sig' },
        body: JSON.stringify({ id: eventId }),
      })
      await webhookHandler(req, res)
      const resp = res.getResponse()
      assert(
        resp.statusCode === 200 && resp.json?.already_processed === true,
        'Duplicate delivery for completed event is recognized as already_processed without re-crediting'
      )
    }
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 3: Concurrent Withdrawal Requests with Same Balance (Priority 3)
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 3: Concurrent Withdrawal Prevention ---')
  {
    __setMockAuthUser({ id: 'user_audit_withdraw', email: 'creator@audit.test' })
    let userBalance = 100
    let activePendingRequests = []

    const mockDb = {
      rpc: async (name, args) => {
        if (name === 'create_payout_request_atomic') {
          // Simulate atomic postgres lock and balance reservation
          if (activePendingRequests.length > 0) {
            return { data: null, error: { message: 'ACTIVE_REQUEST_EXISTS: You already have an active withdrawal request' } }
          }
          if (userBalance < args.p_amount) {
            return { data: null, error: { message: 'INSUFFICIENT_BALANCE: Available balance is insufficient' } }
          }
          userBalance -= args.p_amount
          const newRequest = { id: 'payout_1', amount: args.p_amount, status: 'pending' }
          activePendingRequests.push(newRequest)
          return { data: newRequest, error: null }
        }
        return { data: null, error: { message: 'Unknown RPC' } }
      },
    }
    __setMockSupabaseClient(mockDb)

    // Request 1: 100 EUR withdrawal
    const { req: req1, res: res1 } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/request',
      body: { amount: 100, currency: 'EUR' },
    })
    await payoutsHandler(req1, res1)
    const resp1 = res1.getResponse()

    // Request 2: Simultaneous 100 EUR withdrawal with same initial balance
    const { req: req2, res: res2 } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/request',
      body: { amount: 100, currency: 'EUR' },
    })
    await payoutsHandler(req2, res2)
    const resp2 = res2.getResponse()

    assert(
      resp1.statusCode === 200 && resp1.json?.success === true,
      'First withdrawal request successfully reserves funds'
    )
    assert(
      resp2.statusCode === 400 && (resp2.json?.error.includes('active') || resp2.json?.error.includes('Insufficient')),
      'Concurrent second withdrawal request with same balance is strictly rejected (no double spend)'
    )
    assert(userBalance === 0, 'Wallet balance remained strictly non-negative after concurrent attempt')
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 4: Double Payout Approval Prevention (Priority 3)
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 4: Double Approval Prevention ---')
  {
    __setMockAuthUser({ id: 'admin_audit_user', role: 'admin' })
    let payoutRecord = { id: 'payout_audit_77', status: 'pending', amount: 50 }

    const mockDb = {
      from(table) {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      },
      rpc: async (name, args) => {
        if (name === 'approve_payout_atomic') {
          if (payoutRecord.status === 'completed') {
            return { data: null, error: { message: 'ALREADY_COMPLETED: Payout request has already been approved' } }
          }
          payoutRecord.status = 'completed'
          return { data: { ...payoutRecord }, error: null }
        }
        return { data: null, error: { message: 'Unknown RPC' } }
      },
    }
    __setMockSupabaseClient(mockDb)

    // First approval
    const { req: req1, res: res1 } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/approve',
      body: { payoutId: 'payout_audit_77' },
    })
    await payoutsHandler(req1, res1)
    const resp1 = res1.getResponse()

    // Second approval for same payout
    const { req: req2, res: res2 } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/approve',
      body: { payoutId: 'payout_audit_77' },
    })
    await payoutsHandler(req2, res2)
    const resp2 = res2.getResponse()

    assert(resp1.statusCode === 200 && resp1.json?.success === true, 'First admin approval succeeds')
    assert(
      resp2.statusCode === 409 && resp2.json?.error.includes('already completed'),
      'Second approval is rejected with 409 Conflict, preventing duplicate completion'
    )
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 4B: P0 Anti-Double-Refund — Cancelled Payout Cannot Be Rejected
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 4B: Anti-Double-Refund (Cancelled Payout Cannot Be Rejected) ---')
  {
    const creatorUser = { id: 'creator_cancel_test', role: 'creator' }
    const adminUser = { id: 'admin_cancel_test', role: 'admin' }

    let creatorBalance = 100.00
    let payoutRecord = {
      id: 'payout_cancel_44',
      user_id: creatorUser.id,
      amount: 60.00,
      status: 'pending',
    }
    // Balance initially held down to 40.00
    creatorBalance -= payoutRecord.amount

    const mockDb = {
      from(table) {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (col, val) => ({
                single: async () => ({
                  data: { id: val, role: val === adminUser.id ? 'admin' : 'creator', wallet_balance: creatorBalance },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      },
      rpc: async (name, args) => {
        if (name === 'cancel_payout_request_atomic') {
          if (payoutRecord.status !== 'pending') {
            return { data: null, error: { message: 'CANNOT_CANCEL: Only pending payouts can be cancelled' } }
          }
          payoutRecord.status = 'cancelled'
          creatorBalance += payoutRecord.amount
          return { data: { ...payoutRecord }, error: null }
        }
        if (name === 'reject_payout_atomic') {
          if (payoutRecord.status === 'cancelled') {
            return { data: null, error: { message: 'CANNOT_REJECT_CANCELLED: Cancelled payouts cannot be rejected or refunded again' } }
          }
          if (payoutRecord.status !== 'pending' && payoutRecord.status !== 'processing') {
            return { data: null, error: { message: `INVALID_STATUS: Payout request in status '${payoutRecord.status}' is not in a refundable state` } }
          }
          payoutRecord.status = 'rejected'
          creatorBalance += payoutRecord.amount
          return { data: { ...payoutRecord }, error: null }
        }
        return { data: null, error: { message: 'Unknown RPC' } }
      },
    }
    __setMockSupabaseClient(mockDb)

    // 1. Creator cancels their own pending payout
    __setMockAuthUser(creatorUser)
    const { req: cancelReq, res: cancelRes } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/cancel',
      body: { payoutId: 'payout_cancel_44' },
    })
    await payoutsHandler(cancelReq, cancelRes)
    const cancelResp = cancelRes.getResponse()

    assert(cancelResp.statusCode === 200 && cancelResp.json?.success === true, 'Creator cancels pending payout request successfully')
    assert(creatorBalance === 100.00, 'Balance refunded back to 100.00 upon user cancellation')

    // 2. Admin attempts to reject the cancelled payout request
    __setMockAuthUser(adminUser)
    const { req: rejectReq, res: rejectRes } = createMockReqRes({
      method: 'POST',
      url: '/api/payouts/reject',
      body: { payoutId: 'payout_cancel_44', reason: 'Attempt duplicate reject' },
    })
    await payoutsHandler(rejectReq, rejectRes)
    const rejectResp = rejectRes.getResponse()

    assert(
      rejectResp.statusCode === 409 && rejectResp.json?.error.includes('Cannot reject cancelled payout request'),
      'Admin reject endpoint rejects cancelled payout with 409 Conflict'
    )
    assert(
      creatorBalance === 100.00,
      'CRITICAL: Balance was NOT incremented again after rejected attempt (Zero Double Refund Guarantee)'
    )
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 5: Reject Invalid Subscription planId (Priority 4)
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 5: Subscription Plan Authorization & Price Binding ---')
  {
    __setMockAuthUser({ id: 'user_audit_sub', email: 'subscriber@audit.test' })
    __setMockStripe({
      checkout: {
        sessions: {
          create: async (payload) => ({
            id: 'cs_sub_test',
            url: 'https://checkout.stripe.com/pay/cs_sub_test',
          }),
        },
      },
    })

    // 1. Invalid planId submitted to create-checkout
    const { req: badReq, res: badRes } = createMockReqRes({
      method: 'POST',
      url: '/api/stripe/create-checkout',
      body: { planId: 'hacker_plan_unlimited', billingCycle: 'monthly' },
    })
    await stripeHandler(badReq, badRes)
    const badResp = badRes.getResponse()
    assert(
      badResp.statusCode === 400 && badResp.json?.error.includes('Invalid planId'),
      'create-checkout strictly rejects unknown or unauthorized planId'
    )

    // 2. Valid planId 'pro' binds authoritative price
    const { req: goodReq, res: goodRes } = createMockReqRes({
      method: 'POST',
      url: '/api/stripe/create-checkout',
      body: { planId: 'pro', billingCycle: 'yearly' },
    })
    await stripeHandler(goodReq, goodRes)
    const goodResp = goodRes.getResponse()
    assert(
      goodResp.statusCode === 200 && goodResp.json?.configured === true,
      'create-checkout accepts valid planId ("pro") and binds authoritative pricing'
    )

    // 3. Webhook receiving invalid subscription plan
    const { req: whReq, res: whRes } = createMockReqRes({
      method: 'POST',
      url: '/api/webhook',
      headers: { 'stripe-signature': 'valid_sig' },
      body: JSON.stringify({ id: 'evt_sub_tampered' }),
    })
    __setMockStripe({
      webhooks: {
        constructEvent: () => ({
          id: 'evt_sub_tampered',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_sub_tampered',
              mode: 'subscription',
              amount_total: 100, // Malicious low price
              metadata: {
                userId: 'user_audit_sub',
                planId: 'invalid_unlimited_vip',
              },
            },
          },
        }),
      },
    })
    let upgradedPlan = null
    __setMockSupabaseClient({
      from(table) {
        if (table === 'webhook_events') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
            insert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        if (table === 'profiles') {
          return {
            update: (fields) => {
              upgradedPlan = fields.plan
              return { eq: async () => ({ error: null }) }
            },
          }
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          upsert: async () => ({ error: null }),
        }
      },
    })

    await webhookHandler(whReq, whRes)
    const whResp = whRes.getResponse()
    assert(
      whResp.statusCode === 500 && upgradedPlan === null,
      'Webhook rejects activating unknown subscription plan on user profile'
    )
  }

  // -------------------------------------------------------------------------
  // MANDATORY TEST 6: Supabase Errors During Checkout & Withdrawals (Priority 5)
  // -------------------------------------------------------------------------
  console.log('\n--- Mandatory Test 6: Supabase Failure Recovery & Session Rollback ---')
  {
    let sessionExpired = false
    const orphanSessionId = 'cs_test_orphan_to_expire'

    __setMockStripe({
      checkout: {
        sessions: {
          create: async () => ({
            id: orphanSessionId,
            url: `https://checkout.stripe.com/pay/${orphanSessionId}`,
          }),
          expire: async (id) => {
            if (id === orphanSessionId) {
              sessionExpired = true
            }
            return { id, status: 'expired' }
          },
        },
      },
    })

    // Simulate Supabase DB crash when inserting order
    __setMockSupabaseClient({
      from(table) {
        if (table === 'products') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'prod_99',
                      price: '19.99',
                      name: 'E-Book',
                      is_active: true,
                      user_id: 'creator_99',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'payout_settings') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }
        }
        if (table === 'orders') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { message: 'FATAL: Supabase write failed on orders table' },
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      },
    })

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/stripe/create-product-checkout',
      body: { productId: 'prod_99', buyerEmail: 'buyer@test.com' },
    })
    await stripeHandler(req, res)
    const resp = res.getResponse()

    assert(
      resp.statusCode === 500 && resp.json?.error.includes('safely invalidated'),
      'create-product-checkout fails securely on Supabase error'
    )
    assert(
      sessionExpired === true,
      'Orphaned Stripe checkout session was immediately expired via recovery strategy'
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
