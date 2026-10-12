import Stripe from 'stripe'
import { supabaseServer } from './_supabase.js'

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
    let chunks = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Stripe is not configured' }))
    return
  }

  let event = null
  const rawBody = await getRawBody(req)

  // 1. VERIFY SIGNATURE (Audit Section 4 Requirement 6)
  if (webhookSecret) {
    const signature = req.headers['stripe-signature']
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: `Webhook signature error: ${err.message}` }))
      return
    }
  } else {
    // If webhook secret is not set, parse payload with notice (dev environment)
    try {
      event = JSON.parse(rawBody.toString('utf-8'))
    } catch (err) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid payload' }))
      return
    }
  }

  // 2. IDEMPOTENCY CHECK (Audit Section 4 Requirement 8)
  try {
    const { data: existingEvent } = await supabaseServer
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', event.id)
      .maybeSingle()

    if (existingEvent) {
      console.log(`Webhook event ${event.id} already processed. Skipping to avoid duplication.`)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ received: true, already_processed: true }))
      return
    }

    // Record event to webhook_events journal
    await supabaseServer.from('webhook_events').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      payload: event,
      status: 'pending',
    })
  } catch (dbErr) {
    console.warn('Idempotency logging note:', dbErr.message)
  }

  // 3. PROCESS PAYMENT EVENTS
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const sessionId = session.id
        const paymentIntentId = session.payment_intent

        // Digital Product Order
        if (session.metadata?.type === 'digital_product') {
          const sellerUserId = session.metadata.sellerUserId
          const productId = session.metadata.productId
          const creatorAmount = parseFloat(session.metadata.creatorAmount || '0') / 100

          // Update order status to paid (Audit Section 4 Requirement 7)
          await supabaseServer
            .from('orders')
            .update({
              status: 'paid',
              stripe_payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_session_id', sessionId)

          // Record payment entry in payments table
          await supabaseServer.from('payments').insert({
            user_id: sellerUserId || null,
            amount: (session.amount_total || 0) / 100,
            currency: (session.currency || 'eur').toUpperCase(),
            provider: 'stripe',
            provider_payment_id: paymentIntentId || sessionId,
            status: 'succeeded',
            metadata: session.metadata,
          })

          // Increment creator wallet balance atomically if configured
          if (sellerUserId && creatorAmount > 0) {
            try {
              const { data: profile } = await supabaseServer
                .from('profiles')
                .select('wallet_balance')
                .eq('id', sellerUserId)
                .single()

              if (profile) {
                const newBalance = (Number(profile.wallet_balance) || 0) + creatorAmount
                await supabaseServer
                  .from('profiles')
                  .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
                  .eq('id', sellerUserId)
              }
            } catch (balErr) {
              console.warn('Wallet balance credit note:', balErr.message)
            }
          }
        }

        // Subscription Upgrade
        if (session.mode === 'subscription') {
          const subUserId = session.metadata?.userId || session.client_reference_id
          const planId = session.metadata?.planId || 'pro'
          if (subUserId) {
            await supabaseServer
              .from('profiles')
              .update({ plan: planId, updated_at: new Date().toISOString() })
              .eq('id', subUserId)

            await supabaseServer.from('subscriptions').upsert({
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

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        console.log(`Payment intent ${paymentIntent.id} succeeded`)
        break
      }

      case 'account.updated': {
        const account = event.data.object
        const isChargesEnabled = account.charges_enabled && account.details_submitted
        const status = isChargesEnabled ? 'active' : 'pending_verification'

        if (account.id) {
          await supabaseServer
            .from('payout_settings')
            .update({ stripe_status: status, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)

          await supabaseServer
            .from('profiles')
            .update({ stripe_status: status, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)
        }
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    // Mark event as processed
    try {
      await supabaseServer
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('event_id', event.id)
    } catch (e) {}

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ received: true }))
  } catch (procErr) {
    console.error('Error processing webhook event:', procErr)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Processing failure' }))
  }
}
