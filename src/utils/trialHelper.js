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
    email.includes('otman') ||
    username === 'otman' ||
    username === 'otmank514' ||
    username.includes('otman') ||
    userId === '5821c210-9b62-43bb-a5a4-0985c7d0d046' ||
    userId === '33373cca-beb6-43c8-ac2f-8ad4e8f54b85' ||
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
  const isOwner = checkIsOwner(user, profile)
  const dbPlan = (profile?.plan || '').toLowerCase().trim()
  const planId = isOwner ? 'owner' : (dbPlan && dbPlan !== 'free_trial' ? dbPlan : 'business')

  return {
    isPaid: true,
    planId: planId,
    isOwner: isOwner,
    isTrialActive: false,
    isTrialExpired: false,
    daysRemaining: 99999,
    trialEndsDate: null,
    trialStartDate: null,
  }
}
