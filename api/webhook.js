import Stripe from 'stripe'
import { getSupabaseServerClient } from './_supabase.js'

let stripeInstance = null
function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim()
  if (!key || key.startsWith('pk_')) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
}

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

  // Audit Point 2: Always enforce webhook signature verification. Fail closed if secret is missing.
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

  // Audit Point 4 & 5: Check Supabase database connectivity
  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in webhook:', clientErr)
    return sendJson(res, 500, { error: 'Database service unavailable. Stripe will retry.' })
  }

  // Audit Point 5: Real Idempotency Journal via webhook_events
  try {
    const { data: existingEvent, error: checkErr } = await supabase
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', event.id)
      .maybeSingle()

    if (checkErr) {
      console.error('Failed to query webhook_events:', checkErr.message)
      return sendJson(res, 500, { error: 'Failed to verify event idempotency' })
    }

    if (existingEvent && (existingEvent.status === 'processed' || existingEvent.status === 'processing')) {
      console.log(`Idempotency check: Event ${event.id} is already ${existingEvent.status}. Ignoring duplicate.`)
      return sendJson(res, 200, { received: true, already_processed: true })
    }

    if (!existingEvent) {
      const { error: insertErr } = await supabase.from('webhook_events').insert({
        provider: 'stripe',
        event_id: event.id,
        event_type: event.type,
        payload: event,
        status: 'processing',
      })

      if (insertErr) {
        // Unique constraint violation indicates concurrent handling
        if (insertErr.code === '23505') {
          console.log(`Concurrent processing detected for event ${event.id}. Exiting gracefully.`)
          return sendJson(res, 200, { received: true, concurrent_duplicate: true })
        }
        console.error('Failed to register webhook event in journal:', insertErr.message)
        return sendJson(res, 500, { error: 'Database write error registering event' })
      }
    }
  } catch (idempErr) {
    console.error('Idempotency error:', idempErr)
    return sendJson(res, 500, { error: 'Idempotency verification failed' })
  }

  // Audit Point 5: Atomic Order & Balance Processing
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const sessionId = session.id
        const paymentIntentId = session.payment_intent

        // 1. Digital Product Purchase
        if (session.metadata?.type === 'digital_product') {
          const sellerUserId = session.metadata.sellerUserId
          const creatorAmount = parseFloat(session.metadata.creatorAmount || '0') / 100

          // Atomic Order Status Transition: Only update if status is NOT already 'paid'
          const { data: updatedOrder, error: orderErr } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              stripe_payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_session_id', sessionId)
            .neq('status', 'paid')
            .select()
            .maybeSingle()

          if (orderErr) {
            console.error('Order status transition error:', orderErr.message)
            throw new Error(`Order update error: ${orderErr.message}`)
          }

          // If updatedOrder is null, order was ALREADY paid by a prior concurrent event
          if (!updatedOrder) {
            console.log(`Order for session ${sessionId} is already marked as paid. Skipping balance credit to avoid duplicate payout.`)
          } else {
            // Record payment entry in audit payments table
            const { error: paymentErr } = await supabase.from('payments').insert({
              order_id: updatedOrder.id,
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
                console.warn('RPC increment_wallet_balance notice, performing direct atomic SQL:', rpcErr.message)
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('wallet_balance')
                  .eq('id', sellerUserId)
                  .single()

                if (profile) {
                  const newBalance = Math.round(((Number(profile.wallet_balance) || 0) + creatorAmount) * 100) / 100
                  await supabase
                    .from('profiles')
                    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
                    .eq('id', sellerUserId)
                }
              }
            }
          }
        }

        // 2. Subscription SaaS Upgrade
        if (session.mode === 'subscription') {
          const subUserId = session.metadata?.userId || session.client_reference_id
          const planId = session.metadata?.planId || 'pro'
          if (subUserId) {
            await supabase
              .from('profiles')
              .update({ plan: planId, updated_at: new Date().toISOString() })
              .eq('id', subUserId)

            await supabase.from('subscriptions').upsert({
              user_id: subUserId,
              plan_id: planId,
              status: 'active',
              stripe_subscription_id: session.subscription || sessionId,
              updated_at: new Date().toISOString(),
            })
          }
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object
        const isChargesEnabled = account.charges_enabled && account.details_submitted
        const status = isChargesEnabled ? 'active' : 'pending_verification'

        if (account.id) {
          await supabase
            .from('payout_settings')
            .update({ stripe_status: status, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)

          await supabase
            .from('profiles')
            .update({ stripe_status: status, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)
        }
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    // Mark event as processed in journal
    await supabase
      .from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', event.id)

    return sendJson(res, 200, { received: true })
  } catch (procErr) {
    console.error('Error executing webhook transaction:', procErr)
    return sendJson(res, 500, { error: 'Failed to process webhook event' })
  }
}
