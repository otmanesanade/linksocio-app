import Stripe from 'stripe'

let stripeInstance = null
let mockStripeInstance = null

export function __setMockStripe(mock) {
  mockStripeInstance = mock
}

export function getStripe() {
  if (mockStripeInstance !== null) {
    return mockStripeInstance
  }

  const key = (process.env.STRIPE_SECRET_KEY || '').trim()
  if (!key || key.startsWith('pk_')) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
}
