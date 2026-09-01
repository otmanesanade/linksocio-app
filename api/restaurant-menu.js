// Server endpoint to get and save restaurant / cafe menu and settings
import fs from 'fs'
import path from 'path'
import os from 'os'

const PRIMARY_PATH = path.join(process.cwd(), '.restaurant_menu_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_restaurant_menu_store.json')

if (!global.__linksocio_restaurant_menu_cache) {
  global.__linksocio_restaurant_menu_cache = {}
}

function readStore() {
  let store = global.__linksocio_restaurant_menu_cache || {}
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
  global.__linksocio_restaurant_menu_cache = store
  return store
}

function writeStore(store) {
  global.__linksocio_restaurant_menu_cache = store
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const store = readStore()

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
    const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().replace(/^@/, '')
    const userId = (urlObj.searchParams.get('userId') || '').trim()

    let menuData = (username && store[username]) || (userId && store[userId]) || null

    if (!menuData && Object.keys(store).length > 0) {
      for (const [k, v] of Object.entries(store)) {
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
    req.on('data', (chunk) => {
      body += chunk
    })
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

        if (username) store[username] = menu
        if (userId) store[userId] = menu

        writeStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, menu }))
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
