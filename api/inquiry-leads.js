// Server endpoint to record, retrieve and update inquiry leads with RBAC and Supabase persistence
import { applyCors, getAuthenticatedUser, getSupabaseServerClient } from './_supabase.js'

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

  const { client: supabase, error: clientErr } = getSupabaseServerClient()
  if (clientErr || !supabase) {
    console.error('Database connection error in inquiry-leads:', clientErr)
    return sendJson(res, 500, {
      error: 'Database connection unavailable. Operation failed securely.',
    })
  }

  // 1. GET: Fetch creator's private leads (Audit Point 2 & 4: Protected route with Supabase only)
  if (req.method === 'GET') {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, {
        error: 'Authentication required. Private leads cannot be accessed without an active session.',
      })
    }

    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database query error in leads GET:', error.message)
        return sendJson(res, 500, { error: 'Database error fetching leads' })
      }

      return sendJson(res, 200, { leads: leads || [] })
    } catch (err) {
      console.error('Unexpected error in GET leads:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 2. POST: Submit inquiry lead (Public customer submitting on creator's page)
  if (req.method === 'POST') {
    try {
      const payload = await parseBody(req)
      const lead = payload.lead || payload
      const targetUserId = payload.userId || lead.userId

      if (!targetUserId) {
        return sendJson(res, 400, { error: 'Missing target creator userId' })
      }

      const leadName = (lead.name || lead.lead_name || '').trim()
      const leadEmail = (lead.email || lead.lead_email || '').trim()
      const leadPhone = (lead.phone || lead.lead_phone || '').trim()
      const serviceType = lead.service || lead.service_type || 'General'
      const message = lead.message || ''

      if (!leadName || (!leadEmail && !leadPhone)) {
        return sendJson(res, 400, { error: 'Name and email or phone number are required' })
      }

      // Verify target creator exists in profiles
      const { data: creatorProfile, error: profErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', targetUserId)
        .maybeSingle()

      if (profErr || !creatorProfile) {
        return sendJson(res, 400, { error: 'Target creator profile not found' })
      }

      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          user_id: targetUserId,
          lead_name: leadName,
          lead_email: leadEmail,
          lead_phone: leadPhone,
          service_type: serviceType,
          message,
          status: 'new',
        })
        .select()
        .single()

      if (insertErr) {
        console.error('Database insert error in leads POST:', insertErr.message)
        return sendJson(res, 500, { error: 'Database error creating lead' })
      }

      return sendJson(res, 200, { success: true, lead: newLead })
    } catch (err) {
      console.error('Unexpected error in POST leads:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  // 3. PATCH: Update lead status (Restricted to authenticated creator)
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return sendJson(res, 401, { error: 'Authentication required' })
    }

    try {
      const payload = await parseBody(req)
      const { leadId, status } = payload

      if (!leadId || !status) {
        return sendJson(res, 400, { error: 'Missing leadId or status' })
      }

      const { data: updated, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId)
        .eq('user_id', authUser.id)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Database update error in leads PATCH:', error.message)
        return sendJson(res, 500, { error: 'Database error updating lead status' })
      }

      if (!updated) {
        return sendJson(res, 404, { error: 'Lead not found or not owned by caller' })
      }

      return sendJson(res, 200, { success: true, lead: updated })
    } catch (err) {
      console.error('Unexpected error in PATCH leads:', err)
      return sendJson(res, 500, { error: 'Internal server error' })
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
