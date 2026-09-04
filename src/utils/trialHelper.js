// Helper for calculating 14-day trial status and plan state

export function checkIsOwnerOrVip(user, profile) {
  const email = (user?.email || '').toLowerCase().trim()
  const username = (profile?.username || '').toLowerCase().trim()
  const userId = user?.id || profile?.id || ''

  let localVip = false
  if (typeof localStorage !== 'undefined') {
    localVip =
      localStorage.getItem('linksocio_owner_bypass') === 'true' ||
      (userId && localStorage.getItem(`linksocio_lifetime_${userId}`) === 'true') ||
      (username && localStorage.getItem(`linksocio_lifetime_${username}`) === 'true')
  }

  return (
    email === 'otmank514@gmail.com' ||
    email.includes('otmank514') ||
    username === 'otman' ||
    profile?.plan === 'owner' ||
    profile?.plan === 'lifetime' ||
    profile?.role === 'admin' ||
    profile?.is_admin === true ||
    localVip
  )
}

export function getTrialStatus(user, profile) {
  const userId = user?.id || profile?.id || ''
  const storageKey = userId ? `linksocio_billing_${userId}` : null

  const isOwnerVip = checkIsOwnerOrVip(user, profile)

  let billingData = null
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) billingData = JSON.parse(saved)
    } catch (e) {}
  }

  const planId = profile?.plan || billingData?.planId || 'free_trial'
  const isPaid = isOwnerVip || planId === 'pro' || planId === 'business' || planId === 'lifetime' || planId === 'owner'

  if (isPaid) {
    return {
      isPaid: true,
      planId: isOwnerVip ? 'business' : planId,
      isOwner: isOwnerVip,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 99999,
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
  } else {
    // Brand new or uninitialized session: record 14 days from now
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
