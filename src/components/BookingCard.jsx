import { useState, useMemo } from 'react'
import { getBookingSettings, recordNewBooking } from '../BookingTab'
import { dispatchServerAlert } from '../notificationService'
import confetti from 'canvas-confetti'

export default function BookingCard({ profile, links = [], theme, isEmbedded = false }) {
  const settings = getBookingSettings(profile)

  const [isOpen, setIsOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [confirmedBookingData, setConfirmedBookingData] = useState(null)
  const [error, setError] = useState('')

  const color = theme.accent || '#14B8A6'
  const tint = theme.buttonBg || `${color}1A`

  // Available services
  const services = settings.services && settings.services.length > 0 ? settings.services : []
  const activeService = selectedService || services[0] || {
    title: '1-on-1 Consultation',
    duration: 30,
    price: 'Free',
    platform: 'Google Meet',
  }

  // Generate next 14 available dates based on working_days
  const availableDates = useMemo(() => {
    const dates = []
    const workingDays = settings.working_days || [1, 2, 3, 4, 5]
    const today = new Date()

    let count = 0
    let dayOffset = 1 // Start from tomorrow or today
    while (count < 14 && dayOffset < 35) {
      const d = new Date()
      d.setDate(today.getDate() + dayOffset)
      const dayOfWeek = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

      if (workingDays.includes(dayOfWeek)) {
        const iso = d.toISOString().split('T')[0]
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dates.push({
          dateStr: iso,
          dayLabel,
          monthLabel,
          fullDate: d,
        })
        count++
      }
      dayOffset++
    }
    return dates
  }, [settings.working_days])

  // Generate available time slots based on start_time and end_time
  const availableSlots = useMemo(() => {
    const slots = []
    const startParts = (settings.start_time || '09:00').split(':')
    const endParts = (settings.end_time || '18:00').split(':')

    const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1] || 0, 10)
    const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] || 0, 10)
    const duration = activeService.duration || settings.slot_duration || 30
    const buffer = settings.buffer_time || 10
    const step = duration + buffer

    for (let m = startMinutes; m + duration <= endMinutes; m += step) {
      const h = Math.floor(m / 60)
      const min = m % 60
      const ampm = h >= 12 ? 'PM' : 'AM'
      const displayH = h % 12 === 0 ? 12 : h % 12
      const displayMin = min < 10 ? `0${min}` : min
      const formatted = `${displayH}:${displayMin} ${ampm}`
      slots.push(formatted)
    }
    return slots
  }, [settings.start_time, settings.end_time, settings.buffer_time, activeService.duration])

  // WhatsApp target phone
  let targetPhone = settings.whatsapp_number
  if (!targetPhone) {
    const waLink = links.find(
      (l) => l.label?.toLowerCase().includes('whatsapp') || l.url?.includes('wa.me') || l.url?.includes('whatsapp.com')
    )
    if (waLink?.url) {
      const match = waLink.url.match(/(\d{6,15})/)
      if (match) targetPhone = match[1]
    }
  }
  const cleanTargetPhone = (targetPhone || '').replace(/[^0-9]/g, '')

  if (!settings.enabled) return null

  function handleBookingSubmit(e) {
    e.preventDefault()
    setError('')

    if (!selectedDate) {
      setError('Please select a date from the calendar.')
      return
    }
    if (!selectedTime) {
      setError('Please select a time slot.')
      return
    }
    if (!clientName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!clientPhone.trim() && !clientEmail.trim()) {
      setError('Please provide your WhatsApp phone or email address.')
      return
    }

    const bookingData = {
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      client_phone: clientPhone.trim(),
      service_title: activeService.title,
      service_duration: activeService.duration,
      service_price: activeService.price || 'Free',
      service_platform: activeService.platform || 'Google Meet',
      date: selectedDate,
      time_slot: selectedTime,
      notes: notes.trim(),
    }

    const targetProfile =
      profile ||
      (typeof window !== 'undefined' ? { username: window.location.pathname.replace(/^\//, '').split('/')[0] } : null)

    if (targetProfile) {
      recordNewBooking(targetProfile, bookingData).catch(() => {})
      dispatchServerAlert('booking', bookingData, targetProfile.username, targetProfile.id).catch(() => {})
    }

    setConfirmedBookingData(bookingData)
    setBookingConfirmed(true)

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } })
    } catch (e) {}
  }

  function getGoogleCalendarUrl(bData) {
    if (!bData) return '#'
    const title = encodeURIComponent(`${bData.service_title} with ${profile?.display_name || profile?.username || 'Host'}`)
    const details = encodeURIComponent(
      `Appointment: ${bData.service_title}\nPlatform: ${bData.service_platform}\nHost: ${profile?.display_name || profile?.username}\nNotes: ${bData.notes || 'None'}`
    )
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`
  }

  function getWhatsAppConfirmUrl(bData) {
    if (!bData) return '#'
    const msg = `Hello! I just scheduled an appointment for "${bData.service_title}" on ${bData.date} at ${bData.time_slot}.\nName: ${bData.client_name}\nLooking forward to meeting with you!`
    const encoded = encodeURIComponent(msg)
    return cleanTargetPhone ? `https://wa.me/${cleanTargetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
  }

  function resetForm() {
    setBookingConfirmed(false)
    setConfirmedBookingData(null)
    setSelectedDate('')
    setSelectedTime('')
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setNotes('')
  }

  return (
    <div
      style={{
        marginTop: isEmbedded ? 14 : 20,
        borderRadius: 18,
        border: `1px solid ${color}33`,
        background: theme.cardBg || 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header Bar */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        style={{
          padding: isEmbedded ? '12px 14px' : '16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: isOpen ? `${color}10` : 'transparent',
          transition: 'all 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isEmbedded ? 10 : 12, minWidth: 0, flex: 1, pointerEvents: 'none' }}>
          <span
            style={{
              width: isEmbedded ? 34 : 40,
              height: isEmbedded ? 34 : 40,
              borderRadius: '50%',
              background: tint,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isEmbedded ? 17 : 20,
              flexShrink: 0,
            }}
          >
            🗓️
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isEmbedded ? 13 : 15,
                fontWeight: 700,
                color: theme.textColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {settings.title || 'Book a Consultation'}
            </div>
            <div
              style={{
                fontSize: isEmbedded ? 11 : 12.5,
                color: theme.subTextColor || '#64748B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
              }}
            >
              {settings.subtitle || 'Choose a time slot for 1-on-1 meeting'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          style={{
            background: isOpen ? 'transparent' : color,
            color: isOpen ? color : '#FFFFFF',
            border: isOpen ? `1px solid ${color}` : 'none',
            borderRadius: 100,
            padding: isEmbedded ? '6px 12px' : '8px 16px',
            fontSize: isEmbedded ? 11.5 : 13,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isOpen ? 'Close' : 'Schedule'}
        </button>
      </div>

      {/* Expanded Booking Body */}
      {isOpen && (
        <div style={{ padding: isEmbedded ? '14px 14px 18px' : '18px 18px 22px', borderTop: `1px solid ${color}20` }}>
          {bookingConfirmed ? (
            /* Confirmation Screen */
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#E6F7F5',
                  color: '#0D9488',
                  fontSize: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                ✓
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: theme.textColor }}>
                Booking Confirmed!
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: theme.subTextColor || '#64748B' }}>
                Your appointment has been successfully scheduled.
              </p>

              {/* Booking Summary Box */}
              <div
                style={{
                  background: `${color}0D`,
                  border: `1px solid ${color}30`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  textAlign: 'left',
                  marginBottom: 16,
                  fontSize: 13,
                  color: theme.textColor,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div>🏷️ <strong>Service:</strong> {confirmedBookingData?.service_title} ({confirmedBookingData?.service_duration} mins)</div>
                <div>📅 <strong>Date:</strong> {confirmedBookingData?.date}</div>
                <div>⏰ <strong>Time:</strong> {confirmedBookingData?.time_slot}</div>
                <div>📹 <strong>Location:</strong> {confirmedBookingData?.service_platform}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                  href={getGoogleCalendarUrl(confirmedBookingData)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#2563EB',
                    color: 'white',
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span>📅 Add to Google Calendar</span>
                </a>

                <a
                  href={getWhatsAppConfirmUrl(confirmedBookingData)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#22C55E',
                    color: 'white',
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span>💬 Confirm on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.subTextColor || '#64748B',
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 6,
                    cursor: 'pointer',
                    padding: '8px 0',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  + Book another session
                </button>
              </div>
            </div>
          ) : (
            /* Booking Selection Form */
            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 1. Service Selection (if multiple) */}
              {services.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: theme.textColor, marginBottom: 6 }}>
                    Select Consultation Type:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {services.map((srv) => {
                      const isSelected = activeService.id === srv.id
                      return (
                        <div
                          key={srv.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedService(srv)}
                          style={{
                            border: isSelected ? `2px solid ${color}` : `1px solid ${color}30`,
                            background: isSelected ? `${color}15` : 'rgba(255,255,255,0.06)',
                            borderRadius: 12,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.textColor }}>{srv.title}</div>
                            <div style={{ fontSize: 11.5, color: theme.subTextColor || '#64748B', marginTop: 2 }}>
                              ⏱️ {srv.duration} mins • 📹 {srv.platform || 'Online'}
                            </div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: color }}>{srv.price || 'Free'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. Date Picker (Horizontal Scrolling Chips) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textColor }}>
                    Select a Date:
                  </label>
                  {selectedDate && (
                    <span style={{ fontSize: 11.5, color: color, fontWeight: 700 }}>
                      Selected: {selectedDate}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    paddingBottom: 8,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                  }}
                >
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.dateStr
                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(item.dateStr)}
                        style={{
                          flexShrink: 0,
                          border: isSelected ? `2px solid ${color}` : `1px solid ${color}35`,
                          background: isSelected ? color : 'rgba(255,255,255,0.1)',
                          color: isSelected ? '#FFFFFF' : theme.textColor,
                          borderRadius: 14,
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          minWidth: 58,
                          transition: 'all 0.15s ease',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 10.5, textTransform: 'uppercase', opacity: 0.85, fontWeight: 600 }}>{item.dayLabel}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 800, marginTop: 3 }}>{item.monthLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Time Slot Picker */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textColor }}>
                    Select Time Slot:
                  </label>
                  {selectedTime && (
                    <span style={{ fontSize: 11.5, color: color, fontWeight: 700 }}>
                      Selected: {selectedTime}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isEmbedded ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                    gap: 6,
                    maxHeight: 150,
                    overflowY: 'auto',
                    paddingRight: 4,
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        style={{
                          border: isSelected ? `2px solid ${color}` : `1px solid ${color}35`,
                          background: isSelected ? color : 'rgba(255,255,255,0.1)',
                          color: isSelected ? '#FFFFFF' : theme.textColor,
                          borderRadius: 10,
                          padding: '8px 4px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. Client Contact Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  required
                  placeholder="Your Full Name *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${color}40`,
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#0F172A',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: `1px solid ${color}40`,
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#0F172A',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />

                  <input
                    type="tel"
                    placeholder="WhatsApp Number"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: `1px solid ${color}40`,
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#0F172A',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <textarea
                  rows={2}
                  placeholder="Brief note on what you'd like to discuss..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${color}40`,
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#0F172A',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{ color: '#EF4444', fontSize: 12.5, fontWeight: 600, background: '#FEE2E2', padding: '8px 12px', borderRadius: 8 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  background: color,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: `0 4px 14px ${color}40`,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span>🗓️ Confirm Appointment</span>
                {activeService.price && activeService.price !== 'Free' && (
                  <span>({activeService.price})</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
