import fs from 'fs'
import path from 'path'
import os from 'os'

const PRIMARY_PATH = path.join(process.cwd(), '.payout_settings_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_payout_settings.json')

if (!global.__linksocio_payout_settings_cache) {
  global.__linksocio_payout_settings_cache = {}
}

function readStore() {
  let store = global.__linksocio_payout_settings_cache || {}
  try {
    if (fs.existsSync(PRIMARY_PATH)) {
      const data = fs.readFileSync(PRIMARY_PATH, 'utf-8')
      const parsed = JSON.parse(data || '{}')
      store = { ...store, ...parsed }
    }
  } catch (e) {}
  try {
    if (fs.existsSync(TMP_PATH)) {
      const data = fs.readFileSync(TMP_PATH, 'utf-8')
      const parsed = JSON.parse(data || '{}')
      store = { ...store, ...parsed }
    }
  } catch (e) {}
  global.__linksocio_payout_settings_cache = store
  return store
}

function writeStore(store) {
  global.__linksocio_payout_settings_cache = store
  const data = JSON.stringify(store, null, 2)
  try {
    fs.writeFileSync(PRIMARY_PATH, data, 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(TMP_PATH, data, 'utf-8')
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const pSettingsStore = readStore()

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
    const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
    const userId = (urlObj.searchParams.get('userId') || '').trim()

    const found =
      (username && pSettingsStore[username]) ||
      (userId && pSettingsStore[userId]) ||
      pSettingsStore['default'] ||
      Object.values(pSettingsStore)[0] ||
      null

    const settings = found
      ? { ...found }
      : {
          stripeAccountId: '',
          stripeConnected: false,
          payoutMethod: 'stripe',
          selectedCurrency: 'USD',
          currencySymbol: '$',
          accountHolder: '',
          paypalEmail: '',
          payoneerEmail: '',
          bankName: '',
          bankCountry: 'United States',
          iban: '',
          swiftBic: '',
          cryptoAddress: '',
          cryptoNetwork: 'USDT-TRC20',
          moroccoRib: '',
          moroccoBankName: 'CIH Bank',
        }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, settings }))
    return
  }

  if (req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
        const userId = (payload.userId || '').trim()
        const settings = payload.settings || {}

        if (username) pSettingsStore[username] = settings
        if (userId) pSettingsStore[userId] = settings
        pSettingsStore['default'] = settings

        writeStore(pSettingsStore)

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

  res.statusCode = 405
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
