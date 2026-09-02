// LinkSocio - WhatsApp & Email Alert System

export const DEFAULT_NOTIFICATION_SETTINGS = {
  whatsapp_enabled: true,
  whatsapp_number: '',
  email_enabled: true,
  notification_email: '',
  alert_on_booking: true,
  alert_on_inquiry: true,
  sound_enabled: true,
  client_email_receipt: true,
  whatsapp_templates: {
    booking_alert: '🚨 *New Booking Alert on LinkSocio!* 🗓️\n\n👤 *Client:* {client_name}\n📧 *Email:* {client_email}\n📞 *Phone:* {client_phone}\n🏷️ *Service:* {service_title} ({service_duration} min)\n📅 *Date & Time:* {date} at {time_slot}\n💬 *Notes:* {notes}',
    inquiry_alert: '💬 *New Inquiry on LinkSocio!* 📩\n\n👤 *From:* {client_name}\n📞 *Contact:* {client_phone}\n📝 *Message:* {message}',
    booking_confirmation_client: '✅ *Appointment Confirmed!*\n\nHello {client_name}, your consultation for *{service_title}* has been confirmed for *{date}* at *{time_slot}*.\n📹 Platform: {service_platform}\n👤 Host: {host_name}\nLooking forward to speaking with you!',
    booking_reminder_client: '⏰ *Meeting Reminder:*\n\nHi {client_name}, this is a reminder for your upcoming session *{service_title}* on *{date}* at *{time_slot}*.\nSee you soon!',
    inquiry_reply_client: '👋 Hello {client_name}!\n\nThank you for reaching out via LinkSocio regarding: "{message}".\n\nI would be delighted to assist you with your project!',
  },
}

export function getNotificationSettings(profile) {
  if (!profile) return DEFAULT_NOTIFICATION_SETTINGS

  try {
    const idKey = profile.id ? `linksocio_notifications_${profile.id}` : null
    const userKey = profile.username ? `linksocio_notifications_${profile.username}` : null
    let parsed = null
    const stored = (idKey && localStorage.getItem(idKey)) || (userKey && localStorage.getItem(userKey))
    if (stored) {
      try {
        parsed = JSON.parse(stored)
      } catch (e) {}
    }

    const defaultPhone = profile.whatsapp_number || profile._bookingSettings?.whatsapp_number || profile._inquirySettings?.whatsapp_number || ''
    const defaultEmail = profile.email || ''

    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      whatsapp_number: defaultPhone,
      notification_email: defaultEmail,
      ...(parsed || {}),
      whatsapp_templates: {
        ...DEFAULT_NOTIFICATION_SETTINGS.whatsapp_templates,
        ...(parsed?.whatsapp_templates || {}),
      },
    }
  } catch (e) {
    return DEFAULT_NOTIFICATION_SETTINGS
  }
}

export async function fetchServerNotificationSettings(username, userId) {
  if (!username && !userId) return null
  try {
    const query = username ? `username=${encodeURIComponent(username)}` : `userId=${encodeURIComponent(userId)}`
    const res = await fetch(`/api/notification-settings?${query}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.settings) {
        return data.settings
      }
    }
  } catch (e) {}
  return null
}

export function saveNotificationSettingsLocally(profile, settings) {
  if (!profile) return
  try {
    const dataStr = JSON.stringify(settings)
    if (profile.id) localStorage.setItem(`linksocio_notifications_${profile.id}`, dataStr)
    if (profile.username) localStorage.setItem(`linksocio_notifications_${profile.username}`, dataStr)
  } catch (e) {}

  // Sync to backend server
  try {
    fetch('/api/notification-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: profile.username || '',
        userId: profile.id || '',
        settings,
      }),
    }).catch(() => {})
  } catch (e) {}
}

// Web Audio API chime bell sound for instant audible alerts
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now) // A5 note
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15) // E6 note

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(440, now)
    osc2.frequency.exponentialRampToValueAtTime(660, now + 0.15)

    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.6)
    osc2.stop(now + 0.6)
  } catch (e) {
    // Audio may be blocked by browser policy until user interacts
  }
}

// Format template with variables
export function formatTemplate(templateStr, data = {}) {
  if (!templateStr) return ''
  let result = templateStr
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, value || '—')
  }
  return result
}

// Build WhatsApp Direct Message URL
export function generateWhatsAppUrl(text, phone = '') {
  const cleanPhone = String(phone || '').replace(/[^0-9]/g, '')
  const encoded = encodeURIComponent(text)
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

// Build Mailto URL with subject and preformatted body
export function generateMailtoUrl(email, subject, body) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Dispatch alert to server (for email logs, webhook dispatches, and dashboard toasts)
export async function dispatchServerAlert(type, payload, targetUsername, targetUserId) {
  try {
    const res = await fetch('/api/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type, // 'booking' | 'inquiry' | 'test'
        username: targetUsername,
        userId: targetUserId,
        data: payload,
      }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}
