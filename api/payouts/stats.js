import fs from 'fs'
import path from 'path'
import os from 'os'

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
  const userId = (urlObj.searchParams.get('userId') || '').trim()

  const txStore = readJsonSafe(TX_PRIMARY, TX_TMP)
  const reqStore = readJsonSafe(REQ_PRIMARY, REQ_TMP)

  const userTransactions = (username && txStore[username]) || (userId && txStore[userId]) || txStore['default'] || []
  const userPayoutRequests = (username && reqStore[username]) || (userId && reqStore[userId]) || reqStore['default'] || []

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

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      success: true,
      stats: {
        grossSales: Math.round(grossSales * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        netSellerEarnings: Math.round(netSellerEarnings * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        availableBalance,
        feePercentage: 9,
        sellerPercentage: 91,
        currency: '$',
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
}
