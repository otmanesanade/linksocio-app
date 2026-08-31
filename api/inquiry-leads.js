// Server endpoint to record, retrieve and update inquiry leads across devices
import fs from 'fs'
import path from 'path'

const LEADS_PATH = path.join(process.cwd(), '.leads_store.json')

function readLeadsStore() {
  try {
    if (fs.existsSync(LEADS_PATH)) {
      const data = fs.readFileSync(LEADS_PATH, 'utf-8')
      return JSON.parse(data || '{}')
    }
  } catch (e) {}
  return {}
}

function writeLeadsStore(store) {
  try {
    fs.writeFileSync(LEADS_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method === 'GET') {
    const store = readLeadsStore()
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
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
      addList(store[username])
      addList(store[`@${username}`])
    }
    if (userId) {
      addList(store[userId])
    }

    if (collected.length === 0 && Object.keys(store).length > 0) {
      for (const [k, v] of Object.entries(store)) {
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
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        const username = (payload.username || '').toLowerCase().trim().replace(/^@/, '')
        const userId = (payload.userId || '').trim()
        const lead = payload.lead || {}

        if (!username && !userId) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing username or userId' }))
          return
        }

        const newLead = {
          id: lead.id || 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          createdAt: lead.createdAt || new Date().toISOString(),
          status: lead.status || 'new',
          ...lead,
        }

        const store = readLeadsStore()

        function saveToKey(key) {
          if (!key) return
          const currentList = store[key] || []
          const idx = currentList.findIndex((l) => l.id === newLead.id)
          if (idx >= 0) {
            currentList[idx] = { ...currentList[idx], ...newLead }
          } else {
            currentList.unshift(newLead)
          }
          store[key] = currentList
        }

        if (username) saveToKey(username)
        if (userId) saveToKey(userId)

        writeLeadsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, lead: newLead }))
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
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

        const store = readLeadsStore()
        for (const [k, list] of Object.entries(store)) {
          if (Array.isArray(list)) {
            store[k] = list.map((l) => (l.id === leadId ? { ...l, status: newStatus || l.status } : l))
          }
        }

        writeLeadsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  if (req.method === 'DELETE') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
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

        const store = readLeadsStore()
        for (const [k, list] of Object.entries(store)) {
          if (Array.isArray(list)) {
            store[k] = list.filter((l) => l.id !== leadId)
          }
        }

        writeLeadsStore(store)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
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

