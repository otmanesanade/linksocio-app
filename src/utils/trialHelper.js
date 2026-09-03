// Helper for calculating 14-day trial status and plan state

export function getTrialStatus(user, profile) {
  const userId = user?.id || profile?.id || ''
  const storageKey = userId ? `linksocio_billing_${userId}` : null

  let billingData = null
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) billingData = JSON.parse(saved)
    } catch (e) {}
  }

  const planId = profile?.plan || billingData?.planId || 'free_trial'
  const isPaid = planId === 'pro' || planId === 'business'

  if (isPaid) {
    return {
      isPaid: true,
      planId,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 999,
      trialEndsDate: null,
    }
  }

  // Determine trial dates
  const now = new Date()
  let trialStart = null
  let trialEnd = null

  if (billingData?.trialEndDate) {
    trialEnd = new Date(billingData.trialEndDate)
    trialStart = billingData.trialStartDate ? new Date(billingData.trialStartDate) : new Date(trialEnd.getTime() - 14 * 86400000)
  } else if (profile?.created_at) {
    trialStart = new Date(profile.created_at)
    trialEnd = new Date(trialStart.getTime() + 14 * 86400000)
  } else {
    // Brand new session: record 14 days
    trialStart = now
    trialEnd = new Date(now.getTime() + 14 * 86400000)
    if (storageKey) {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            planId: 'free_trial',
            trialStartDate: trialStart.toISOString(),
            trialEndDate: trialEnd.toISOString(),
            status: 'active',
          })
        )
      } catch (e) {}
    }
  }

  const diffMs = trialEnd.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const isTrialExpired = daysRemaining <= 0

  return {
    isPaid: false,
    planId: 'free_trial',
    isTrialActive: !isTrialExpired,
    isTrialExpired: isTrialExpired,
    daysRemaining: daysRemaining,
    trialEndsDate: trialEnd,
    trialStartDate: trialStart,
  }
}
