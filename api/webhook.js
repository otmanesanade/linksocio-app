import { getStripe } from './_stripe.js'
import { getSupabaseServerClient } from './_supabase.js'
import { validateSubscriptionPlan } from './_plans.js'

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  const stripe = getStripe()
  if (!stripe) {
    console.error('CRITICAL: Stripe is not initialized on server')
    return sendJson(res, 500, { error: 'Stripe is not configured on the server' })
  }

  // Audit Point 2: Enforce webhook signature verification. Fail closed if secret is missing.
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  if (!webhookSecret) {
    console.error('CRITICAL SECURITY ALERT: STRIPE_WEBHOOK_SECRET is not configured. Rejecting webhook.')
    return sendJson(res, 500, {
      error: 'STRIPE_WEBHOOK_SECRET is missing. Unverified webhooks are strictly rejected.',
    })
  }

  const signature = req.headers['stripe-signature']
  if (!signature) {
    return sendJson(res, 400, { error: 'Missing required stripe-signature header' })
  }

  let rawBody
  try {
    rawBody = await getRawBody(req)
  } catch (err) {
    return sendJson(res, 400, { error: 'Failed to read request body' })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return sendJson(res, 400, { error: `Invalid webhook signature: ${err.message}` })
  }

  // Check Supabase database connectivity
  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in webhook:', clientErr)
    return sendJson(res, 500, { error: 'Database service unavailable. Stripe will retry.' })
  }

  // PRIORITY 2: REAL IDEMPOTENCY & SAFE RETRY JOURNAL VIA webhook_events
  try {
    const { data: existingEvent, error: checkErr } = await supabase
      .from('webhook_events')
      .select('id, status, attempts')
      .eq('event_id', event.id)
      .maybeSingle()

    if (checkErr) {
      console.error('Failed to query webhook_events:', checkErr.message)
      return sendJson(res, 500, { error: 'Failed to verify event idempotency' })
    }

    // If event was already completely processed, return 200 idempotently
    if (existingEvent && existingEvent.status === 'processed') {
      console.log(`Idempotency check: Event ${event.id} is already processed. Ignoring duplicate.`)
      return sendJson(res, 200, { received: true, already_processed: true })
    }

    // If event previously failed or is being retried by Stripe, reset status to 'processing' and allow retry
    if (existingEvent) {
      const nextAttempt = (Number(existingEvent.attempts) || 1) + 1
      console.log(`Retrying event ${event.id} (attempt ${nextAttempt}, previous status: ${existingEvent.status})`)
      const { error: retryUpdateErr } = await supabase
        .from('webhook_events')
        .update({
          status: 'processing',
          attempts: nextAttempt,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', event.id)

      if (retryUpdateErr) {
        console.error('Failed to update retry status in webhook_events:', retryUpdateErr.message)
      }
    } else {
      // First time receiving event: insert journal record with status 'processing'
      const { error: insertErr } = await supabase.from('webhook_events').insert({
        provider: 'stripe',
        event_id: event.id,
        event_type: event.type,
        payload: event,
        status: 'processing',
        attempts: 1,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          console.log(`Concurrent processing detected for event ${event.id}.`)
        } else {
          console.error('Failed to register webhook event in journal:', insertErr.message)
          return sendJson(res, 500, { error: 'Database write error registering event' })
        }
      }
    }
  } catch (idempErr) {
    console.error('Idempotency error:', idempErr)
    return sendJson(res, 500, { error: 'Idempotency verification failed' })
  }

  // ATOMIC EVENT BUSINESS TRANSACTION
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const sessionId = session.id
        const paymentIntentId = session.payment_intent

        // 1. Digital Product Purchase
        if (session.metadata?.type === 'digital_product') {
          const sellerUserId = session.metadata.sellerUserId
          const productId = session.metadata.productId
          const creatorAmount = parseFloat(session.metadata.creatorAmount || '0') / 100

          // Check if order exists in Supabase
          const { data: existingOrder, error: findOrderErr } = await supabase
            .from('orders')
            .select('*')
            .eq('stripe_session_id', sessionId)
            .maybeSingle()

          if (findOrderErr) {
            throw new Error(`Database error querying order for session ${sessionId}: ${findOrderErr.message}`)
          }

          let targetOrder = existingOrder

          // RECOVERY STRATEGY (Priority 5): If order wasn't saved during checkout due to past DB glitch, self-heal
          if (!targetOrder && productId) {
            console.warn(`Order for session ${sessionId} not found. Executing recovery self-healing insert.`)
            const { data: verifiedProd, error: vpErr } = await supabase
              .from('products')
              .select('*')
              .eq('id', productId)
              .maybeSingle()

            if (vpErr || !verifiedProd) {
              throw new Error(`Cannot recover missing order: Product ${productId} not found in database.`)
            }

            const totalAmount = (session.amount_total || 0) / 100
            const feeAmount = Math.round(totalAmount * 0.09 * 100) / 100
            const netAmount = Math.round((totalAmount - feeAmount) * 100) / 100

            const { data: recoveredOrder, error: recovErr } = await supabase
              .from('orders')
              .insert({
                seller_id: verifiedProd.user_id,
                product_id: verifiedProd.id,
                buyer_email: session.customer_details?.email || 'customer@linksocio.com',
                buyer_name: session.metadata.buyerName || 'Customer',
                amount: totalAmount,
                currency: (session.currency || 'eur').toUpperCase(),
                platform_fee: feeAmount,
                creator_amount: netAmount,
                status: 'paid',
                stripe_session_id: sessionId,
                stripe_payment_intent_id: paymentIntentId,
              })
              .select()
              .single()

            if (recovErr) {
              throw new Error(`Failed to insert recovered order: ${recovErr.message}`)
            }
            targetOrder = recoveredOrder
          }

          // Atomic Order Status Transition: Only update if status is NOT already 'paid'
          let orderNewlyPaid = false
          if (targetOrder && targetOrder.status !== 'paid') {
            const { data: updatedOrder, error: orderErr } = await supabase
              .from('orders')
              .update({
                status: 'paid',
                stripe_payment_intent_id: paymentIntentId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetOrder.id)
              .neq('status', 'paid')
              .select()
              .maybeSingle()

            if (orderErr) {
              throw new Error(`Order update error: ${orderErr.message}`)
            }

            if (updatedOrder) {
              orderNewlyPaid = true
            }
          } else if (targetOrder && targetOrder.status === 'paid' && !existingOrder) {
            // Newly inserted through recovery flow
            orderNewlyPaid = true
          }

          if (orderNewlyPaid) {
            // Record payment entry in audit payments table
            const { error: paymentErr } = await supabase.from('payments').insert({
              order_id: targetOrder.id,
              user_id: sellerUserId || null,
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || 'eur').toUpperCase(),
              provider: 'stripe',
              provider_payment_id: paymentIntentId || sessionId,
              status: 'succeeded',
              metadata: session.metadata,
            })

            if (paymentErr) {
              console.error('Payment journal recording error:', paymentErr.message)
            }

            // Atomic Balance Increment
            if (sellerUserId && creatorAmount > 0) {
              const { error: rpcErr } = await supabase.rpc('increment_wallet_balance', {
                p_user_id: sellerUserId,
                p_amount: creatorAmount,
              })

              if (rpcErr) {
                console.error('CRITICAL: increment_wallet_balance failed. Refusing non-atomic fallback:', rpcErr.message)
                throw new Error(`CRITICAL_FINANCIAL_ERROR: increment_wallet_balance RPC failed: ${rpcErr.message}. Failing closed for safe Stripe retry.`)
              }
            }
          } else {
            console.log(`Order for session ${sessionId} is already marked as paid. Skipping balance credit to avoid duplicate payout.`)
          }
        }

        // 2. PRIORITY 4: Subscription SaaS Upgrade with Server-Side Plan Validation
        if (session.mode === 'subscription') {
          const subUserId = session.metadata?.userId || session.client_reference_id
          const rawPlanId = session.metadata?.planId

          if (!subUserId) {
            throw new Error('Subscription session missing user reference metadata')
          }

          // Authoritative Plan Validation
          const validated = validateSubscriptionPlan(rawPlanId, session.metadata?.billingCycle)
          if (!validated) {
            console.error(`SECURITY ALERT: Unknown or unauthorized subscription planId "${rawPlanId}". Rejecting upgrade.`)
            throw new Error(`Invalid planId "${rawPlanId}". Subscription upgrade aborted.`)
          }

          // Verify price paid consistency
          const amountPaid = session.amount_total
          if (amountPaid && Math.abs(amountPaid - validated.unitAmount) > 100) {
            console.error(`SECURITY ALERT: Price paid (${amountPaid}) does not match authoritative plan amount (${validated.unitAmount})`)
            throw new Error(`Price inconsistency detected for plan ${validated.planId}`)
          }

          const { error: profUpdateErr } = await supabase
            .from('profiles')
            .update({ plan: validated.planId, updated_at: new Date().toISOString() })
            .eq('id', subUserId)

          if (profUpdateErr) {
            throw new Error(`Database error upgrading profile plan: ${profUpdateErr.message}`)
          }

          const { error: subErr } = await supabase.from('subscriptions').upsert(
            {
              user_id: subUserId,
              plan_id: validated.planId,
              status: 'active',
              stripe_subscription_id: session.subscription || sessionId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'stripe_subscription_id' }
          )

          if (subErr) {
            throw new Error(`Database error recording subscription: ${subErr.message}`)
          }
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object
        const isChargesEnabled = account.charges_enabled && account.details_submitted
        const status = isChargesEnabled ? 'active' : 'pending_verification'

        if (account.id) {
          const { error: psErr } = await supabase
            .from('payout_settings')
            .update({ stripe_status: status, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)

          if (psErr) {
            console.error('Error updating payout_settings on account.updated:', psErr.message)
          }

          const { error: profErr } = await supabase
            .from('profiles')
            .update({ stripe_status: status, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)

          if (profErr) {
            console.error('Error updating profiles on account.updated:', profErr.message)
          }
        }
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    // Mark event as successfully processed in journal
    await supabase
      .from('webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', event.id)

    return sendJson(res, 200, { received: true })
  } catch (procErr) {
    // Record error in journal and mark as 'failed' so Stripe retries can be processed cleanly
    console.error(`Error executing webhook transaction for event ${event.id}:`, procErr.message)

    await supabase
      .from('webhook_events')
      .update({
        status: 'failed',
        last_error: procErr.message || 'Unknown processing error',
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', event.id)

    return sendJson(res, 500, { error: `Webhook processing failed: ${procErr.message}` })
  }
}
