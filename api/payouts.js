// Server endpoint to manage creator payout settings, statistics, and withdrawal requests with Supabase persistence
import { applyCors, getAuthenticatedUser, getSupabaseServerClient } from './_supabase.js'

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
  // Audit Point 6: Strict CORS validation
  if (applyCors(req, res)) return

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const subroute = (
    req.query?.subroute ||
    urlObj.searchParams.get('subroute') ||
    urlObj.pathname.replace(/^\/api\/payouts\/?/, '')
  ).toLowerCase().trim()

  // Audit Point 2: Require valid Supabase server-side authentication
  const authUser = await getAuthenticatedUser(req)
  if (!authUser) {
    return sendJson(res, 401, {
      error: 'Authentication required. Payout operations require an active authenticated session.',
    })
  }

  // Audit Point 4: Supabase Database persistence (Zero JSON fallback)
  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in payouts:', clientErr)
    return sendJson(res, 500, {
      error: 'Database connection unavailable. Operation failed securely.',
    })
  }

  const currentUserId = authUser.id

  // 1. SETTINGS: Manage creator's payout credentials
  if (subroute === 'settings' || subroute.includes('settings')) {
    if (req.method === 'GET') {
      try {
        const { data: dbSettings, error } = await supabase
          .from('payout_settings')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle()

        if (error) {
          console.error('Database error querying payout_settings:', error.message)
          return sendJson(res, 500, { error: 'Database error fetching payout settings' })
        }

        const settings = dbSettings
          ? {
              stripeAccountId: dbSettings.stripe_account_id || '',
              stripeConnected: dbSettings.stripe_status === 'active',
              stripeStatus: dbSettings.stripe_status || 'not_connected',
              payoutMethod: dbSettings.method || 'stripe',
              accountHolder: dbSettings.account_holder_name || '',
              bankName: dbSettings.bank_name || '',
              iban: dbSettings.iban || '',
              moroccoRib: dbSettings.rib || '',
            }
          : {
              stripeAccountId: '',
              stripeConnected: false,
              stripeStatus: 'not_connected',
              payoutMethod: 'stripe',
              accountHolder: '',
              bankName: '',
              iban: '',
              moroccoRib: '',
            }

        return sendJson(res, 200, { success: true, settings })
      } catch (err) {
        console.error('Unexpected error in GET payout_settings:', err)
        return sendJson(res, 500, { error: 'Internal server error' })
      }
    }

    if (req.method === 'POST') {
      try {
        const payload = await parseBody(req)
        const newSettings = payload.settings || {}

        const hasStripeAccount = Boolean(newSettings.stripeAccountId && newSettings.stripeAccountId.trim())
        const stripeStatus = hasStripeAccount
          ? (newSettings.stripeStatus || 'pending_verification')
          : 'not_connected'

        const { data, error } = await supabase
          .from('payout_settings')
          .upsert(
            {
              user_id: currentUserId,
              method: newSettings.payoutMethod || 'stripe',
              rib: newSettings.moroccoRib || '',
              iban: newSettings.iban || '',
              bank_name: newSettings.bankName || newSettings.moroccoBankName || '',
              account_holder_name: newSettings.accountHolder || '',
              stripe_account_id: newSettings.stripeAccountId || '',
              stripe_status: stripeStatus,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single()

        if (error) {
          console.error('Database error saving payout_settings:', error.message)
          return sendJson(res, 500, { error: 'Database error saving payout settings' })
        }

        return sendJson(res, 200, { success: true, settings: data })
      } catch (err) {
        console.error('Unexpected error in POST payout_settings:', err)
        return sendJson(res, 500, { error: 'Internal server error' })
      }
    }
  }

  // 2. STATS: Fetch real-time creator sales, orders, and wallet balance
  if (subroute === 'stats' || subroute.includes('stats')) {
    try {
      // Query creator profile for verified wallet balance
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('wallet_balance, plan')
        .eq('id', currentUserId)
        .single()

      if (profErr) {
        console.error('Database error querying profile in stats:', profErr.message)
        return sendJson(res, 500, { error: 'Database error fetching creator profile' })
      }

      // Query paid orders
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', currentUserId)
        .order('created_at', { ascending: false })

      if (ordersErr) {
        console.error('Database error querying orders in stats:', ordersErr.message)
        return sendJson(res, 500, { error: 'Database error fetching creator orders' })
      }

      // Query payout requests
      const { data: payoutRequests, error: payoutsErr } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (payoutsErr) {
        console.error('Database error querying payout_requests in stats:', payoutsErr.message)
        return sendJson(res, 500, { error: 'Database error fetching payout requests' })
      }

      let grossSales = 0
      let platformFees = 0
      let netSellerEarnings = 0
      let pendingEarnings = 0
      let totalWithdrawn = 0

      for (const ord of orders || []) {
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

      for (const pr of payoutRequests || []) {
        if (pr.status === 'completed') {
          totalWithdrawn += Number(pr.amount) || 0
        }
      }

      const availableBalance = Number(profile?.wallet_balance) || 0

      return sendJson(res, 200, {
        success: true,
        stats: {
          grossSales: Math.round(grossSales * 100) / 100,
          platformFees: Math.round(platformFees * 100) / 100,
          netSellerEarnings: Math.round(netSellerEarnings * 100) / 100,
          pendingEarnings: Math.round(pendingEarnings * 100) / 100,
          totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
          availableBalance: Math.round(availableBalance * 100) / 100,
          feePercentage: 9,
          sellerPercentage: 91,
          currency: 'EUR',
        },
        transactions: orders || [],
        payoutRequests: payoutRequests || [],
      })
    } catch (err) {
      console.error('Unexpected error in GET stats:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 3. REQUEST: Create withdrawal request with anti-double-spend and balance check
  if (subroute === 'request' || subroute.includes('request')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    try {
      const payload = await parseBody(req)
      const amount = parseFloat(payload.amount) || 0
      const method = payload.method || 'bank'
      const details = payload.details || {}
      const currency = payload.currency || 'EUR'

      if (amount <= 0 || isNaN(amount)) {
        return sendJson(res, 400, { error: 'Invalid payout amount. Amount must be greater than zero.' })
      }

      // Check current verified wallet balance from database
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', currentUserId)
        .single()

      if (profErr || !profile) {
        return sendJson(res, 500, { error: 'Failed to verify account balance' })
      }

      const currentBalance = Number(profile.wallet_balance) || 0
      if (amount > currentBalance) {
        return sendJson(res, 400, {
          error: `Insufficient balance. Available balance is ${currentBalance} ${currency}.`,
        })
      }

      // Prevent concurrent duplicate requests: check for active pending/processing requests
      const { data: activeRequests, error: activeErr } = await supabase
        .from('payout_requests')
        .select('id, status')
        .eq('user_id', currentUserId)
        .in('status', ['pending', 'processing'])

      if (activeErr) {
        return sendJson(res, 500, { error: 'Database error checking pending withdrawal requests' })
      }

      if (activeRequests && activeRequests.length > 0) {
        return sendJson(res, 400, {
          error: 'You already have an active withdrawal request being processed. Please await completion.',
        })
      }

      // Insert new withdrawal request into Supabase
      const { data: newRequest, error: insertErr } = await supabase
        .from('payout_requests')
        .insert({
          user_id: currentUserId,
          amount: Math.round(amount * 100) / 100,
          currency,
          method,
          status: 'pending',
          account_details: details,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('Database error creating payout request:', insertErr.message)
        return sendJson(res, 500, { error: 'Database error creating payout request' })
      }

      return sendJson(res, 200, { success: true, payout: newRequest })
    } catch (err) {
      console.error('Unexpected error in POST payout request:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 4. ADMIN APPROVE: Server-verified administrator approval
  if (subroute.includes('approve')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    try {
      // Check caller admin role in database
      const { data: callerProfile, error: callerErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single()

      if (callerErr || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'superadmin')) {
        return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' })
      }

      const payload = await parseBody(req)
      const payoutId = payload?.payoutId
      if (!payoutId) {
        return sendJson(res, 400, { error: 'Missing payoutId' })
      }

      // Fetch the payout request
      const { data: pr, error: fetchErr } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('id', payoutId)
        .single()

      if (fetchErr || !pr) {
        return sendJson(res, 404, { error: 'Payout request not found' })
      }

      if (pr.status === 'completed') {
        return sendJson(res, 200, { success: true, message: 'Payout request was already completed.' })
      }

      // Mark request completed
      const { data: completedPr, error: updateErr } = await supabase
        .from('payout_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', payoutId)
        .select()
        .single()

      if (updateErr) {
        return sendJson(res, 500, { error: 'Database error updating payout request' })
      }

      // Deduct paid amount from creator's wallet balance
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', pr.user_id)
        .single()

      if (creatorProfile) {
        const updatedBal = Math.max(0, Math.round(((Number(creatorProfile.wallet_balance) || 0) - Number(pr.amount)) * 100) / 100)
        await supabase
          .from('profiles')
          .update({ wallet_balance: updatedBal, updated_at: new Date().toISOString() })
          .eq('id', pr.user_id)
      }

      return sendJson(res, 200, { success: true, payout: completedPr })
    } catch (err) {
      console.error('Unexpected error in admin approve:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 404, { error: 'Unknown payout endpoint' })
}
