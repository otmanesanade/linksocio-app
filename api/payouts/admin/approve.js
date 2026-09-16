import fs from 'fs'
import path from 'path'
import os from 'os'

const PRIMARY_PATH = path.join(process.cwd(), '.payout_requests_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_payout_requests.json')

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

    const payoutId = payload?.payoutId
    const reqStore = readStore()

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
      writeStore(reqStore)
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, found }))
  } catch (e) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid payload' }))
  }
}
