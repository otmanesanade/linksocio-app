/**
 * Authoritative SaaS Subscription Plan Definitions & Server-Side Validator
 * Enforces strict pricing consistency and rejects unknown/unauthorized plan IDs.
 */

export const ALLOWED_PLANS = {
  creator: {
    id: 'creator',
    name: 'Creator',
    monthlyPrice: 4.99,
    yearlyPrice: 49.90,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 4.99,
    yearlyPrice: 49.90,
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyPrice: 11.99,
    yearlyPrice: 119.88,
  },
}

/**
 * Validates and binds planId and billingCycle strictly against authoritative server catalog.
 * Returns null if planId is unknown or invalid.
 */
export function validateSubscriptionPlan(planId, billingCycle = 'monthly') {
  if (!planId || typeof planId !== 'string') return null
  const normalizedId = planId.toLowerCase().trim()
  const plan = ALLOWED_PLANS[normalizedId]
  if (!plan) return null

  const isYearly = (billingCycle || '').toLowerCase().trim() === 'yearly'
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice
  const unitAmount = Math.round(price * 100)

  return {
    plan,
    planId: plan.id,
    planName: plan.name,
    billingCycle: isYearly ? 'yearly' : 'monthly',
    price,
    unitAmount,
  }
}
