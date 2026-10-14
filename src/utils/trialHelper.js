// Helper for calculating 14-day trial status and role authorization

/**
 * Checks if the current authenticated user has administrator privileges.
 * Verifies against owner credentials, email, username, or database role.
 */
export function checkIsAdmin(user, profile) {
  if (checkIsOwner(user, profile)) return true

  const email = (user?.email || user?.user_metadata?.email || profile?.email || '').toLowerCase().trim()
  const role = (profile?.role || '').toLowerCase().trim()
  const isAdminFlag = profile?.is_admin === true

  return (
    email === 'otmank514@gmail.com' ||
    role === 'admin' ||
    role === 'superadmin' ||
    isAdminFlag
  )
}

/**
 * Checks if the current user is the platform owner (Otman).
 * Matches email, username, metadata, or database flags.
 */
export function checkIsOwner(user, profile) {
  const email = (user?.email || user?.user_metadata?.email || profile?.email || '').toLowerCase().trim()
  const username = (profile?.username || user?.user_metadata?.username || '').toLowerCase().trim()
  const userId = user?.id || profile?.id || ''
  const plan = (profile?.plan || '').toLowerCase().trim()

  return (
    email === 'otmank514@gmail.com' ||
    email.includes('otmank514') ||
    username === 'otman' ||
    username === 'otmank514' ||
    userId === '5821c210-9b62-43bb-a5a4-0985c7d0d046' ||
    plan === 'owner' ||
    plan === 'lifetime'
  )
}

/**
 * Checks if the user has an active paid or VIP subscription (Pro, Business, Lifetime, Owner).
 * Ordinary users and new signups return false unless upgraded.
 */
export function checkIsOwnerOrVip(user, profile) {
  if (checkIsOwner(user, profile)) return true
  const plan = (profile?.plan || '').toLowerCase().trim()
  const userId = user?.id || profile?.id || ''
  let localPaid = false
  if (typeof localStorage !== 'undefined' && userId) {
    try {
      localPaid = localStorage.getItem(`linksocio_lifetime_${userId}`) === 'true'
    } catch (e) {}
  }
  return plan === 'pro' || plan === 'business' || plan === 'lifetime' || plan === 'owner' || localPaid
}

export function getTrialStatus(user, profile) {
  const userId = user?.id || profile?.id || ''
  const storageKey = userId ? `linksocio_billing_${userId}` : null

  // 1. Check Owner status (Otman has permanent 100% free lifetime access)
  const isOwner = checkIsOwner(user, profile)
  if (isOwner) {
    return {
      isPaid: true,
      planId: 'owner',
      isOwner: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 99999,
      trialEndsDate: null,
    }
  }

  // 2. Check legitimate database paid plan
  const dbPlan = (profile?.plan || '').toLowerCase().trim()
  const isPaidDbPlan = dbPlan === 'pro' || dbPlan === 'business' || dbPlan === 'lifetime'
  if (isPaidDbPlan) {
    return {
      isPaid: true,
      planId: dbPlan,
      isOwner: false,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 99999,
      trialEndsDate: null,
    }
  }

  let billingData = null
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) billingData = JSON.parse(saved)
    } catch (e) {}
  }

  const localPlan = (billingData?.planId || '').toLowerCase().trim()
  const isPaidLocal = localPlan === 'pro' || localPlan === 'business' || localPlan === 'lifetime'
  if (isPaidLocal) {
    return {
      isPaid: true,
      planId: localPlan,
      isOwner: false,
      isTrialActive: false,
      isTrialExpired: false,
      daysRemaining: 99999,
      trialEndsDate: null,
    }
  }

  // 3. Regular user 14-day free trial
  const now = new Date()
  let trialStart = null
  let trialEnd = null

  if (billingData?.trialEndDate) {
    trialEnd = new Date(billingData.trialEndDate)
    trialStart = billingData.trialStartDate ? new Date(billingData.trialStartDate) : new Date(trialEnd.getTime() - 14 * 86400000)
  } else {
    // Brand new trial: record 14 days from now scoped strictly to userId
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
    isOwner: false,
    isTrialActive: !isTrialExpired,
    isTrialExpired: isTrialExpired,
    daysRemaining: daysRemaining,
    trialEndsDate: trialEnd,
    trialStartDate: trialStart,
  }
}
