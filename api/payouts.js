// Server endpoint to manage creator payout settings, statistics, and withdrawal requests with Supabase persistence
import { applyCors, getAuthenticatedUser, getSupabaseServerClient } from './_supabase.js'
import { getStripe } from './_stripe.js'

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

        // PRIORITY 1: Reject manual manipulation of stripeStatus
        if (newSettings.stripeStatus && newSettings.stripeStatus === 'active') {
          return sendJson(res, 400, {
            error: 'Security violation: stripeStatus cannot be manually set to active by client. Account must be verified directly with Stripe.',
          })
        }

        // Fetch existing database settings
        const { data: currentSettings, error: fetchErr } = await supabase
          .from('payout_settings')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle()

        if (fetchErr) {
          console.error('Database error querying existing payout_settings:', fetchErr.message)
          return sendJson(res, 500, { error: 'Database error validating payout settings' })
        }

        let verifiedStripeAccountId = currentSettings?.stripe_account_id || ''
        let verifiedStripeStatus = currentSettings?.stripe_status || 'not_connected'

        // Client submitted a stripeAccountId: verify it directly with Stripe
        if (newSettings.stripeAccountId !== undefined) {
          const submittedId = (newSettings.stripeAccountId || '').trim()

          if (!submittedId) {
            // User disconnecting Stripe
            verifiedStripeAccountId = ''
            verifiedStripeStatus = 'not_connected'
          } else if (submittedId !== currentSettings?.stripe_account_id) {
            // New account ID provided: verify directly with Stripe API
            const stripe = getStripe()
            if (!stripe) {
              return sendJson(res, 500, {
                error: 'Stripe is not configured on the server. Cannot verify submitted stripeAccountId.',
              })
            }

            try {
              const account = await stripe.accounts.retrieve(submittedId)
              if (!account || !account.id) {
                return sendJson(res, 400, {
                  error: 'Stripe account verification failed: Account not found.',
                })
              }

              // Verify account is linked to this authenticated user if metadata exists
              if (account.metadata?.userId && account.metadata.userId !== currentUserId) {
                return sendJson(res, 403, {
                  error: 'Security violation: Stripe account is linked to another user ID.',
                })
              }

              const isChargesEnabled = Boolean(account.charges_enabled && account.details_submitted)
              verifiedStripeStatus = isChargesEnabled ? 'active' : 'pending_verification'
              verifiedStripeAccountId = account.id
            } catch (stripeErr) {
              console.error('Direct Stripe verification failed for account:', submittedId, stripeErr.message)
              return sendJson(res, 400, {
                error: `Unable to verify Stripe account with Stripe API: ${stripeErr.message}`,
              })
            }
          }
        }

        const { data, error } = await supabase
          .from('payout_settings')
          .upsert(
            {
              user_id: currentUserId,
              method: newSettings.payoutMethod || currentSettings?.method || 'stripe',
              rib: newSettings.moroccoRib !== undefined ? newSettings.moroccoRib : (currentSettings?.rib || ''),
              iban: newSettings.iban !== undefined ? newSettings.iban : (currentSettings?.iban || ''),
              bank_name: newSettings.bankName !== undefined ? newSettings.bankName : (currentSettings?.bank_name || ''),
              account_holder_name: newSettings.accountHolder !== undefined ? newSettings.accountHolder : (currentSettings?.account_holder_name || ''),
              stripe_account_id: verifiedStripeAccountId,
              stripe_status: verifiedStripeStatus,
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

        // Also sync verified Stripe status to profile
        await supabase
          .from('profiles')
          .update({
            stripe_account_id: verifiedStripeAccountId,
            stripe_status: verifiedStripeStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUserId)

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
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('wallet_balance, plan')
        .eq('id', currentUserId)
        .single()

      if (profErr) {
        console.error('Database error querying profile in stats:', profErr.message)
        return sendJson(res, 500, { error: 'Database error fetching creator profile' })
      }

      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', currentUserId)
        .order('created_at', { ascending: false })

      if (ordersErr) {
        console.error('Database error querying orders in stats:', ordersErr.message)
        return sendJson(res, 500, { error: 'Database error fetching creator orders' })
      }

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

  // 3. REQUEST: Create withdrawal request with atomic reservation & concurrency prevention
  // STRICT REQUIREMENT 2: Zero non-atomic fallbacks. All financial hold operations MUST use atomic stored procedures.
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

      // ATOMIC POSTGRESQL WITHDRAWAL CREATION & RESERVATION (Strict Fail-Closed)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('create_payout_request_atomic', {
        p_user_id: currentUserId,
        p_amount: Math.round(amount * 100) / 100,
        p_currency: currency,
        p_method: method,
        p_details: details,
      })

      if (rpcErr) {
        const errMsg = rpcErr.message || ''
        console.error('Database RPC error in create_payout_request_atomic:', errMsg)

        if (errMsg.includes('ACTIVE_REQUEST_EXISTS')) {
          return sendJson(res, 400, {
            error: 'You already have an active withdrawal request being processed. Please await completion.',
          })
        }
        if (errMsg.includes('INSUFFICIENT_BALANCE')) {
          return sendJson(res, 400, {
            error: 'Insufficient wallet balance for requested withdrawal.',
          })
        }
        if (errMsg.includes('INVALID_AMOUNT')) {
          return sendJson(res, 400, {
            error: 'Invalid payout amount. Amount must be greater than zero.',
          })
        }

        // STRICT FAIL-CLOSED: Refuse insecure non-atomic fallback
        return sendJson(res, 500, {
          error: 'Withdrawal creation failed safely. Financial operations require verified atomic execution.',
        })
      }

      return sendJson(res, 200, { success: true, payout: rpcData })
    } catch (err) {
      console.error('Unexpected error in POST payout request:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 4. CANCEL: Creator cancels their own pending withdrawal request (Atomic refund)
  if (subroute === 'cancel' || subroute.includes('cancel')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    try {
      const payload = await parseBody(req)
      const payoutId = payload?.payoutId
      if (!payoutId) {
        return sendJson(res, 400, { error: 'Missing payoutId' })
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_payout_request_atomic', {
        p_payout_id: payoutId,
        p_user_id: currentUserId,
      })

      if (rpcErr) {
        const errMsg = rpcErr.message || ''
        console.error('Database RPC error in cancel_payout_request_atomic:', errMsg)
        if (errMsg.includes('CANNOT_CANCEL')) {
          return sendJson(res, 400, { error: 'Only pending payout requests can be cancelled.' })
        }
        if (errMsg.includes('PAYOUT_NOT_FOUND')) {
          return sendJson(res, 404, { error: 'Payout request not found or unauthorized.' })
        }
        return sendJson(res, 500, { error: 'Cancellation failed safely.' })
      }

      return sendJson(res, 200, { success: true, payout: rpcData })
    } catch (err) {
      console.error('Unexpected error in cancel payout request:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 5. ADMIN APPROVE: Server-verified administrator approval with anti-double-approval
  // STRICT REQUIREMENT 2: Zero non-atomic fallbacks.
  if (subroute.includes('approve')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    try {
      const payload = await parseBody(req)
      const payoutId = payload?.payoutId
      if (!payoutId) {
        return sendJson(res, 400, { error: 'Missing payoutId' })
      }

      // Check caller admin role
      const { data: callerProfile, error: callerErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single()

      if (callerErr || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'superadmin')) {
        return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' })
      }

      // ATOMIC POSTGRESQL APPROVAL (Strict Fail-Closed)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('approve_payout_atomic', {
        p_payout_id: payoutId,
        p_admin_id: currentUserId,
      })

      if (rpcErr) {
        const errMsg = rpcErr.message || ''
        console.error('Database RPC error in approve_payout_atomic:', errMsg)

        if (errMsg.includes('ALREADY_COMPLETED')) {
          return sendJson(res, 409, {
            error: 'Payout request is already completed. Double approval prevented.',
          })
        }
        if (errMsg.includes('PAYOUT_NOT_FOUND')) {
          return sendJson(res, 404, { error: 'Payout request not found.' })
        }
        if (errMsg.includes('UNAUTHORIZED_ADMIN')) {
          return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' })
        }
        if (errMsg.includes('INVALID_STATUS')) {
          return sendJson(res, 400, { error: 'Payout request is not in an approvable state.' })
        }

        // STRICT FAIL-CLOSED: Refuse insecure non-atomic fallback
        return sendJson(res, 500, {
          error: 'Payout approval failed safely. Insecure non-atomic operations are strictly forbidden.',
        })
      }

      return sendJson(res, 200, { success: true, payout: rpcData })
    } catch (err) {
      console.error('Unexpected error in admin approve:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 6. ADMIN REJECT: Server-verified administrator rejection with balance refund (Requirement 3)
  if (subroute.includes('reject')) {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    try {
      const payload = await parseBody(req)
      const payoutId = payload?.payoutId
      const reason = payload?.reason || 'Administrative rejection'

      if (!payoutId) {
        return sendJson(res, 400, { error: 'Missing payoutId' })
      }

      // Check caller admin role
      const { data: callerProfile, error: callerErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single()

      if (callerErr || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'superadmin')) {
        return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' })
      }

      // ATOMIC POSTGRESQL REJECTION WITH REFUND (Strict Fail-Closed)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('reject_payout_atomic', {
        p_payout_id: payoutId,
        p_admin_id: currentUserId,
        p_reason: reason,
      })

      if (rpcErr) {
        const errMsg = rpcErr.message || ''
        console.error('Database RPC error in reject_payout_atomic:', errMsg)

        if (errMsg.includes('ALREADY_REJECTED')) {
          return sendJson(res, 409, {
            error: 'Payout request is already rejected.',
          })
        }
        if (errMsg.includes('CANNOT_REJECT_COMPLETED')) {
          return sendJson(res, 409, {
            error: 'Completed payout cannot be rejected.',
          })
        }
        if (errMsg.includes('PAYOUT_NOT_FOUND')) {
          return sendJson(res, 404, { error: 'Payout request not found.' })
        }
        if (errMsg.includes('UNAUTHORIZED_ADMIN')) {
          return sendJson(res, 403, { error: 'Forbidden. Administrator authorization required.' })
        }

        return sendJson(res, 500, {
          error: 'Payout rejection failed safely. Insecure non-atomic operations are strictly forbidden.',
        })
      }

      return sendJson(res, 200, { success: true, payout: rpcData })
    } catch (err) {
      console.error('Unexpected error in admin reject:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 404, { error: 'Unknown payout endpoint' })
}
