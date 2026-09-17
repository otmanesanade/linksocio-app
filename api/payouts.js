import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_PRIMARY = path.join(process.cwd(), '.payout_settings_store.json')
const SETTINGS_TMP = path.join(os.tmpdir(), '.linksocio_payout_settings.json')
const TX_PRIMARY = path.join(process.cwd(), '.transactions_store.json')
const TX_TMP = path.join(os.tmpdir(), '.linksocio_transactions.json')
const REQ_PRIMARY = path.join(process.cwd(), '.payout_requests_store.json')
const REQ_TMP = path.join(os.tmpdir(), '.linksocio_payout_requests.json')

function readJsonSafe(primary, tmp) {
  let store = {}
  try {
    if (fs.existsSync(primary)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(primary, 'utf-8') || '{}') }
    }
  } catch (e) {}
  try {
    if (fs.existsSync(tmp)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(tmp, 'utf-8') || '{}') }
    }
  } catch (e) {}
  return store
}

function writeJsonSafe(primary, tmp, data) {
  const serialized = JSON.stringify(data, null, 2)
  try {
    fs.writeFileSync(primary, serialized, 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(tmp, serialized, 'utf-8')
  } catch (e) {}
}

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body)
      } catch (e) {
        return {}
      }
    }
    return req.body
  }
  return new Promise((resolve) => {
    let bodyStr = ''
    req.on('data', (chunk) => {
      bodyStr += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(bodyStr || '{}'))
      } catch (e) {
        resolve({})
      }
    })
  })
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
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

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const subroute = (
    req.query?.subroute ||
    urlObj.searchParams.get('subroute') ||
    urlObj.pathname.replace(/^\/api\/payouts\/?/, '')
  ).toLowerCase().trim()

  const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
  const userId = (urlObj.searchParams.get('userId') || '').trim()

  // 1. SETTINGS
  if (subroute === 'settings' || subroute.includes('settings')) {
    const store = readJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP)
    if (req.method === 'GET') {
      const found =
        (username && store[username]) ||
        (userId && store[userId]) ||
        store['default'] ||
        Object.values(store)[0] ||
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
      sendJson(res, 200, { success: true, settings })
      return
    }

    if (req.method === 'POST') {
      const payload = await parseBody(req)
      const u = (payload.username || username || '').toLowerCase().trim().replace(/^@/, '')
      const id = (payload.userId || userId || '').trim()
      const newSettings = payload.settings || {}

      if (u) store[u] = newSettings
      if (id) store[id] = newSettings
      store['default'] = newSettings

      writeJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP, store)
      sendJson(res, 200, { success: true, settings: newSettings })
      return
    }
  }

  // 2. STATS
  if (subroute === 'stats' || subroute.includes('stats')) {
    const txStore = readJsonSafe(TX_PRIMARY, TX_TMP)
    const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)
    const setStore = readJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP)

    const userTransactions = (username && txStore[username]) || (userId && txStore[userId]) || txStore['default'] || []
    const userPayoutRequests = (username && reqStore[username]) || (userId && reqStore[userId]) || reqStore['default'] || []
    const userSettings = (username && setStore[username]) || (userId && setStore[userId]) || setStore['default'] || {}

    let grossSales = 0
    let platformFees = 0
    let netSellerEarnings = 0
    let totalWithdrawn = 0

    if (Array.isArray(userTransactions)) {
      for (const tx of userTransactions) {
        const gross = Number(tx.grossAmount) || 0
        const fee = Number(tx.platformFee) || Math.round(gross * 0.09 * 100) / 100
        const net = Number(tx.sellerNet) || Math.round((gross - fee) * 100) / 100
        grossSales += gross
        platformFees += fee
        netSellerEarnings += net
      }
    }

    if (Array.isArray(userPayoutRequests)) {
      for (const pr of userPayoutRequests) {
        if (pr.status === 'completed' || pr.status === 'paid') {
          totalWithdrawn += Number(pr.amount) || 0
        }
      }
    }

    const availableBalance = Math.max(0, Math.round((netSellerEarnings - totalWithdrawn) * 100) / 100)

    // Determine current currency from user settings or latest transaction
    let currentCurrency = userSettings.currencySymbol || 'DH'
    if (userTransactions.length > 0 && userTransactions[0]?.currency) {
      currentCurrency = userTransactions[0].currency
    }

    sendJson(res, 200, {
      success: true,
      stats: {
        grossSales: Math.round(grossSales * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        netSellerEarnings: Math.round(netSellerEarnings * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        availableBalance,
        feePercentage: 9,
        sellerPercentage: 91,
        currency: currentCurrency,
      },
      transactions: Array.isArray(userTransactions) ? userTransactions : [],
      payoutRequests: Array.isArray(userPayoutRequests) ? userPayoutRequests : [],
    })
    return
  }

  // 3. ORDER
  if (subroute === 'order' || subroute.includes('order')) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    const payload = await parseBody(req)
    const u = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
    const id = (payload.userId || '').trim()
    const product = payload.product || {}
    const buyer = payload.buyer || {}
    const paymentMethod = payload.paymentMethod || 'card_stripe'

    const rawPrice = String(product.price || '0').replace(/[^\d.]/g, '')
    const grossAmount = Math.max(0, parseFloat(rawPrice) || 0)
    const platformFee = Math.round(grossAmount * 0.09 * 100) / 100
    const sellerNet = Math.round((grossAmount - platformFee) * 100) / 100

    // Detect currency from product price or currency property
    let txCurrency = product.currency || 'DH'
    const rawPriceUpper = `${product.currency || ''} ${product.price || ''}`.toUpperCase()
    if (/\b(MAD|DH|DIRHAM)\b/i.test(rawPriceUpper)) txCurrency = 'DH'
    else if (rawPriceUpper.includes('€') || /\bEUR\b/i.test(rawPriceUpper)) txCurrency = '€'
    else if (rawPriceUpper.includes('$') || /\bUSD\b/i.test(rawPriceUpper)) txCurrency = '$'
    else if (rawPriceUpper.includes('£') || /\bGBP\b/i.test(rawPriceUpper)) txCurrency = '£'
    else if (/\bSAR\b/i.test(rawPriceUpper)) txCurrency = 'SAR'
    else if (/\bAED\b/i.test(rawPriceUpper)) txCurrency = 'AED'
    else if (/\bUSDT\b/i.test(rawPriceUpper)) txCurrency = 'USDT'

    const txStore = readJsonSafe(TX_PRIMARY, TX_TMP)
    const userKey = u || id || 'default'
    const userList = Array.isArray(txStore[userKey]) ? txStore[userKey] : []

    const newTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      productId: product.id || 'prod_unknown',
      productName: product.name || 'Digital Product',
      grossAmount,
      platformFee,
      sellerNet,
      feePercentage: 9,
      sellerPercentage: 91,
      currency: txCurrency,
      buyerName: buyer.name || 'Customer',
      buyerEmail: buyer.email || '',
      buyerPhone: buyer.phone || '',
      paymentMethod,
      status: paymentMethod === 'whatsapp' ? 'pending_settlement' : 'completed',
      createdAt: new Date().toISOString(),
      downloadUrl: product.file_url || product.external_url || '',
    }

    userList.unshift(newTransaction)
    txStore[userKey] = userList
    if (u && userKey !== u) txStore[u] = userList
    if (id && userKey !== id) txStore[id] = userList
    txStore['default'] = userList

    writeJsonSafe(TX_PRIMARY, TX_TMP, txStore)
    sendJson(res, 200, { success: true, transaction: newTransaction })
    return
  }

  // 4. REQUEST WITHDRAW
  if (subroute === 'request' || subroute.includes('request')) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    const payload = await parseBody(req)
    const u = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
    const id = (payload.userId || '').trim()
    const amount = parseFloat(payload.amount) || 0
    const method = payload.method || 'bank'
    const details = payload.details || {}
    const setStore = readJsonSafe(SETTINGS_PRIMARY, SETTINGS_TMP)
    const userSettings = (u && setStore[u]) || (id && setStore[id]) || setStore['default'] || {}
    const payoutCurrency = payload.currency || userSettings.currencySymbol || 'DH'

    if (amount <= 0) {
      sendJson(res, 400, { error: 'Invalid payout amount' })
      return
    }

    const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)
    const userKey = u || id || 'default'
    const userList = Array.isArray(reqStore[userKey]) ? reqStore[userKey] : []

    const payoutItem = {
      id: 'payout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      amount: Math.round(amount * 100) / 100,
      currency: payoutCurrency,
      method,
      details,
      status: 'processing',
      createdAt: new Date().toISOString(),
    }

    userList.unshift(payoutItem)
    reqStore[userKey] = userList
    if (u && userKey !== u) reqStore[u] = userList
    if (id && userKey !== id) reqStore[id] = userList
    reqStore['default'] = userList

    writeJsonSafe(REQ_PRIMARY, REQ_TMP, reqStore)
    sendJson(res, 200, { success: true, payout: payoutItem })
    return
  }

  // 5. ADMIN APPROVE
  if (subroute.includes('approve')) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }
    const payload = await parseBody(req)
    const payoutId = payload?.payoutId
    const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)

    let found = false
    for (const [, list] of Object.entries(reqStore)) {
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
      writeJsonSafe(REQ_PRIMARY, REQ_TMP, reqStore)
    }
    sendJson(res, 200, { success: true, found })
    return
  }

  sendJson(res, 404, { error: 'Unknown payout endpoint' })
}
