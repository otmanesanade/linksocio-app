// Server endpoint to record and retrieve inquiry leads across devices
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
  const store = readLeadsStore()

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
    const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim()

    const userLeads = (username && store[username]) || []

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ leads: userLeads }))
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
        const lead = payload.lead || {}

        if (!username) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing username' }))
          return
        }

        const newLead = {
          id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          createdAt: new Date().toISOString(),
          status: 'new',
          ...lead,
        }

        const currentList = store[username] || []
        store[username] = [newLead, ...currentList]

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

  res.statusCode = 405
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
