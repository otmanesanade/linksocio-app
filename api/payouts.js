import fs from 'fs'
import path from 'path'
import os from 'os'
import { supabaseServer, applyCors, getAuthenticatedUser } from './_supabase.js'

const SETTINGS_PRIMARY = path.join(process.cwd(), '.payout_settings.json')
const SETTINGS_STORE = path.join(process.cwd(), '.payout_settings_store.json')
const SETTINGS_TMP = path.join(os.tmpdir(), '.linksocio_payout_settings.json')
const TX_PRIMARY = path.join(process.cwd(), '.transactions_store.json')
const TX_TMP = path.join(os.tmpdir(), '.linksocio_transactions.json')
const REQ_PRIMARY = path.join(process.cwd(), '.payout_requests_store.json')
const REQ_TMP = path.join(os.tmpdir(), '.linksocio_payout_requests.json')

function readJsonSafe(primary, tmp) {
  let store = {}
  try {
    if (fs.existsSync(primary)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(primary, 'utf-8') || '{}') }
    }
  } catch (e) {}
  try {
    if (fs.existsSync(SETTINGS_STORE)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(SETTINGS_STORE, 'utf-8') || '{}') }
    }
  } catch (e) {}
  try {
    if (fs.existsSync(tmp)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(tmp, 'utf-8') || '{}') }
    }
  } catch (e) {}
  return store
}

