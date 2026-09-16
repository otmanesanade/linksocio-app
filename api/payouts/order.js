import fs from 'fs'
import path from 'path'
import os from 'os'

const PRIMARY_PATH = path.join(process.cwd(), '.transactions_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_transactions.json')

function readStore() {
  let store = {}
  try {
    if (fs.existsSync(PRIMARY_PATH)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(PRIMARY_PATH, 'utf-8') || '{}') }
    }
  } catch (e) {}
  try {
    if (fs.existsSync(TMP_PATH)) {
      store = { ...store, ...JSON.parse(fs.readFileSync(TMP_PATH, 'utf-8') || '{}') }
    }
  } catch (e) {}
  return store
}

function writeStore(store) {
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

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    let payload = req.body
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch (e) {
        payload = {}
      }
    } else if (!payload) {
      payload = await new Promise((resolve) => {
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

    const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
    const userId = (payload.userId || '').trim()
    const product = payload.product || {}
    const buyer = payload.buyer || {}
    const paymentMethod = payload.paymentMethod || 'card_stripe'

    const rawPrice = String(product.price || '0').replace(/[^\d.]/g, '')
    const grossAmount = Math.max(0, parseFloat(rawPrice) || 0)

    const platformFee = Math.round(grossAmount * 0.09 * 100) / 100
    const sellerNet = Math.round((grossAmount - platformFee) * 100) / 100

    const txStore = readStore()
    const userKey = username || userId || 'default'
    const userList = Array.isArray(txStore[userKey]) ? txStore[userKey] : []

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
      currency: product.currency || '$',
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
    if (username && userKey !== username) txStore[username] = userList
    if (userId && userKey !== userId) txStore[userId] = userList
    txStore['default'] = userList

    writeStore(txStore)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        success: true,
        transaction: newTransaction,
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
}
