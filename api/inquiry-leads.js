// Server endpoint to record, retrieve and update inquiry leads with authentication & Supabase integration
import fs from 'fs'
import path from 'path'
import os from 'os'
import { supabaseServer, applyCors, getAuthenticatedUser } from './_supabase.js'

const PRIMARY_PATH = path.join(process.cwd(), '.leads_store.json')
const TMP_PATH = path.join(os.tmpdir(), '.linksocio_leads_store.json')

if (!global.__linksocio_leads_cache) {
  global.__linksocio_leads_cache = {}
}

function readLeadsStore() {
  let store = global.__linksocio_leads_cache || {}
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

  global.__linksocio_leads_cache = store
  return store
}

function writeLeadsStore(store) {
  global.__linksocio_leads_cache = store
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

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return

  const authUser = await getAuthenticatedUser(req)

  // 1. GET: RETRIEVE CREATOR'S LEADS (Audit Section 2: Protected Private Route)
  if (req.method === 'GET') {
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required to view leads' })
    }

    const currentUserId = authUser.id

    // Fetch from Supabase PostgreSQL leads table (Audit Section 3)
    try {
      const { data: dbLeads, error } = await supabaseServer
        .from('leads')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (!error && dbLeads && dbLeads.length > 0) {
        return sendJson(res, 200, { leads: dbLeads })
      }
    } catch (e) {}

    // Fallback store scoped strictly to current user ID
    const store = readLeadsStore()
    const userLeads = store[currentUserId] || store[authUser.email] || []
    return sendJson(res, 200, { leads: Array.isArray(userLeads) ? userLeads : [] })
  }

  // 2. POST: SUBMIT INQUIRY LEAD (Public form on creator profile)
  if (req.method === 'POST') {
    const payload = await parseBody(req)
    const singleLead = payload.lead
    const batchLeads = payload.leads
    const targetUserId = payload.userId || (authUser ? authUser.id : null)

    if (!singleLead && !Array.isArray(batchLeads)) {
      return sendJson(res, 400, { error: 'Missing lead payload' })
    }

    if (targetUserId && singleLead) {
      try {
        await supabaseServer.from('leads').insert({
          user_id: targetUserId,
          lead_name: singleLead.name || 'Lead',
          lead_email: singleLead.email || '',
          lead_phone: singleLead.phone || '',
          service_type: singleLead.service || singleLead.service_type || 'General',
          message: singleLead.message || '',
          status: 'new',
        })
      } catch (dbErr) {
        console.warn('Supabase lead insert note:', dbErr.message)
      }
    }

    const store = readLeadsStore()
    const key = targetUserId || (authUser ? authUser.id : 'default')
    const list = Array.isArray(store[key]) ? store[key] : []

    if (singleLead) {
      list.unshift(singleLead)
    } else if (Array.isArray(batchLeads)) {
      list.unshift(...batchLeads)
    }

    store[key] = list
    writeLeadsStore(store)

    return sendJson(res, 200, { success: true, count: list.length })
  }

  // 3. PATCH / PUT: UPDATE LEAD STATUS
  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required' })
    }

    const payload = await parseBody(req)
    const { leadId, status } = payload

    if (!leadId || !status) {
      return sendJson(res, 400, { error: 'Missing leadId or status' })
    }

    try {
      await supabaseServer
        .from('leads')
        .update({ status })
        .eq('id', leadId)
        .eq('user_id', authUser.id)
    } catch (e) {}

    return sendJson(res, 200, { success: true, leadId, status })
  }

  sendJson(res, 405, { error: 'Method not allowed' })
}
