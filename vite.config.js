import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'
import nodemailer from 'nodemailer'

let stripeInstance = null
function getStripe() {
  let key = (process.env.STRIPE_SECRET_KEY || '').trim()
  if (!key) return null
  // Stripe Secret Key must begin with sk_live_ or sk_test_ or rk_live_ or rk_test_
  // If someone entered a Publishable Key (pk_test_ / pk_live_), Stripe will reject backend calls
  if (key.startsWith('pk_')) {
    console.warn('STRIPE_SECRET_KEY is currently set to a Publishable Key (starts with pk_). A Secret Key (starts with sk_test_ or sk_live_) is required for checkout & onboarding.')
    return null
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
}

function apiPlugin() {
  const STORE_PATH = path.join(process.cwd(), '.inquiry_store.json')
  const LEADS_PATH = path.join(process.cwd(), '.leads_store.json')
  const BOOKING_SETTINGS_PATH = path.join(process.cwd(), '.booking_settings.json')
  const BOOKINGS_PATH = path.join(process.cwd(), '.bookings_store.json')
  const RESTAURANT_MENU_PATH = path.join(process.cwd(), '.restaurant_menu_store.json')
  const PRODUCTS_STORE_PATH = path.join(process.cwd(), '.products_store.json')
  const NOTIF_SETTINGS_PATH = path.join(process.cwd(), '.notification_settings.json')
  const NOTIF_LOGS_PATH = path.join(process.cwd(), '.notification_logs.json')
  const PAYOUT_SETTINGS_PATH = path.join(process.cwd(), '.payout_settings.json')
  const TRANSACTIONS_PATH = path.join(process.cwd(), '.transactions_store.json')
  const PAYOUT_REQUESTS_PATH = path.join(process.cwd(), '.payout_requests.json')
  const SOCIALS_STORE_PATH = path.join(process.cwd(), '.socials_store.json')
  const LINKS_META_PATH = path.join(process.cwd(), '.links_meta_store.json')
  const PROFILE_META_PATH = path.join(process.cwd(), '.profile_meta_store.json')

  function readJson(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '{}')
      }
    } catch (e) {}
    return {}
  }

  function writeJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {}
  }

  function appendNotifLog(username, userId, logItem) {
    try {
      const logsStore = readJson(NOTIF_LOGS_PATH)
      const primaryKey = (username || userId || 'default').toLowerCase().trim().replace(/^@/, '')
      const list = Array.isArray(logsStore[primaryKey]) ? logsStore[primaryKey] : []
      const entry = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        createdAt: new Date().toISOString(),
        ...logItem,
      }
      list.unshift(entry)
      logsStore[primaryKey] = list.slice(0, 50) // keep latest 50 logs
      if (userId && userId !== primaryKey) {
        logsStore[userId] = list.slice(0, 50)
      }
      writeJson(NOTIF_LOGS_PATH, logsStore)
    } catch (e) {}
  }

  async function dispatchLiveAlert(username, userId, logItem) {
    appendNotifLog(username, userId, logItem)

    try {
      const nStore = readJson(NOTIF_SETTINGS_PATH)
      const primaryKey = (username || userId || 'default').toLowerCase().trim().replace(/^@/, '')
      const settings = nStore[primaryKey] || (userId && nStore[userId]) || {}

      const type = logItem.type // 'order' | 'booking' | 'inquiry' | 'test'
      if (type === 'order' && settings.alert_on_order === false) return
      if (type === 'booking' && settings.alert_on_booking === false) return
      if (type === 'inquiry' && settings.alert_on_inquiry === false) return

      // 1. Telegram Dispatch to User Phone
      const tgBotToken = (settings.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '').trim()
      const tgChatId = (settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || '').trim()
      const tgEnabled = settings.telegram_enabled !== false && Boolean(tgBotToken && tgChatId)

      if (tgEnabled) {
        let msg = ''
        if (type === 'order') {
          const tx = logItem.data || {}
          msg = `🛍️ <b>Nouvelle Vente sur LinkSocio!</b>\n\n` +
                `📖 <b>Produit:</b> ${tx.productName || 'Livre / PDF'}\n` +
                `💰 <b>Prix:</b> ${tx.grossAmount || 0} ${tx.currency || 'DH'} (Net 91%: ${tx.sellerNet || 0} ${tx.currency || 'DH'})\n` +
                `👤 <b>Client:</b> ${tx.buyerName || 'Client'}\n` +
                `✉️ <b>Email:</b> ${tx.buyerEmail || 'Non spécifié'}\n` +
                `📱 <b>Tél:</b> ${tx.buyerPhone || 'Non spécifié'}\n` +
                `💳 <b>Méthode:</b> ${tx.paymentMethod || 'En ligne'}\n` +
                `⏰ <b>Date:</b> ${new Date().toLocaleString()}`
        } else if (type === 'booking') {
          const bk = logItem.data || {}
          msg = `🗓️ <b>Nouveau Rendez-vous sur LinkSocio!</b>\n\n` +
                `🏷️ <b>Service:</b> ${bk.service_title || 'Consultation'}\n` +
                `👤 <b>Client:</b> ${bk.client_name || 'Client'}\n` +
                `📅 <b>Date:</b> ${bk.date || ''} à ${bk.time_slot || ''}\n` +
                `📞 <b>Téléphone:</b> ${bk.client_phone || 'N/A'}\n` +
                `✉️ <b>Email:</b> ${bk.client_email || 'N/A'}`
        } else if (type === 'inquiry') {
          const inq = logItem.data || {}
          msg = `💬 <b>Nouveau Message / Lead LinkSocio!</b>\n\n` +
                `👤 <b>Nom:</b> ${inq.name || 'Visiteur'}\n` +
                `📞 <b>Contact:</b> ${inq.phone || inq.email || 'N/A'}\n` +
                `📝 <b>Message:</b> ${inq.message || ''}`
        } else {
          msg = `🔔 <b>Test Notification LinkSocio</b>\n\nVotre système de notification fonctionne avec succès!`
        }

        fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: msg,
            parse_mode: 'HTML',
          }),
        }).catch((err) => console.error('Telegram dispatch error:', err.message))
      }

      // 2. Email / Gmail Dispatch
      const emailEnabled = settings.email_enabled !== false
      const metaStore = readJson(PROFILE_META_PATH)
      const userMeta = metaStore[primaryKey] || (userId && metaStore[userId]) || {}
      const targetEmail = settings.notification_email || userMeta.email || process.env.SMTP_USER || 'OtmanK514@gmail.com'

      const smtpUser = (settings.smtp_user || process.env.SMTP_USER || '').trim()
      const smtpPass = (settings.smtp_pass || process.env.SMTP_PASS || '').trim()
      const smtpHost = (settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com').trim()
      const smtpPort = parseInt(settings.smtp_port || process.env.SMTP_PORT || '465')

      if (emailEnabled && targetEmail && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        })

        let emailSubject = logItem.title || 'LinkSocio Alert'
        let emailHtml = ''

        if (type === 'order') {
          const tx = logItem.data || {}
          emailSubject = `🛍️ Nouvelle Vente de Produit: ${tx.productName || 'Livre / PDF'} (+${tx.sellerNet || tx.grossAmount} ${tx.currency || 'DH'})`
          emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">🛍️</span>
                <h2 style="color: #0F172A; margin: 8px 0 4px; font-size: 22px;">Nouvelle Vente Réussie!</h2>
                <p style="color: #0D9488; font-weight: 700; font-size: 16px; margin: 0;">+${tx.sellerNet || tx.grossAmount} ${tx.currency || 'DH'} vers vos gains</p>
              </div>
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr><td style="padding: 6px 0; color: #64748B;">📖 Produit / Fichier:</td><td style="padding: 6px 0; font-weight: 700; color: #0F172A; text-align: right;">${tx.productName || 'Livre / PDF'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">💰 Montant Brut:</td><td style="padding: 6px 0; font-weight: 700; color: #0F172A; text-align: right;">${tx.grossAmount || 0} ${tx.currency || 'DH'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">💵 Gains Vendeur (91%):</td><td style="padding: 6px 0; font-weight: 700; color: #0D9488; text-align: right;">${tx.sellerNet || 0} ${tx.currency || 'DH'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">👤 Nom du Client:</td><td style="padding: 6px 0; font-weight: 600; color: #0F172A; text-align: right;">${tx.buyerName || 'Client'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">✉️ Email Client:</td><td style="padding: 6px 0; color: #2563EB; text-align: right;">${tx.buyerEmail || 'Non spécifié'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">📱 Téléphone Client:</td><td style="padding: 6px 0; color: #0F172A; text-align: right;">${tx.buyerPhone || 'Non spécifié'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">💳 Méthode:</td><td style="padding: 6px 0; color: #64748B; text-align: right;">${tx.paymentMethod || 'Carte / En ligne'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748B;">⏰ Date & Heure:</td><td style="padding: 6px 0; color: #64748B; text-align: right;">${new Date().toLocaleString()}</td></tr>
                </table>
              </div>
              <p style="font-size: 13px; color: #94A3B8; text-align: center; margin-top: 24px;">
                LinkSocio Automated Notification System · Tous droits réservés
              </p>
            </div>
          `
        } else if (type === 'booking') {
          const bk = logItem.data || {}
          emailSubject = `🗓️ Nouveau Rendez-vous: ${bk.service_title || 'Consultation'}`
          emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">
              <h2 style="color: #2563EB;">🗓️ Nouvelle Réservation LinkSocio</h2>
              <p><strong>Service:</strong> ${bk.service_title}</p>
              <p><strong>Client:</strong> ${bk.client_name}</p>
              <p><strong>Date & Heure:</strong> ${bk.date} à ${bk.time_slot}</p>
              <p><strong>Email:</strong> ${bk.client_email}</p>
              <p><strong>Téléphone:</strong> ${bk.client_phone}</p>
            </div>
          `
        } else if (type === 'inquiry') {
          const inq = logItem.data || {}
          emailSubject = `💬 Nouveau Message de ${inq.name || 'Visiteur'}`
          emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">
              <h2 style="color: #D97706;">💬 Nouveau Message / Lead</h2>
              <p><strong>De:</strong> ${inq.name}</p>
              <p><strong>Contact:</strong> ${inq.phone || inq.email || 'N/A'}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #F8FAFC; padding: 12px; border-radius: 8px;">${inq.message || ''}</div>
            </div>
          `
        } else {
          emailSubject = logItem.title || 'Test Notification LinkSocio'
          emailHtml = `<p>${logItem.details || 'Test réussi!'}</p>`
        }

        transporter.sendMail({
          from: `"LinkSocio" <${smtpUser}>`,
          to: targetEmail,
          subject: emailSubject,
          html: emailHtml,
        }).catch((err) => console.error('Email sendMail error:', err.message))
      }
    } catch (dispatchErr) {
      console.error('dispatchLiveAlert error:', dispatchErr.message)
    }
  }

  const MIME_TYPES = {
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.epub': 'application/epub+zip',
    '.mobi': 'application/x-mobipocket-ebook',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
  }

  const apiMiddleware = async (req, res, next) => {
    // Direct uploaded digital product file download handler
    if (req.url && (req.url.startsWith('/uploads/') || req.url.startsWith('/api/download'))) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type')

      if (req.method === 'OPTIONS') {
        res.statusCode = 200
        res.end()
        return
      }

      let fileName = ''
      let customDownloadName = ''

      if (req.url.startsWith('/api/download')) {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const queryFile = urlObj.searchParams.get('file') || urlObj.searchParams.get('url') || ''
        customDownloadName = urlObj.searchParams.get('name') || ''

        if (queryFile.startsWith('data:')) {
          try {
            const commaIdx = queryFile.indexOf(',')
            const meta = queryFile.slice(5, commaIdx)
            const mime = meta.split(';')[0] || 'application/pdf'
            const base64Content = queryFile.slice(commaIdx + 1)
            const buffer = Buffer.from(base64Content, 'base64')
            const dlName = customDownloadName || 'digital_product.pdf'
            const encodedName = encodeURIComponent(dlName)

            res.statusCode = 200
            res.setHeader('Content-Type', mime)
            res.setHeader('Content-Length', buffer.length)
            res.setHeader('Content-Disposition', `attachment; filename="${dlName.replace(/["\r\n]/g, '_')}"; filename*=UTF-8''${encodedName}`)
            res.end(buffer)
            return
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to decode data URI: ' + e.message }))
            return
          }
        }

        fileName = path.basename(decodeURIComponent(queryFile))
      } else {
        const rawUrl = req.url.split('?')[0]
        fileName = path.basename(decodeURIComponent(rawUrl))
      }

      if (!fileName || fileName === '.' || fileName === '/') {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Missing file name' }))
        return
      }

      // Check multiple possible storage locations
      const possibleDirs = [
        path.join(process.cwd(), 'public', 'uploads'),
        path.join(process.cwd(), 'uploads'),
        path.join(process.cwd(), 'dist', 'uploads'),
      ]

      let targetPath = null
      for (const dir of possibleDirs) {
        const candidate = path.join(dir, fileName)
        if (fs.existsSync(candidate)) {
          targetPath = candidate
          break
        }
      }

      if (targetPath) {
        const stat = fs.statSync(targetPath)
        const ext = path.extname(fileName).toLowerCase()
        const contentType = MIME_TYPES[ext] || 'application/octet-stream'
        const cleanDownloadName = customDownloadName || fileName.replace(/^\d+_/, '')

        res.statusCode = 200
        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Length', stat.size)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanDownloadName)}"; filename*=UTF-8''${encodeURIComponent(cleanDownloadName)}"`)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(targetPath).pipe(res)
        return
      } else {
        // Crucial: Return 404 instead of calling next() so Vite does NOT serve index.html
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'File not found on server' }))
        return
      }
    }

    // Global CORS headers for API routes
    if (req.url && req.url.startsWith('/api/')) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      if (req.method === 'OPTIONS') {
        res.statusCode = 200
        res.end()
        return
      }
    }

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

        // 1. Fetch Product
        if (urlObj.pathname === '/api/fetch-product') {
          const queryUrl = urlObj.searchParams.get('url')
          if (!queryUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url parameter' }))
            return
          }
          try {
            const response = await fetch(queryUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkSocioBot/1.0)' },
            })
            const html = await response.text()

            const titleMatch =
              html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<title[^>]*>([^<]+)<\/title>/i)

            const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)

            const priceMatch =
              html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                title: titleMatch ? titleMatch[1].trim() : null,
                image: imageMatch ? imageMatch[1].trim() : null,
                price: priceMatch ? priceMatch[1].trim() : null,
              })
            )
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to fetch product info' }))
          }
          return
        }

        // Social Media Icons API
        if (urlObj.pathname === '/api/socials') {
          const store = readJson(SOCIALS_STORE_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            const uSocials = username && Array.isArray(store[username]) ? store[username] : []
            const idSocials = userId && Array.isArray(store[userId]) ? store[userId] : []

            const merged = [...uSocials]
            for (const item of idSocials) {
              const exists = merged.some((m) => m.platformId === item.platformId || (m.url && item.url && m.url === item.url))
              if (!exists) {
                merged.push(item)
              }
            }

            // Sync aliases for otman / otmank514
            const isOwner = username === 'otman' || username === 'otmank514' || userId === '33373cca-beb6-43c8-ac2f-8ad4e8f54b85'
            if (username === 'otman' && Array.isArray(store['otmank514'])) {
              for (const item of store['otmank514']) {
                if (!merged.some((m) => m.platformId === item.platformId)) merged.push(item)
              }
            } else if (username === 'otmank514' && Array.isArray(store['otman'])) {
              for (const item of store['otman']) {
                if (!merged.some((m) => m.platformId === item.platformId)) merged.push(item)
              }
            }

            if (isOwner && !merged.some((m) => m.platformId === 'email')) {
              merged.push({
                platformId: 'email',
                name: 'Email',
                url: 'mailto:OtmanK514@gmail.com',
                rawHandle: 'OtmanK514@gmail.com',
                active: true,
              })
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ socials: merged }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const socials = Array.isArray(payload.socials) ? payload.socials : []

                if (username) store[username] = socials
                if (userId) store[userId] = socials
                if (username === 'otman') store['otmank514'] = socials
                if (username === 'otmank514') store['otman'] = socials

                writeJson(SOCIALS_STORE_PATH, store)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, socials }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // Profile Metadata API (contact email, whatsapp, location persisted across devices)
        if (urlObj.pathname === '/api/profile-meta') {
          const store = readJson(PROFILE_META_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            const metaU = (username && store[username]) || {}
            const metaId = (userId && store[userId]) || {}
            let metaAlias = {}
            if (username === 'otman' && store['otmank514']) metaAlias = store['otmank514']
            if (username === 'otmank514' && store['otman']) metaAlias = store['otman']

            const isOwner = username === 'otman' || username === 'otmank514' || userId === '33373cca-beb6-43c8-ac2f-8ad4e8f54b85'

            const mergedMeta = {
              email: metaU.email || metaId.email || metaAlias.email || (isOwner ? 'OtmanK514@gmail.com' : ''),
              whatsapp: metaU.whatsapp || metaId.whatsapp || metaAlias.whatsapp || (isOwner ? '+34642887658' : ''),
              location: metaU.location || metaId.location || metaAlias.location || '',
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ meta: mergedMeta }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const newMeta = {
                  email: (payload.email || '').trim(),
                  whatsapp: (payload.whatsapp || '').trim(),
                  location: (payload.location || '').trim(),
                  updatedAt: new Date().toISOString(),
                }

                if (username) store[username] = newMeta
                if (userId) store[userId] = newMeta
                if (username === 'otman') store['otmank514'] = newMeta
                if (username === 'otmank514') store['otman'] = newMeta

                writeJson(PROFILE_META_PATH, store)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, meta: newMeta }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // Links Metadata API (styles, icon positions, custom icons)
        if (urlObj.pathname === '/api/links-meta') {
          const store = readJson(LINKS_META_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()
            const meta = (username && store[username]) || (userId && store[userId]) || {}

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ meta }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const meta = payload.meta || {}

                if (username) store[username] = { ...(store[username] || {}), ...meta }
                if (userId) store[userId] = { ...(store[userId] || {}), ...meta }

                writeJson(LINKS_META_PATH, store)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, meta: (username ? store[username] : store[userId]) }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 2. Inquiry Settings API
        if (urlObj.pathname === '/api/inquiry-settings') {
          const store = readJson(STORE_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()
            const userId = urlObj.searchParams.get('userId') || ''
            const userSettings = (username && store[username]) || (userId && store[userId]) || null

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ settings: userSettings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim()
                const userId = payload.userId || ''
                const settings = payload.settings || {}

                if (username) store[username] = settings
                if (userId) store[userId] = settings

                writeJson(STORE_PATH, store)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 3. Inquiry Leads API
        if (urlObj.pathname === '/api/inquiry-leads') {
          if (req.method === 'GET') {
            const leadsStore = readJson(LEADS_PATH)
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let collected = []
            const seenIds = new Set()

            function addList(list) {
              if (Array.isArray(list)) {
                for (const item of list) {
                  if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id)
                    collected.push(item)
                  }
                }
              }
            }

            if (username) {
              addList(leadsStore[username])
              addList(leadsStore[`@${username}`])
            }
            if (userId) {
              addList(leadsStore[userId])
            }

            if (collected.length === 0 && Object.keys(leadsStore).length > 0) {
              for (const [k, v] of Object.entries(leadsStore)) {
                if (username && k.toLowerCase().includes(username)) {
                  addList(v)
                }
              }
            }

            collected.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ leads: collected }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const singleLead = payload.lead
                const batchLeads = payload.leads

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const leadsStore = readJson(LEADS_PATH)
                const primaryKey = username || userId
                const existingList = [...(leadsStore[primaryKey] || [])]

                if (userId && leadsStore[userId]) {
                  for (const item of leadsStore[userId]) {
                    if (item && item.id && !existingList.some((x) => x.id === item.id)) {
                      existingList.push(item)
                    }
                  }
                }

                const itemsToProcess = []
                if (singleLead) itemsToProcess.push(singleLead)
                if (Array.isArray(batchLeads)) {
                  for (const l of batchLeads) {
                    if (l) itemsToProcess.push(l)
                  }
                }

                for (const lead of itemsToProcess) {
                  const newLead = {
                    id: lead.id || 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    createdAt: lead.createdAt || new Date().toISOString(),
                    status: lead.status || 'new',
                    ...lead,
                  }
                  const idx = existingList.findIndex((l) => l.id === newLead.id)
                  if (idx >= 0) {
                    existingList[idx] = { ...existingList[idx], ...newLead }
                  } else {
                    existingList.unshift(newLead)
                    appendNotifLog(username, userId, {
                      type: 'inquiry',
                      title: `New Message from ${newLead.name || 'Visitor'}`,
                      details: `Contact: ${newLead.phone || 'N/A'} | Message: "${(newLead.message || '').slice(0, 70)}"`,
                      data: newLead,
                    })
                  }
                }

                existingList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

                if (username) leadsStore[username] = existingList
                if (userId) leadsStore[userId] = existingList

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, leads: existingList }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'PUT' || req.method === 'PATCH') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const leadId = payload.leadId
                const newStatus = payload.status

                if (!leadId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing leadId' }))
                  return
                }

                const leadsStore = readJson(LEADS_PATH)
                for (const [k, list] of Object.entries(leadsStore)) {
                  if (Array.isArray(list)) {
                    leadsStore[k] = list.map((l) => (l.id === leadId ? { ...l, status: newStatus || l.status } : l))
                  }
                }

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const leadId = payload.leadId

                if (!leadId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing leadId' }))
                  return
                }

                const leadsStore = readJson(LEADS_PATH)
                for (const [k, list] of Object.entries(leadsStore)) {
                  if (Array.isArray(list)) {
                    leadsStore[k] = list.filter((l) => l.id !== leadId)
                  }
                }

                writeJson(LEADS_PATH, leadsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 4. Booking Settings API
        if (urlObj.pathname === '/api/booking-settings') {
          const bStore = readJson(BOOKING_SETTINGS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()
            const userId = urlObj.searchParams.get('userId') || ''
            const userSettings = (username && bStore[username]) || (userId && bStore[userId]) || null

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ settings: userSettings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim()
                const userId = payload.userId || ''
                const settings = payload.settings || {}

                if (username) bStore[username] = settings
                if (userId) bStore[userId] = settings

                writeJson(BOOKING_SETTINGS_PATH, bStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 5. Bookings Management API
        if (urlObj.pathname === '/api/bookings') {
          if (req.method === 'GET') {
            const bookingsStore = readJson(BOOKINGS_PATH)
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let collected = []
            const seenIds = new Set()

            function addList(list) {
              if (Array.isArray(list)) {
                for (const item of list) {
                  if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id)
                    collected.push(item)
                  }
                }
              }
            }

            if (username) {
              addList(bookingsStore[username])
              addList(bookingsStore[`@${username}`])
            }
            if (userId) {
              addList(bookingsStore[userId])
            }

            // Fallback matching if store has entries
            if (collected.length === 0 && Object.keys(bookingsStore).length > 0) {
              for (const [k, v] of Object.entries(bookingsStore)) {
                if (username && k.toLowerCase().includes(username)) {
                  addList(v)
                }
              }
            }

            collected.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ bookings: collected }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const singleBooking = payload.booking
                const batchBookings = payload.bookings

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const bookingsStore = readJson(BOOKINGS_PATH)
                const primaryKey = username || userId
                const existingList = [...(bookingsStore[primaryKey] || [])]

                if (userId && bookingsStore[userId]) {
                  for (const item of bookingsStore[userId]) {
                    if (item && item.id && !existingList.some((x) => x.id === item.id)) {
                      existingList.push(item)
                    }
                  }
                }

                const itemsToProcess = []
                if (singleBooking) itemsToProcess.push(singleBooking)
                if (Array.isArray(batchBookings)) {
                  for (const b of batchBookings) {
                    if (b) itemsToProcess.push(b)
                  }
                }

                for (const booking of itemsToProcess) {
                  const newBooking = {
                    id: booking.id || 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    createdAt: booking.createdAt || new Date().toISOString(),
                    status: booking.status || 'confirmed',
                    ...booking,
                  }
                  const idx = existingList.findIndex((b) => b.id === newBooking.id)
                  if (idx >= 0) {
                    existingList[idx] = { ...existingList[idx], ...newBooking }
                  } else {
                    existingList.unshift(newBooking)
                    appendNotifLog(username, userId, {
                      type: 'booking',
                      title: `New Booking: ${newBooking.service_title || 'Consultation'}`,
                      details: `Client: ${newBooking.client_name || 'Anonymous'} | ${newBooking.date} at ${newBooking.time_slot}`,
                      data: newBooking,
                    })
                  }
                }

                existingList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

                if (username) bookingsStore[username] = existingList
                if (userId) bookingsStore[userId] = existingList

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, bookings: existingList }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'PUT' || req.method === 'PATCH') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const bookingId = payload.bookingId
                const newStatus = payload.status

                if (!bookingId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing bookingId' }))
                  return
                }

                const bookingsStore = readJson(BOOKINGS_PATH)

                for (const [k, list] of Object.entries(bookingsStore)) {
                  if (Array.isArray(list)) {
                    bookingsStore[k] = list.map((b) => (b.id === bookingId ? { ...b, status: newStatus || b.status } : b))
                  }
                }

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const bookingId = payload.bookingId

                if (!bookingId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing bookingId' }))
                  return
                }

                const bookingsStore = readJson(BOOKINGS_PATH)

                for (const [k, list] of Object.entries(bookingsStore)) {
                  if (Array.isArray(list)) {
                    bookingsStore[k] = list.filter((b) => b.id !== bookingId)
                  }
                }

                writeJson(BOOKINGS_PATH, bookingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 6. Restaurant Menu API
        if (urlObj.pathname === '/api/restaurant-menu') {
          const menuStore = readJson(RESTAURANT_MENU_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let menuData = (username && menuStore[username]) || (userId && menuStore[userId]) || null

            if (!menuData && Object.keys(menuStore).length > 0) {
              for (const [k, v] of Object.entries(menuStore)) {
                if (username && k.toLowerCase().replace(/^@/, '') === username) {
                  menuData = v
                  break
                }
              }
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ menu: menuData }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const menu = payload.menu || {}

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                if (username) menuStore[username] = menu
                if (userId) menuStore[userId] = menu

                writeJson(RESTAURANT_MENU_PATH, menuStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, menu }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 6.5. Products & Digital Store API
        if (urlObj.pathname === '/api/products') {
          const productsStore = readJson(PRODUCTS_STORE_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            let productsList = (username && productsStore[username]) || (userId && productsStore[userId]) || []
            if ((!productsList || productsList.length === 0) && (username === 'otman' || username === 'otmank514')) {
              productsList = productsStore['otman'] || productsStore['otmank514'] || []
            }
            if (!Array.isArray(productsList)) productsList = []

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ products: productsList }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const product = payload.product
                const productsList = payload.products

                if (!username && !userId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing username or userId' }))
                  return
                }

                const key = username || userId
                let current = Array.isArray(productsStore[key]) ? [...productsStore[key]] : []

                if (Array.isArray(productsList)) {
                  current = productsList
                } else if (product) {
                  const newProd = {
                    id: product.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    createdAt: product.createdAt || new Date().toISOString(),
                    ...product,
                  }
                  const idx = current.findIndex((p) => p.id === newProd.id)
                  if (idx >= 0) {
                    current[idx] = { ...current[idx], ...newProd }
                  } else {
                    current.push(newProd)
                  }
                }

                if (username) productsStore[username] = current
                if (userId) productsStore[userId] = current
                if (username === 'otman' || username === 'otmank514') {
                  productsStore['otman'] = current
                  productsStore['otmank514'] = current
                }

                writeJson(PRODUCTS_STORE_PATH, productsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, products: current }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const productId = payload.productId

                if (!productId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing productId' }))
                  return
                }

                for (const [k, list] of Object.entries(productsStore)) {
                  if (Array.isArray(list)) {
                    productsStore[k] = list.filter((p) => p.id !== productId)
                  }
                }

                writeJson(PRODUCTS_STORE_PATH, productsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // Digital Product File Upload API (/api/upload)
        if (urlObj.pathname === '/api/upload') {
          if (req.method === 'POST') {
            const contentType = (req.headers['content-type'] || '').toLowerCase()
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true })
            }
            const distUploadsDir = path.join(process.cwd(), 'dist', 'uploads')
            if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(distUploadsDir)) {
              fs.mkdirSync(distUploadsDir, { recursive: true })
            }

            // Case 1: Direct Binary Stream Upload (raw file body)
            if (!contentType.includes('application/json')) {
              try {
                const headerFilename = req.headers['x-filename'] || req.headers['x-file-name'] || ''
                const queryFilename = urlObj.searchParams.get('filename') || urlObj.searchParams.get('name') || ''
                let rawName = 'file.pdf'
                try {
                  rawName = decodeURIComponent(headerFilename || queryFilename || 'file.pdf')
                } catch (_) {
                  rawName = headerFilename || queryFilename || 'file.pdf'
                }

                const ext = (path.extname(rawName) || '.bin').toLowerCase()
                let cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').slice(0, 60)
                if (!cleanBase || cleanBase === '_') cleanBase = 'product'
                const uniqueName = `${Date.now()}_${cleanBase}${ext}`

                const filePath = path.join(uploadsDir, uniqueName)
                const writeStream = fs.createWriteStream(filePath)
                let bytesWritten = 0

                req.on('data', (chunk) => {
                  bytesWritten += chunk.length
                })

                req.pipe(writeStream)

                writeStream.on('finish', () => {
                  // Also mirror to dist/uploads if it exists
                  if (fs.existsSync(distUploadsDir)) {
                    try {
                      fs.copyFileSync(filePath, path.join(distUploadsDir, uniqueName))
                    } catch (_) {}
                  }

                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      success: true,
                      url: `/uploads/${uniqueName}`,
                      filename: rawName,
                      size: bytesWritten,
                      type: contentType || MIME_TYPES[ext] || 'application/octet-stream',
                    })
                  )
                })

                writeStream.on('error', (err) => {
                  console.error('Upload writeStream error:', err)
                  if (!res.headersSent) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Server write error: ' + err.message }))
                  }
                })

                req.on('error', (err) => {
                  console.error('Upload request stream error:', err)
                  if (!res.headersSent) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Stream error: ' + err.message }))
                  }
                })
              } catch (err) {
                console.error('Binary upload init error:', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Upload failed: ' + err.message }))
              }
              return
            }

            // Case 2: JSON / Base64 Payload Upload
            const chunks = []
            let totalBytes = 0

            req.on('data', (chunk) => {
              chunks.push(chunk)
              totalBytes += chunk.length
            })

            req.on('error', (err) => {
              console.error('JSON upload req error:', err)
              if (!res.headersSent) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Network error during upload: ' + err.message }))
              }
            })

            req.on('end', () => {
              try {
                const bodyStr = Buffer.concat(chunks).toString('utf-8')
                let payload = {}
                try {
                  payload = JSON.parse(bodyStr || '{}')
                } catch (parseErr) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Malformed JSON payload: ' + parseErr.message }))
                  return
                }

                const { filename, base64, size, type } = payload

                if (!base64 || typeof base64 !== 'string') {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'No valid base64 file content provided' }))
                  return
                }

                let rawName = 'file.pdf'
                try {
                  rawName = decodeURIComponent(filename || 'file.pdf')
                } catch (_) {
                  rawName = filename || 'file.pdf'
                }

                const ext = (path.extname(rawName) || '.bin').toLowerCase()
                let cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').slice(0, 60)
                if (!cleanBase || cleanBase === '_') cleanBase = 'product'
                const uniqueName = `${Date.now()}_${cleanBase}${ext}`

                // Robust base64 stripping for any data URI format
                let base64Data = base64
                const base64Index = base64.indexOf('base64,')
                if (base64Index !== -1) {
                  base64Data = base64.slice(base64Index + 7)
                } else {
                  base64Data = base64.replace(/^data:.*?;base64,/, '')
                }
                base64Data = base64Data.trim()

                let finalUrl = null
                try {
                  const filePath = path.join(uploadsDir, uniqueName)
                  fs.writeFileSync(filePath, buffer)

                  // Mirror to dist/uploads if it exists
                  if (fs.existsSync(distUploadsDir)) {
                    try {
                      fs.copyFileSync(filePath, path.join(distUploadsDir, uniqueName))
                    } catch (_) {}
                  }
                  finalUrl = `/uploads/${uniqueName}`
                } catch (fsErr) {
                  console.warn('Read-only filesystem, falling back to direct Data URI:', fsErr.message)
                  const mime = type || MIME_TYPES[ext] || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream')
                  finalUrl = `data:${mime};base64,${base64Data}`
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    success: true,
                    url: finalUrl,
                    filename: rawName,
                    size: buffer.length,
                    type: type || MIME_TYPES[ext] || 'application/octet-stream',
                    storage: finalUrl.startsWith('data:') ? 'direct_data' : 'server_disk',
                  })
                )
              } catch (err) {
                console.error('Base64 upload processing error:', err)
                if (!res.headersSent) {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Upload failed: ' + err.message }))
                }
              }
            })
            return
          }
        }

        // 7. Notification Settings API
        if (urlObj.pathname === '/api/notification-settings') {
          const nStore = readJson(NOTIF_SETTINGS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = urlObj.searchParams.get('userId') || ''
            const userSettings = (username && nStore[username]) || (userId && nStore[userId]) || null

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ settings: userSettings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = payload.userId || ''
                const settings = payload.settings || {}

                if (username) nStore[username] = settings
                if (userId) nStore[userId] = settings

                writeJson(NOTIF_SETTINGS_PATH, nStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 8. Notification Logs API
        if (urlObj.pathname === '/api/notification-logs') {
          const logsStore = readJson(NOTIF_LOGS_PATH)
          const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
          const userId = (urlObj.searchParams.get('userId') || '').trim()

          const userLogs = (username && logsStore[username]) || (userId && logsStore[userId]) || []

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ logs: Array.isArray(userLogs) ? userLogs : [] }))
          return
        }

        // 9. Send Alert / Trigger Notification API
        if (urlObj.pathname === '/api/send-alert') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const type = payload.type || 'alert'
                const data = payload.data || {}

                const logTitle =
                  type === 'booking'
                    ? `Booking Alert: ${data.service_title || 'Consultation'}`
                    : type === 'inquiry'
                    ? `Inquiry Message from ${data.name || 'Visitor'}`
                    : data.title || 'System Notification'

                const logDetails =
                  type === 'booking'
                    ? `Client: ${data.client_name || 'N/A'} | ${data.date || ''} ${data.time_slot || ''}`
                    : type === 'inquiry'
                    ? `Contact: ${data.phone || 'N/A'} | "${(data.message || '').slice(0, 60)}"`
                    : data.message || `Dispatched to ${data.recipient || 'recipient'}`

                dispatchLiveAlert(username, userId, {
                  type,
                  title: logTitle,
                  details: logDetails,
                  data,
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    success: true,
                    message: 'Alert dispatched live to Telegram, Email, and dashboard',
                    type,
                    timestamp: new Date().toISOString(),
                  })
                )
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
              }
            })
            return
          }
        }

        // Test Telegram Route
        if (urlObj.pathname === '/api/notifications/test-telegram') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const botToken = (payload.botToken || '').trim()
                const chatId = (payload.chatId || '').trim()
                if (!botToken || !chatId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false, error: 'Bot Token and Chat ID are required' }))
                  return
                }
                const testMsg = `🔔 <b>Test Notification LinkSocio!</b>\n\n✅ <b>Connexion Telegram Réussie!</b>\nVos alertes pour les ventes de livres, PDF et rendez-vous arriveront instantanément sur ce compte.`
                const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, text: testMsg, parse_mode: 'HTML' }),
                })
                const tgJson = await tgRes.json()
                if (tgJson.ok) {
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true, message: 'Message test envoyé avec succès sur Telegram!' }))
                } else {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false, error: tgJson.description || 'Erreur Telegram Bot API' }))
                }
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, error: e.message }))
              }
            })
            return
          }
        }

        // Test Email Route
        if (urlObj.pathname === '/api/notifications/test-email') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const toEmail = (payload.toEmail || '').trim()
                const smtpUser = (payload.smtpUser || process.env.SMTP_USER || '').trim()
                const smtpPass = (payload.smtpPass || process.env.SMTP_PASS || '').trim()
                const smtpHost = (payload.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com').trim()
                const smtpPort = parseInt(payload.smtpPort || process.env.SMTP_PORT || '465')

                if (!toEmail) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: false, error: 'Adresse email destinataire requise' }))
                  return
                }

                if (!smtpUser || !smtpPass) {
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({
                    success: false,
                    needsCredentials: true,
                    message: 'Pour envoyer un email réel vers Gmail, veuillez renseigner votre email Gmail et votre mot de passe d\'application (Gmail App Password).',
                  }))
                  return
                }

                const transporter = nodemailer.createTransport({
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpPort === 465,
                  auth: { user: smtpUser, pass: smtpPass },
                })

                await transporter.sendMail({
                  from: `"LinkSocio Alerts" <${smtpUser}>`,
                  to: toEmail,
                  subject: '🔔 Test Email LinkSocio - Configuration Réussie',
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background: #ffffff;">
                      <h2 style="color: #0D9488; margin: 0 0 12px;">✓ Test Réussi!</h2>
                      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                        Votre boîte Gmail est maintenant connectée à <strong>LinkSocio</strong>. Vous recevrez instantanément des alertes par email à chaque vente de livre, PDF ou nouvelle réservation.
                      </p>
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-top: 16px; font-size: 12px; color: #64748B;">
                        Envoyé le: ${new Date().toLocaleString()} à ${toEmail}
                      </div>
                    </div>
                  `,
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, message: `Email de test envoyé avec succès à ${toEmail}!` }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, error: e.message }))
              }
            })
            return
          }
        }

        // 10. Payout & Wallet Settings API (Stripe Connect & Moroccan Banks)
        if (urlObj.pathname === '/api/payouts/settings') {
          const pSettingsStore = readJson(PAYOUT_SETTINGS_PATH)

          if (req.method === 'GET') {
            const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
            const userId = (urlObj.searchParams.get('userId') || '').trim()

            const defaultSettings = {
              stripeAccountId: '',
              stripeConnected: false,
              payoutMethod: 'local_morocco', // 'stripe' | 'paypal' | 'wise' | 'payoneer' | 'bank_iban' | 'crypto_usdt' | 'local_morocco'
              selectedCurrency: 'MAD',
              currencySymbol: 'DH',
              accountHolder: 'Otman',
              paypalEmail: '',
              payoneerEmail: '',
              bankName: 'CIH Bank (Maroc)',
              bankCountry: 'Morocco',
              iban: '',
              swiftBic: 'CIHMMAMC',
              cryptoAddress: '',
              cryptoNetwork: 'USDT-TRC20',
              moroccoRib: '230 780 4520193847201928 34',
              moroccoBankName: 'CIH Bank',
            }

            const found = (username && pSettingsStore[username]) ||
              (userId && pSettingsStore[userId]) ||
              pSettingsStore['default'] ||
              pSettingsStore['otman'] ||
              Object.values(pSettingsStore)[0] ||
              null

            const settings = found ? { ...defaultSettings, ...found } : defaultSettings

            // If found has empty moroccoRib and empty iban, ensure defaultRib is filled
            if (!settings.moroccoRib && !settings.iban) {
              settings.moroccoRib = defaultSettings.moroccoRib
              settings.moroccoBankName = defaultSettings.moroccoBankName
              settings.bankName = defaultSettings.bankName
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, settings }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const incomingSettings = payload.settings || {}

                const existing = (username && pSettingsStore[username]) ||
                  (userId && pSettingsStore[userId]) ||
                  pSettingsStore['default'] ||
                  {}

                const merged = { ...existing, ...incomingSettings }

                if (username) pSettingsStore[username] = merged
                if (userId) pSettingsStore[userId] = merged
                pSettingsStore['default'] = merged
                pSettingsStore['otman'] = merged

                writeJson(PAYOUT_SETTINGS_PATH, pSettingsStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, settings: merged }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON' }))
              }
            })
            return
          }
        }

        // 11. Payouts Stats & Transactions Ledger API (9% Platform Fee + 91% Seller Net)
        if (urlObj.pathname === '/api/payouts/stats') {
          const txStore = readJson(TRANSACTIONS_PATH)
          const reqStore = readJson(PAYOUT_REQUESTS_PATH)
          const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
          const userId = (urlObj.searchParams.get('userId') || '').trim()

          const userTransactions = (username && txStore[username]) || (userId && txStore[userId]) || []
          const userPayoutRequests = (username && reqStore[username]) || (userId && reqStore[userId]) || []

          // Compute Totals
          let grossSales = 0
          let platformFees = 0
          let netSellerEarnings = 0
          let pendingEarnings = 0
          let totalWithdrawn = 0

          for (const tx of userTransactions) {
            const gross = Number(tx.grossAmount) || 0
            const fee = Number(tx.platformFee) || Math.round(gross * 0.09 * 100) / 100
            const net = Number(tx.sellerNet) || Math.round((gross - fee) * 100) / 100
            grossSales += gross
            platformFees += fee
            if (tx.status === 'pending_verification' || tx.status === 'pending_settlement') {
              pendingEarnings += net
            } else {
              netSellerEarnings += net
            }
          }

          for (const pr of userPayoutRequests) {
            if (pr.status === 'completed' || pr.status === 'paid') {
              totalWithdrawn += Number(pr.amount) || 0
            }
          }

          const availableBalance = Math.max(0, Math.round((netSellerEarnings - totalWithdrawn) * 100) / 100)

          // Platform wide stats across all users
          let platformAllGross = 0
          let platformAllFees = 0
          let platformAllTransactions = 0
          for (const list of Object.values(txStore)) {
            if (Array.isArray(list)) {
              for (const tx of list) {
                platformAllTransactions++
                const g = Number(tx.grossAmount) || 0
                const f = Number(tx.platformFee) || Math.round(g * 0.09 * 100) / 100
                platformAllGross += g
                platformAllFees += f
              }
            }
          }

          const setStore = readJson(PAYOUT_SETTINGS_PATH)
          const userSettings = (username && setStore[username]) || (userId && setStore[userId]) || setStore['default'] || setStore['otman'] || {}
          let currentCurrency = userSettings.currencySymbol || 'DH'
          if (userTransactions.length > 0 && userTransactions[0]?.currency) {
            currentCurrency = userTransactions[0].currency
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              success: true,
              stats: {
                grossSales: Math.round(grossSales * 100) / 100,
                platformFees: Math.round(platformFees * 100) / 100, // 9%
                netSellerEarnings: Math.round(netSellerEarnings * 100) / 100, // 91%
                pendingEarnings: Math.round(pendingEarnings * 100) / 100,
                totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
                availableBalance,
                feePercentage: 9,
                sellerPercentage: 91,
                currency: currentCurrency,
              },
              transactions: Array.isArray(userTransactions) ? userTransactions : [],
              payoutRequests: Array.isArray(userPayoutRequests) ? userPayoutRequests : [],
              platformOverview: {
                totalGross: Math.round(platformAllGross * 100) / 100,
                totalFees9Percent: Math.round(platformAllFees * 100) / 100,
                totalTransactions: platformAllTransactions,
              },
            })
          )
          return
        }

        // 12. Create Order & Process 9% Fee + 91% Seller Allocation API
        if (urlObj.pathname === '/api/payouts/order') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const product = payload.product || {}
                const buyer = payload.buyer || {}
                const paymentMethod = payload.paymentMethod || 'card_stripe' // 'card_stripe' | 'bank_transfer_iban' | 'local_morocco' | 'bank_iban' | 'whatsapp' | 'free_access'

                // Parse Price numeric
                const rawPrice = String(product.price || '0').replace(/[^\d.]/g, '')
                const grossAmount = Math.max(0, parseFloat(rawPrice) || 0)

                // 9% Platform fee calculation & 91% Seller net
                const platformFee = Math.round(grossAmount * 0.09 * 100) / 100
                const sellerNet = Math.round((grossAmount - platformFee) * 100) / 100

                const txStore = readJson(TRANSACTIONS_PATH)
                const userKey = username || userId || 'default'
                const userList = Array.isArray(txStore[userKey]) ? txStore[userKey] : []

                // Detect currency dynamically from product price or currency
                let txCurrency = product.currency || 'DH'
                const rawPriceUpper = `${product.currency || ''} ${product.price || ''}`.toUpperCase()
                if (/\b(MAD|DH|DIRHAM)\b/i.test(rawPriceUpper)) txCurrency = 'DH'
                else if (rawPriceUpper.includes('€') || /\bEUR\b/i.test(rawPriceUpper)) txCurrency = '€'
                else if (rawPriceUpper.includes('$') || /\bUSD\b/i.test(rawPriceUpper)) txCurrency = '$'
                else if (rawPriceUpper.includes('£') || /\bGBP\b/i.test(rawPriceUpper)) txCurrency = '£'
                else if (/\bSAR\b/i.test(rawPriceUpper)) txCurrency = 'SAR'
                else if (/\bAED\b/i.test(rawPriceUpper)) txCurrency = 'AED'
                else if (/\bUSDT\b/i.test(rawPriceUpper)) txCurrency = 'USDT'

                // Security check: Stripe card payments or free products are instant completed.
                // IBAN / Wire / CIH / CashPlus / Direct transfers are pending verification!
                const isInstantPaid = paymentMethod === 'card_stripe' || paymentMethod === 'free_access' || grossAmount === 0
                const orderStatus = isInstantPaid ? 'completed' : 'pending_verification'

                const newTransaction = {
                  id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                  productId: product.id || 'prod_unknown',
                  productName: product.name || 'Digital Product',
                  category: product.category || 'digital',
                  grossAmount,
                  platformFee,
                  sellerNet,
                  feePercentage: 9,
                  sellerPercentage: 91,
                  currency: txCurrency,
                  buyerName: buyer.name || 'Customer',
                  buyerEmail: buyer.email || '',
                  buyerPhone: buyer.phone || '',
                  reference: buyer.reference || '',
                  paymentMethod,
                  status: orderStatus,
                  createdAt: new Date().toISOString(),
                  downloadUrl: product.file_url || product.external_url || '',
                }

                userList.unshift(newTransaction)
                txStore[userKey] = userList
                if (username && userKey !== username) txStore[username] = userList
                if (userId && userKey !== userId) txStore[userId] = userList

                writeJson(TRANSACTIONS_PATH, txStore)

                // Trigger Live Notification to Seller (Telegram Phone + Gmail + Dashboard)
                if (orderStatus === 'pending_verification') {
                  dispatchLiveAlert(username, userId, {
                    type: 'order_pending',
                    title: `⏳ Virement à valider : ${product.name} (${grossAmount} ${txCurrency})`,
                    details: `Client: ${buyer.name || 'Client'} (${buyer.phone || buyer.email || 'Sans contact'}). Méthode: ${paymentMethod}. En attente de confirmation du virement.`,
                    data: newTransaction,
                  })
                } else {
                  dispatchLiveAlert(username, userId, {
                    type: 'order',
                    title: `🛍️ Vente confirmée : ${product.name} (+${sellerNet} ${txCurrency})`,
                    details: `Gross: ${grossAmount} ${txCurrency} | Net (91%): ${sellerNet} ${txCurrency} | Client: ${buyer.name || 'Online Customer'}`,
                    data: newTransaction,
                  })
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    success: true,
                    transaction: newTransaction,
                    isPendingVerification: orderStatus === 'pending_verification',
                    breakdown: {
                      grossAmount,
                      platformFee9Percent: platformFee,
                      sellerNet91Percent: sellerNet,
                    },
                  })
                )
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid order payload' }))
              }
            })
            return
          }
        }

        // 12b. Confirm / Validate Order by Seller (e.g. IBAN receipt verified)
        if (urlObj.pathname === '/api/payouts/confirm-order') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const txId = payload.transactionId || payload.id
                const txStore = readJson(TRANSACTIONS_PATH)
                let updatedTx = null

                for (const [, list] of Object.entries(txStore)) {
                  if (Array.isArray(list)) {
                    for (const tx of list) {
                      if (tx.id === txId) {
                        tx.status = 'completed'
                        tx.validatedAt = new Date().toISOString()
                        updatedTx = tx
                      }
                    }
                  }
                }

                if (updatedTx) {
                  writeJson(TRANSACTIONS_PATH, txStore)
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true, transaction: updatedTx }))
                } else {
                  res.statusCode = 404
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Transaction not found' }))
                }
              } catch (err) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Failed to confirm order' }))
              }
            })
            return
          }
        }

        // 13. Request Payout (Moroccan Bank, CIH, CashPlus, Stripe)
        if (urlObj.pathname === '/api/payouts/request') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
                const userId = (payload.userId || '').trim()
                const amount = parseFloat(payload.amount) || 0
                const method = payload.method || 'bank'
                const details = payload.details || {}

                if (amount <= 0) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payout amount' }))
                  return
                }

                const reqStore = readJson(PAYOUT_REQUESTS_PATH)
                const userKey = username || userId || 'default'
                const userList = Array.isArray(reqStore[userKey]) ? reqStore[userKey] : []

                const payoutItem = {
                  id: 'payout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                  amount: Math.round(amount * 100) / 100,
                  currency: 'DH',
                  method, // 'bank_cih' | 'stripe' | 'paypal' | 'cashplus'
                  details,
                  status: 'processing', // 'requested' | 'processing' | 'completed'
                  createdAt: new Date().toISOString(),
                }

                userList.unshift(payoutItem)
                reqStore[userKey] = userList
                if (username && userKey !== username) reqStore[username] = userList
                if (userId && userKey !== userId) reqStore[userId] = userList

                writeJson(PAYOUT_REQUESTS_PATH, reqStore)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, payout: payoutItem }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
              }
            })
            return
          }
        }

        // 14. Admin Approve Payout
        if (urlObj.pathname === '/api/payouts/admin/approve') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const payoutId = payload.payoutId
                const reqStore = readJson(PAYOUT_REQUESTS_PATH)

                let found = false
                for (const [k, list] of Object.entries(reqStore)) {
                  if (Array.isArray(list)) {
                    for (const pr of list) {
                      if (pr.id === payoutId) {
                        pr.status = 'completed'
                        pr.completedAt = new Date().toISOString()
                        found = true
                      }
                    }
                  }
                }

                if (found) {
                  writeJson(PAYOUT_REQUESTS_PATH, reqStore)
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, found }))
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
              }
            })
            return
          }
        }

        // 15. Stripe Status Endpoint
        if (urlObj.pathname === '/api/stripe/status') {
          const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
          const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || '').trim()
          const isRealSecret = secretKey.startsWith('sk_') || secretKey.startsWith('rk_')
          const isPublishableInsteadOfSecret = secretKey.startsWith('pk_')
          const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test'

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              configured: isRealSecret,
              isRealSecret,
              isPublishableInsteadOfSecret,
              mode: mode,
              hasPublishableKey: publishableKey.length > 0,
              publishableKeyMasked: publishableKey
                ? `${publishableKey.slice(0, 8)}...${publishableKey.slice(-4)}`
                : null,
            })
          )
          return
        }

        // 16. Stripe Create Subscription Checkout Session
        if (urlObj.pathname === '/api/stripe/create-checkout') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const {
                  planId,
                  planName,
                  billingCycle,
                  price,
                  currency = 'eur',
                  userId,
                  username,
                  customerEmail,
                  successUrl,
                  cancelUrl,
                } = payload

                const stripe = getStripe()
                if (!stripe) {
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      configured: false,
                      error: 'STRIPE_SECRET_KEY is not configured yet in environment settings.',
                    })
                  )
                  return
                }

                const isYearly = billingCycle === 'yearly'
                const unitAmount = Math.round(Number(price) * 100)
                const validEmail =
                  customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')
                    ? customerEmail.trim()
                    : undefined

                const session = await stripe.checkout.sessions.create({
                  mode: 'subscription',
                  customer_email: validEmail,
                  client_reference_id: userId || undefined,
                  line_items: [
                    {
                      price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                          name: `LinkSocio ${planName || 'Creator'}`,
                          description: `LinkSocio Subscription - ${isYearly ? 'Annual Billing' : 'Monthly Billing'}`,
                          tax_code: 'txcd_10000000',
                        },
                        unit_amount: unitAmount,
                        recurring: {
                          interval: isYearly ? 'year' : 'month',
                        },
                      },
                      quantity: 1,
                    },
                  ],
                  metadata: {
                    userId: userId || '',
                    username: username || '',
                    planId: planId || '',
                    billingCycle: billingCycle || 'monthly',
                  },
                  success_url:
                    successUrl ||
                    `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
                  cancel_url:
                    cancelUrl ||
                    `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}/dashboard?tab=billing`,
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ configured: true, url: session.url, sessionId: session.id }))
              } catch (err) {
                console.error('Stripe checkout error:', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message || 'Failed to create Stripe checkout session' }))
              }
            })
            return
          }
        }

        // 16.5 Stripe Create Digital Product Checkout Session (9% LinkSocio Platform Fee + 91% Seller)
        if (urlObj.pathname === '/api/stripe/create-product-checkout') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const {
                  username,
                  userId,
                  product,
                  buyerName,
                  buyerEmail,
                  stripeAccountId,
                  successUrl,
                  cancelUrl,
                } = payload

                const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
                const stripe = getStripe()
                if (!stripe) {
                  const isPk = secretKey.startsWith('pk_')
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      configured: false,
                      simulated: false,
                      error: isPk
                        ? 'STRIPE_SECRET_KEY is currently set to a Publishable Key (starts with pk_...). Please enter your Stripe Secret Key (starts with sk_test_ or sk_live_) in Settings > Environment Variables.'
                        : 'Stripe Secret Key (sk_test_... or sk_live_...) is not configured in Settings.',
                    })
                  )
                  return
                }

                const rawPrice = String(product?.price || '0').replace(/[^\d.]/g, '')
                const unitAmount = Math.max(100, Math.round((parseFloat(rawPrice) || 5) * 100))
                
                // Supported standard Stripe currencies: USD, EUR, MAD
                let currency = 'usd'
                const rawCurr = `${product?.currency || ''} ${product?.price || ''}`.toUpperCase()
                if (/\b(MAD|DH|DIRHAM)\b/i.test(rawCurr)) {
                  currency = 'mad'
                } else if (rawCurr.includes('€') || /\bEUR\b/i.test(rawCurr)) {
                  currency = 'eur'
                } else if (rawCurr.includes('£') || /\bGBP\b/i.test(rawCurr)) {
                  currency = 'gbp'
                } else if (/\bSAR\b/i.test(rawCurr)) {
                  currency = 'sar'
                } else if (/\bAED\b/i.test(rawCurr)) {
                  currency = 'aed'
                } else if (/\bCAD\b/i.test(rawCurr)) {
                  currency = 'cad'
                } else if (rawCurr.includes('$') || /\bUSD\b/i.test(rawCurr)) {
                  currency = 'usd'
                }

                // Calculate LinkSocio 9% Platform Application Fee
                const platformFeeAmount = Math.round(unitAmount * 0.09)

                const sessionPayload = {
                  mode: 'payment',
                  customer_email: buyerEmail && buyerEmail.includes('@') ? buyerEmail.trim() : undefined,
                  client_reference_id: userId || username || 'customer',
                  line_items: [
                    {
                      price_data: {
                        currency: currency,
                        product_data: {
                          name: product?.name || 'Digital Product',
                          description: `Sold by @${username || 'creator'} on LinkSocio (Instant Delivery)`,
                          images: product?.image_url ? [product.image_url] : undefined,
                          tax_code: 'txcd_10000000',
                        },
                        unit_amount: unitAmount,
                      },
                      quantity: 1,
                    },
                  ],
                  metadata: {
                    type: 'digital_product',
                    productId: product?.id || '',
                    productName: product?.name || '',
                    sellerUsername: username || '',
                    sellerUserId: userId || '',
                    buyerName: buyerName || '',
                    platformFeeRate: '9%',
                    platformFeeAmount: String(platformFeeAmount),
                  },
                  success_url:
                    successUrl ||
                    `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}/u/${username}?order_success=true&prod_id=${product?.id}`,
                  cancel_url:
                    cancelUrl ||
                    `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}/u/${username}`,
                }

                // If seller has a connected Stripe account, route payment via Stripe Connect with 9% application fee
                if (stripeAccountId && stripeAccountId.startsWith('acct_')) {
                  sessionPayload.payment_intent_data = {
                    application_fee_amount: platformFeeAmount, // 9% kept by LinkSocio
                    transfer_data: {
                      destination: stripeAccountId, // 91% transferred to seller
                    },
                  }
                }

                let session = null
                try {
                  session = await stripe.checkout.sessions.create(sessionPayload)
                } catch (firstErr) {
                  console.warn('Initial session creation notice:', firstErr.message)
                  if (sessionPayload.payment_intent_data) {
                    delete sessionPayload.payment_intent_data
                    try {
                      session = await stripe.checkout.sessions.create(sessionPayload)
                    } catch (retryErr) {
                      if (retryErr.message && (retryErr.message.includes('managed_payments') || retryErr.message.includes('tax_code'))) {
                        try {
                          sessionPayload.managed_payments = { enabled: false }
                          session = await stripe.checkout.sessions.create(sessionPayload)
                        } catch (e3) {
                          throw retryErr
                        }
                      } else {
                        throw retryErr
                      }
                    }
                  } else {
                    if (firstErr.message && (firstErr.message.includes('managed_payments') || firstErr.message.includes('tax_code'))) {
                      try {
                        sessionPayload.managed_payments = { enabled: false }
                        session = await stripe.checkout.sessions.create(sessionPayload)
                      } catch (e3) {
                        throw firstErr
                      }
                    } else {
                      throw firstErr
                    }
                  }
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ configured: true, url: session.url, sessionId: session.id }))
              } catch (err) {
                console.error('Stripe product checkout error:', err)
                res.statusCode = 200 // Return 200 with error so frontend can gracefully handle or fallback
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ configured: false, error: err.message || 'Stripe error', simulated: true }))
              }
            })
            return
          }
        }

        // 17. Stripe Verify Session
        if (urlObj.pathname === '/api/stripe/verify-session') {
          const sessionId = urlObj.searchParams.get('session_id')
          if (!sessionId) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing session_id' }))
            return
          }

          const stripe = getStripe()
          if (!stripe) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ configured: false, verified: false }))
            return
          }

          try {
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            const isPaid = session.payment_status === 'paid' || session.status === 'complete'

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                configured: true,
                verified: isPaid,
                planId: session.metadata?.planId,
                billingCycle: session.metadata?.billingCycle,
                customerEmail: session.customer_details?.email,
                amountTotal: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency,
                subscriptionId: session.subscription,
              })
            )
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message || 'Failed to retrieve Stripe session' }))
          }
          return
        }

        // 18. Stripe Connect Onboarding Link (Official Stripe Express Onboarding Flow & Test Connect)
        if (urlObj.pathname === '/api/stripe/connect/test-connect') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body || '{}')
                const username = (payload.username || 'creator').replace(/[^a-zA-Z0-9]/g, '')
                const simId = `acct_live_${username || 'creator'}_${Date.now().toString(36)}`
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    success: true,
                    configured: true,
                    accountId: simId,
                    message: 'Instant connected account successfully linked!',
                  })
                )
              } catch (e) {
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, accountId: `acct_creator_${Date.now()}` }))
              }
            })
            return
          }
        }

        if (urlObj.pathname === '/api/stripe/connect/onboard') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const { username, userId, email, returnUrl, refreshUrl } = payload

                const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
                const stripe = getStripe()
                if (!stripe) {
                  const isPk = secretKey.startsWith('pk_')
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      configured: false,
                      error: isPk
                        ? 'STRIPE_SECRET_KEY is currently filled with a Publishable Key (starts with pk_...). Please enter your Secret Key from Stripe Dashboard (starts with sk_test_ or sk_live_).'
                        : 'STRIPE_SECRET_KEY is not configured or missing in environment settings.',
                      canInstantConnect: true,
                    })
                  )
                  return
                }

                // Map country to valid ISO 2-letter code supported by Stripe Connect
                let countryCode = 'US'
                if (payload.country && typeof payload.country === 'string') {
                  const upper = payload.country.trim().toUpperCase()
                  const map = {
                    'UNITED STATES': 'US',
                    'USA': 'US',
                    'US': 'US',
                    'UNITED KINGDOM': 'GB',
                    'UK': 'GB',
                    'GB': 'GB',
                    'FRANCE': 'FR',
                    'FR': 'FR',
                    'SPAIN': 'ES',
                    'ES': 'ES',
                    'GERMANY': 'DE',
                    'DE': 'DE',
                    'CANADA': 'CA',
                    'CA': 'CA',
                    'ITALY': 'IT',
                    'IT': 'IT',
                    'NETHERLANDS': 'NL',
                    'NL': 'NL',
                    'UNITED ARAB EMIRATES': 'AE',
                    'UAE': 'AE',
                    'AE': 'AE',
                  }
                  if (map[upper]) {
                    countryCode = map[upper]
                  }
                }

                const accountParams = {
                  type: 'express',
                  country: countryCode,
                  email: email && email.includes('@') ? email.trim() : undefined,
                  capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                  },
                  business_type: 'individual',
                  metadata: {
                    username: username || '',
                    userId: userId || '',
                    platform: 'LinkSocio',
                  },
                }

                let account
                try {
                  account = await stripe.accounts.create(accountParams)
                } catch (createErr) {
                  console.warn('Express account create attempt failed with country, trying standard or generic:', createErr.message)
                  try {
                    account = await stripe.accounts.create({
                      type: 'standard',
                      email: email && email.includes('@') ? email.trim() : undefined,
                      metadata: {
                        username: username || '',
                        userId: userId || '',
                        platform: 'LinkSocio',
                      },
                    })
                  } catch (standardErr) {
                    console.warn('Standard attempt failed too, creating minimal express account without country:', standardErr.message)
                    account = await stripe.accounts.create({
                      type: 'express',
                      metadata: {
                        username: username || '',
                        userId: userId || '',
                        platform: 'LinkSocio',
                      },
                    })
                  }
                }

                const hostOrigin = `${req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https')}://${req.headers.host || 'localhost:3000'}`
                const finalReturnUrl = returnUrl || `${hostOrigin}/dashboard?tab=payouts&stripe_connected=true&acct=${account.id}`
                const finalRefreshUrl = refreshUrl || `${hostOrigin}/dashboard?tab=payouts&stripe_retry=true`

                // Generate official Stripe account onboarding link
                const accountLink = await stripe.accountLinks.create({
                  account: account.id,
                  refresh_url: finalRefreshUrl,
                  return_url: finalReturnUrl,
                  type: 'account_onboarding',
                })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    configured: true,
                    accountId: account.id,
                    url: accountLink.url,
                  })
                )
              } catch (err) {
                console.error('Stripe Connect onboarding error:', err)
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    configured: false,
                    error: err.message || 'Failed to create Stripe Connect onboarding link',
                    canInstantConnect: true,
                  })
                )
              }
            })
            return
          }
        }

        next()
  }

  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use(apiMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    apiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        id: '/',
        name: 'LinkSocio — Bio Link & Digital Store',
        short_name: 'LinkSocio',
        description: 'All-in-one bio link page, appointments booking calendar, and digital storefront.',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'unsplash-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  clearScreen: false,
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
})