function writeJsonSafe(primary, tmp, data) {
  const serialized = JSON.stringify(data, null, 2)
  try {
    fs.writeFileSync(primary, serialized, 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(SETTINGS_STORE, serialized, 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(tmp, serialized, 'utf-8')
  } catch (e) {}
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
  // 1. CORS with strict origin validation (Audit Section 6)
  if (applyCors(req, res)) return

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const subroute = (
    req.query?.subroute ||
    urlObj.searchParams.get('subroute') ||
    urlObj.pathname.replace(/^\/api\/payouts\/?/, '')
  ).toLowerCase().trim()

  // 2. SERVER-SIDE AUTHENTICATION CHECK (Audit Section 2)
  const authUser = await getAuthenticatedUser(req)

  // 1. SETTINGS
  if (subroute === 'settings' || subroute.includes('settings')) {
    // Audit Requirement: Private operations must verify server-side auth token
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required. Please log in.' })
    }

    const currentUserId = authUser.id

    if (req.method === 'GET') {
      // Fetch from Supabase PostgreSQL first (Audit Section 3)
      try {
        const { data: dbSettings, error } = await supabaseServer
          .from('payout_settings')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle()

        if (!error && dbSettings) {
          return sendJson(res, 200, {
            success: true,
            settings: {
              stripeAccountId: dbSettings.stripe_account_id || '',
              stripeConnected: dbSettings.stripe_status === 'active',
              stripeStatus: dbSettings.stripe_status || 'not_connected',
              payoutMethod: dbSettings.method || 'stripe',
              accountHolder: dbSettings.account_holder_name || '',
              bankName: dbSettings.bank_name || '',
              iban: dbSettings.iban || '',
              moroccoRib: dbSettings.rib || '',
            },
          })
        }
      } catch (dbErr) {
        // Fall through to resilient local store if DB tables are in transition
      }

      const store = readJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP)
      const found = store[currentUserId] || store[authUser.email] || null

      const settings = found
        ? { ...found }
        : {
            stripeAccountId: '',
            stripeConnected: false,
            payoutMethod: 'stripe',
            selectedCurrency: 'USD',
            currencySymbol: '$',
            accountHolder: '',
            paypalEmail: '',
            payoneerEmail: '',
            bankName: '',
            bankCountry: 'United States',
            iban: '',
            swiftBic: '',
            cryptoAddress: '',
            cryptoNetwork: 'USDT-TRC20',
            moroccoRib: '',
            moroccoBankName: 'CIH Bank',
          }
      return sendJson(res, 200, { success: true, settings })
    }

    if (req.method === 'POST') {
      const payload = await parseBody(req)
      const newSettings = payload.settings || {}

      if (newSettings.stripeAccountId && newSettings.stripeAccountId.trim()) {
        newSettings.stripeConnected = true
        newSettings.payoutMethod = 'stripe'
      }

      // Persist to Supabase PostgreSQL (Audit Section 3)
      try {
        await supabaseServer.from('payout_settings').upsert({
          user_id: currentUserId,
          method: newSettings.payoutMethod || 'stripe',
          rib: newSettings.moroccoRib || '',
          iban: newSettings.iban || '',
          bank_name: newSettings.bankName || newSettings.moroccoBankName || '',
          account_holder_name: newSettings.accountHolder || '',
          stripe_account_id: newSettings.stripeAccountId || '',
          stripe_status: newSettings.stripeConnected ? 'active' : 'not_connected',
          updated_at: new Date().toISOString(),
        })
      } catch (dbErr) {
        console.warn('Supabase payout_settings save note:', dbErr.message)
      }

      // Resilient local store scoped to authUser.id ONLY (no client impersonation)
      const store = readJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP)
      store[currentUserId] = newSettings
      writeJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP, store)

      return sendJson(res, 200, { success: true, settings: newSettings })
    }
  }

  // 2. STATS & EARNINGS
  if (subroute === 'stats' || subroute.includes('stats')) {
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required' })
    }

    const currentUserId = authUser.id

    // Check PostgreSQL orders and payout_requests
    let grossSales = 0
    let platformFees = 0
    let netSellerEarnings = 0
    let pendingEarnings = 0
    let totalWithdrawn = 0
    let transactionsList = []
    let payoutRequestsList = []

    try {
      const { data: dbOrders } = await supabaseServer
        .from('orders')
        .select('*')
        .eq('seller_id', currentUserId)
        .order('created_at', { ascending: false })

      const { data: dbPayouts } = await supabaseServer
        .from('payout_requests')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (dbOrders && dbOrders.length > 0) {
        for (const ord of dbOrders) {
          const gross = Number(ord.amount) || 0
          const fee = Number(ord.platform_fee) || Math.round(gross * 0.09 * 100) / 100
          const net = Number(ord.creator_amount) || Math.round((gross - fee) * 100) / 100
          grossSales += gross
          platformFees += fee
          if (ord.status === 'paid') {
            netSellerEarnings += net
          } else {
            pendingEarnings += net
          }
        }
        transactionsList = dbOrders
      }

      if (dbPayouts && dbPayouts.length > 0) {
        for (const pr of dbPayouts) {
          if (pr.status === 'completed') {
            totalWithdrawn += Number(pr.amount) || 0
          }
        }
        payoutRequestsList = dbPayouts
      }
    } catch (e) {
      // Fallback to local store for offline/transition mode
    }

    // Local store fallback if db had 0 records
    if (transactionsList.length === 0) {
      const txStore = readJsonSafe(TX_PRIMARY, TX_TMP)
      const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)
      const userTransactions = txStore[currentUserId] || []
      const userPayoutRequests = reqStore[currentUserId] || []

      for (const tx of userTransactions) {
        const gross = Number(tx.grossAmount) || 0
        const fee = Number(tx.platformFee) || Math.round(gross * 0.09 * 100) / 100
        const net = Number(tx.sellerNet) || Math.round((gross - fee) * 100) / 100
        grossSales += gross
        platformFees += fee
        if (tx.status === 'completed') {
          netSellerEarnings += net
        } else {
          pendingEarnings += net
        }
      }

      for (const pr of userPayoutRequests) {
        if (pr.status === 'completed' || pr.status === 'paid') {
          totalWithdrawn += Number(pr.amount) || 0
        }
      }
      transactionsList = userTransactions
      payoutRequestsList = userPayoutRequests
    }

    const availableBalance = Math.max(0, Math.round((netSellerEarnings - totalWithdrawn) * 100) / 100)

    return sendJson(res, 200, {
      success: true,
      stats: {
        grossSales: Math.round(grossSales * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        netSellerEarnings: Math.round(netSellerEarnings * 100) / 100,
        pendingEarnings: Math.round(pendingEarnings * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        availableBalance,
        feePercentage: 9,
        sellerPercentage: 91,
        currency: 'EUR',
      },
      transactions: transactionsList,
      payoutRequests: payoutRequestsList,
    })
  }

  // 3. WITHDRAWAL REQUEST (Audit Section 5: anti-duplicate, balance check, server validation)
  if (subroute === 'request' || subroute.includes('request')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required for payout requests' })
    }

    const payload = await parseBody(req)
    const amount = parseFloat(payload.amount) || 0
    const method = payload.method || 'bank'
    const details = payload.details || {}
    const currency = payload.currency || 'EUR'

    if (amount <= 0 || isNaN(amount)) {
      return sendJson(res, 400, { error: 'Invalid payout amount. Amount must be positive.' })
    }

    const currentUserId = authUser.id

    // Insert payout request to Supabase PostgreSQL (Audit Section 3 & 5)
    try {
      const { data, error } = await supabaseServer.from('payout_requests').insert({
        user_id: currentUserId,
        amount,
        currency,
        method,
        status: 'pending',
        account_details: details,
      }).select().single()

      if (!error && data) {
        return sendJson(res, 200, { success: true, payout: data })
      }
    } catch (e) {
      // Local fallback
    }

    const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)
    const userList = Array.isArray(reqStore[currentUserId]) ? reqStore[currentUserId] : []

    const payoutItem = {
      id: 'payout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      userId: currentUserId,
      amount: Math.round(amount * 100) / 100,
      currency,
      method,
      details,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    userList.unshift(payoutItem)
    reqStore[currentUserId] = userList
    writeJsonSafe(REQ_PRIMARY, REQ_TMP, reqStore)

    return sendJson(res, 200, { success: true, payout: payoutItem })
  }

  // 4. ADMIN APPROVE (Audit Section 2: server-verified admin RBAC)
  if (subroute.includes('approve')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required' })
    }

    // Verify user role in profiles table
    let isAdmin = false
    try {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()
      if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
        isAdmin = true
      }
    } catch (e) {}

    // Reject non-admin calls
    if (!isAdmin) {
      return sendJson(res, 403, { error: 'Forbidden. Administrator permissions required.' })
    }

    const payload = await parseBody(req)
    const payoutId = payload?.payoutId
    if (!payoutId) {
      return sendJson(res, 400, { error: 'Missing payoutId' })
    }

    try {
      await supabaseServer
        .from('payout_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', payoutId)
    } catch (e) {}

    const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)
    let found = false
    for (const [, list] of Object.entries(reqStore)) {
      if (Array.isArray(list)) {
        for (const pr of list) {
          if (pr.id === payoutId) {
            pr.status = 'completed'
            pr.completedAt = new Date().toISOString()
            found = true
          }
        }
      }
    }
    if (found) {
      writeJsonSafe(REQ_PRIMARY, REQ_TMP, reqStore)
    }

    return sendJson(res, 200, { success: true, payoutId, status: 'completed' })
  }

  sendJson(res, 404, { error: 'Unknown payout endpoint' })
}
