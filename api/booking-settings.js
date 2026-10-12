// Server endpoint to get and save booking / calendar consultation settings with RBAC
import fs from 'fs'
import path from 'path'
import os from 'os'
import { applyCors, getAuthenticatedUser } from './_supabase.js'

const PRIMARY_PATH = path.join(process.cwd(), '.booking_settings.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_booking_settings.json')

if (!global.__linksocio_booking_settings_cache) {
  global.__linksocio_booking_settings_cache = {}
}

function readStore() {
  let store = global.__linksocio_booking_settings_cache || {}
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
  global.__linksocio_booking_settings_cache = store
  return store
}

function writeStore(store) {
  global.__linksocio_booking_settings_cache = store
  const data = JSON.stringify(store, null, 2)
  try {
    fs.writeFileSync(PRIMARY_PATH, data, 'utf-8')
  } catch (e) {}
  try {
    fs.writeFileSync(TMP_PATH, data, 'utf-8')
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

export default async function handler(req, res) {
  if (applyCors(req, res)) return

  const store = readStore()
  const authUser = await getAuthenticatedUser(req)

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
    const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
    const userId = (urlObj.searchParams.get('userId') || '').trim()

    const targetKey = (authUser && authUser.id) || userId || username || null
    const userSettings = targetKey ? (store[targetKey] || (username && store[username]) || null) : null

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ settings: userSettings }))
    return
  }

  if (req.method === 'POST') {
    // Only authenticated creator can modify their settings (Audit Section 2)
    if (!authUser) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Authentication required' }))
      return
    }

    const payload = await parseBody(req)
    const settings = payload.settings || {}

    store[authUser.id] = settings
    if (authUser.email) store[authUser.email] = settings
    writeStore(store)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, settings }))
    return
  }

  res.statusCode = 405
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
