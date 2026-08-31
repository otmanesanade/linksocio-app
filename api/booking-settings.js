// Server endpoint to get and save booking / calendar consultation settings
import fs from 'fs'
import path from 'path'

const STORE_PATH = path.join(process.cwd(), '.booking_settings.json')

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8')
      return JSON.parse(data || '{}')
    }
  } catch (e) {}
  return {}
}

function writeStore(store) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (e) {}
}

export default async function handler(req, res) {
  const store = readStore()

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
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
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        const username = (payload.username || '').toLowerCase().trim()
        const userId = payload.userId || ''
        const settings = payload.settings || {}

        if (username) store[username] = settings
        if (userId) store[userId] = settings

        writeStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, settings }))
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      }
    })
    return
  }

  res.statusCode = 405
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
