import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AvatarUpload from './components/AvatarUpload'
import BillingSettings from './components/BillingSettings'
import { fetchServerProfileMeta, saveServerProfileMeta, getStoredSocials, saveStoredSocials } from './utils/socialPlatforms'
import { useLanguage } from './context/LanguageContext'

export default function SettingsTab({ user, profile, onSaved, initialSubTab = 'profile' }) {
  const { t, isRTL } = useLanguage()
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab)

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab)
    }
  }, [initialSubTab])

  // Profile & Basic Details
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '')
  const [email, setEmail] = useState(() => {
    return profile?.contact_email || profile?.email || user?.email || (typeof window !== 'undefined' && profile?.username && localStorage.getItem(`linksocio_contact_email_${profile.username}`)) || ''
  })

  // Password Update
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' })

  // Profile Save State
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Username validation / checking
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null) // { available: boolean, msg: string }

  useEffect(() => {
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setLocation(profile?.location || '')
    setUsername(profile?.username || '')
    setWhatsapp(profile?.whatsapp || '')
    if (profile?.contact_email || profile?.email || user?.email) {
      setEmail(profile?.contact_email || profile?.email || user?.email || '')
    }

    // Load server-persisted profile metadata across devices
    const cleanU = (profile?.username || '').toLowerCase().trim().replace(/^@/, '')
    fetchServerProfileMeta(cleanU, user?.id).then((meta) => {
      if (meta) {
        if (meta.email) setEmail(meta.email)
        if (meta.whatsapp) setWhatsapp(meta.whatsapp)
        if (meta.location) setLocation(meta.location)
      }
    })
  }, [profile, user])

  const originalUsername = profile?.username || ''
  const isUsernameChanged = username.trim().toLowerCase() !== originalUsername.toLowerCase()

  // Handle Username availability checking
  useEffect(() => {
    if (!isUsernameChanged) {
      setUsernameStatus(null)
      return
    }

    const clean = username.trim().toLowerCase()
    if (clean.length < 3) {
      setUsernameStatus({ available: false, msg: t('settingsTab.usernameMin', 'Username must be at least 3 characters.') })
      return
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
      setUsernameStatus({ available: false, msg: t('settingsTab.usernameRegex', 'Only letters, numbers, hyphens, and underscores allowed.') })
      return
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', clean)
          .maybeSingle()

        if (error) throw error
        if (data && data.id !== user.id) {
          setUsernameStatus({ available: false, msg: `❌ @${clean} ` + t('settingsTab.usernameAlreadyTaken', 'is already taken.') })
        } else {
          setUsernameStatus({ available: true, msg: `✅ @${clean} ` + t('settingsTab.usernameIsAvailable', 'is available!') })
        }
      } catch (err) {
        // Fallback local check
        setUsernameStatus({ available: true, msg: `✅ @${clean} ` + t('settingsTab.usernameLooksGreat', 'looks great!') })
      } finally {
        setUsernameChecking(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username, isUsernameChanged, user.id, t])

  async function handleSaveProfile(e) {
    e?.preventDefault()
    setProfileError('')

    const cleanName = displayName.trim()
    const cleanBio = bio.trim()
    const cleanLocation = location.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanWhatsapp = whatsapp.trim()
    const cleanEmail = email.trim()

    if (!cleanName) {
      setProfileError(t('settingsTab.nameRequired', 'Display Name is required.'))
      return
    }

    if (cleanUsername.length < 3) {
      setProfileError(t('settingsTab.usernameMin', 'Username must be at least 3 characters.'))
      return
    }

    if (usernameStatus && usernameStatus.available === false) {
      setProfileError(t('settingsTab.usernameUnavailable', 'Please choose an available username.'))
      return
    }

    setProfileSaving(true)
    setProfileError('')

    // Only send fields that exist in the Supabase 'profiles' table schema
    const validProfilePayload = {
      id: user.id,
      username: cleanUsername,
      display_name: cleanName,
      bio: cleanBio,
    }

    try {
      // Upsert ensures the profile is created if not already present or updated if existing
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(validProfilePayload)

      if (updateError) {
        setProfileError(
          updateError.message?.includes('unique') || updateError.message?.includes('duplicate')
            ? t('settingsTab.usernameTaken', 'This username is already taken. Please choose another.')
            : updateError.message || t('settingsTab.profileUpdateFailed', 'Failed to update profile.')
        )
        setProfileSaving(false)
        return
      }

      // Persist Location, WhatsApp & Contact Email across devices via server & localStorage
      saveServerProfileMeta(cleanUsername, user.id, {
        email: cleanEmail,
        whatsapp: cleanWhatsapp,
        location: cleanLocation,
      })

      // Sync with Social Icons Top Bar so visitors & mobile users immediately see Email
      if (cleanEmail) {
        try {
          const curSocials = getStoredSocials(cleanUsername, user.id)
          const hasEmailSocial = curSocials.some((s) => s.platformId === 'email')
          if (!hasEmailSocial) {
            const updated = [
              ...curSocials,
              {
                platformId: 'email',
                name: 'Email',
                url: `mailto:${cleanEmail}`,
                rawHandle: cleanEmail,
                active: true,
              },
            ]
            saveStoredSocials(cleanUsername, user.id, updated)
          } else {
            // Update email address in existing social icon if needed
            const updated = curSocials.map((s) => {
              if (s.platformId === 'email') {
                return { ...s, url: `mailto:${cleanEmail}`, rawHandle: cleanEmail, active: true }
              }
              return s
            })
            saveStoredSocials(cleanUsername, user.id, updated)
          }
        } catch (e) {}
      }

      setProfileSaved(true)
      await onSaved()
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      setProfileError(t('settingsTab.profileSaveError', 'Error saving changes. Please try again.'))
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e) {
    e?.preventDefault()
    setPasswordMsg({ text: '', type: '' })

    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ text: t('settingsTab.passMin', 'Password must be at least 6 characters.'), type: 'error' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: t('settingsTab.passMismatch', 'Passwords do not match.'), type: 'error' })
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordMsg({ text: t('settingsTab.passwordUpdated', '✓ Password updated successfully!'), type: 'success' })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg({ text: '', type: '' }), 3500)
    } catch (err) {
      setPasswordMsg({ text: err.message || t('settingsTab.passUpdateError', 'Could not update password.'), type: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    fontSize: 13.5,
    color: '#0F172A',
    background: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: '20px 24px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
          ⚙️ {t('settingsTab.headerTitle', 'Account & Profile Settings')}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
          {t('settingsTab.headerDesc', 'Manage your public username URL, display identity, membership subscription, and security.')}
        </p>
      </div>

      {/* Sub Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: '#E2E8F0',
          padding: 4,
          borderRadius: 14,
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'profile', label: `👤 ${t('settingsTab.profileTab', 'Profile & Identity')}` },
          { key: 'billing', label: `💳 ${t('settingsTab.billingTab', 'Billing & Subscription (Plans / Invoices)')}` },
          { key: 'security', label: `🔒 ${t('settingsTab.securityTab', 'Security & Password')}` },
        ].map((tab) => {
          const isActive = activeSubTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSubTab(tab.key)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 10,
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: isActive ? 'white' : 'transparent',
                color: isActive ? '#0F172A' : '#64748B',
                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* SUB-TAB 1: Billing & Subscription */}
      {activeSubTab === 'billing' && (
        <BillingSettings user={user} profile={profile} onSaved={onSaved} />
      )}

      {/* SUB-TAB 2: Profile & Identity */}
      {activeSubTab === 'profile' && (
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              👤
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                {t('settingsTab.profileDetailsTitle', 'Personal & Page Identity')}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#8A97A3' }}>
                {t('settingsTab.profileDetailsDesc', 'Your public photo, custom username link, and bio')}
              </p>
            </div>
          </div>

          {/* Avatar Upload */}
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
            <AvatarUpload user={user} profile={profile} onUpdated={onSaved} />
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username Field */}
            <div>
              <label htmlFor="settings-username" style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {t('settingsTab.usernameLabel', 'Username & Public Link (URL)')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: isRTL ? 'auto' : 14,
                    right: isRTL ? 14 : 'auto',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#94A3B8',
                    pointerEvents: 'none',
                    direction: 'ltr',
                  }}
                >
                  linksocio.com/
                </span>
                <input
                  id="settings-username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                    setProfileError('')
                  }}
                  placeholder="yourname"
                  style={{
                    ...inputStyle,
                    paddingLeft: isRTL ? 14 : 126,
                    paddingRight: isRTL ? 126 : 14,
                    fontWeight: 600,
                    borderColor: usernameStatus?.available === false ? '#EF4444' : usernameStatus?.available ? '#10B981' : '#E2E8F0',
                  }}
                />
              </div>
              {usernameChecking && (
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748B' }}>
                  {t('settingsTab.checkingUsername', '⏳ Checking username availability...')}
                </p>
              )}
              {usernameStatus && !usernameChecking && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: usernameStatus.available ? '#059669' : '#DC2626',
                  }}
                >
                  {usernameStatus.msg}
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label htmlFor="settings-display-name" style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  {t('settingsTab.displayName', 'Display Name / Brand Title')}
                </label>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{displayName.length}/50</span>
              </div>
              <input
                id="settings-display-name"
                type="text"
                value={displayName}
                maxLength={50}
                onChange={(e) => { setDisplayName(e.target.value); setProfileError('') }}
                placeholder="e.g. Otman | Digital Creator"
                style={inputStyle}
              />
            </div>

            {/* Bio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label htmlFor="settings-bio" style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  {t('settingsTab.bio', 'Bio & Subtitle')}
                </label>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{bio.length}/120</span>
              </div>
              <textarea
                id="settings-bio"
                value={bio}
                maxLength={120}
                rows={2}
                onChange={(e) => { setBio(e.target.value); setProfileError('') }}
                placeholder="Creative designer & consultant · Book an appointment or browse products 👇"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 65, fontFamily: 'inherit' }}
              />
            </div>

            {/* Location, WhatsApp & Contact Email Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label htmlFor="settings-location" style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <span>📍</span> {t('settingsTab.location', 'Location / City')}
                  </label>
                  <span style={{ fontSize: 10.5, color: '#0D9488', fontWeight: 600, background: '#F0FDFA', padding: '1px 7px', borderRadius: 10 }}>
                    {t('common.optional', 'Optional')}
                  </span>
                </div>
                <input
                  id="settings-location"
                  type="text"
                  value={location}
                  maxLength={80}
                  onChange={(e) => { setLocation(e.target.value); setProfileError('') }}
                  placeholder="Optional (e.g. Casablanca, Morocco)"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="settings-whatsapp" style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <span>💬</span> {t('settingsTab.whatsappNumber', 'WhatsApp Number')}
                </label>
                <input
                  id="settings-whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => { setWhatsapp(e.target.value); setProfileError('') }}
                  placeholder="e.g. +212612345678"
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label htmlFor="settings-email" style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <span>✉️</span> {t('settingsTab.contactEmail', 'Public / Contact Email')}
                  </label>
                  <span style={{ fontSize: 10.5, color: '#0D9488', fontWeight: 600, background: '#F0FDFA', padding: '1px 7px', borderRadius: 10 }}>
                    {t('settingsTab.contactBadge', 'Contact card & icons')}
                  </span>
                </div>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setProfileError('') }}
                  placeholder="e.g. OtmanK514@gmail.com"
                  style={inputStyle}
                />
              </div>
            </div>

            {profileError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 12.5 }}>
                {profileError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="submit"
                disabled={profileSaving}
                style={{
                  background: profileSaved ? '#ECFDF5' : '#14B8A6',
                  color: profileSaved ? '#059669' : 'white',
                  border: profileSaved ? '1px solid #A7F3D0' : 'none',
                  borderRadius: 12,
                  padding: '11px 24px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: profileSaving ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: profileSaved ? 'none' : '0 2px 6px rgba(20, 184, 166, 0.25)',
                }}
              >
                {profileSaved
                  ? t('settingsTab.savedSuccess', '✓ Profile Changes Saved!')
                  : profileSaving
                  ? t('common.saving', 'Saving...')
                  : t('settingsTab.saveProfile', 'Save Profile Changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: Security & Password */}
      {activeSubTab === 'security' && (
        <div style={{ background: 'white', border: '1px solid #E7EDEC', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              🔒
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                {t('settingsTab.securityTitle', 'Security & Password')}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#8A97A3' }}>
                {t('settingsTab.securityDesc', 'Update your account login password')}
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
            <div>
              <label htmlFor="settings-new-password" style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {t('settingsTab.newPassword', 'New Password')}
              </label>
              <input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="settings-confirm-password" style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                {t('settingsTab.confirmPassword', 'Confirm New Password')}
              </label>
              <input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                style={inputStyle}
              />
            </div>

            {passwordMsg.text && (
              <div
                style={{
                  background: passwordMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  border: passwordMsg.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                  color: passwordMsg.type === 'success' ? '#065F46' : '#B91C1C',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontSize: 12.5,
                }}
              >
                {passwordMsg.text}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={passwordLoading || !newPassword}
                style={{
                  background: !newPassword ? '#E2E8F0' : '#0F172A',
                  color: !newPassword ? '#94A3B8' : 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !newPassword || passwordLoading ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {passwordLoading
                  ? t('settingsTab.updatingPassword', 'Updating Password...')
                  : t('settingsTab.updatePasswordBtn', 'Update Password')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Card 3: Account Information & Logged in details */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            {t('settingsTab.loggedInAccount', 'Logged in Account')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
            {user?.email || profile?.username || 'LinkSocio Creator'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}>
            {t('settingsTab.activeAccount', 'Active Account ✓')}
          </span>
        </div>
      </div>
    </div>
  )
}
