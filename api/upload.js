// Serverless API endpoint to upload files with authentication and storage integration
import fs from 'fs'
import path from 'path'
import { applyCors, getAuthenticatedUser } from './_supabase.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.zip', '.epub', '.mobi', '.docx', '.xlsx',
  '.mp3', '.wav', '.mp4', '.png', '.jpg', '.jpeg', '.webp'
])

export default async function handler(req, res) {
  if (applyCors(req, res)) return

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  // Require authenticated creator session (Audit Section 2)
  const authUser = await getAuthenticatedUser(req)
  if (!authUser) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Authentication required to upload files' }))
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { filename, base64, type } = body

    if (!base64 || typeof base64 !== 'string') {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'No valid base64 file data provided' }))
      return
    }

    let rawName = 'file.pdf'
    try {
      rawName = decodeURIComponent(filename || 'file.pdf')
    } catch (_) {
      rawName = filename || 'file.pdf'
    }

    const ext = (path.extname(rawName) || '.bin').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: `File type '${ext}' is not permitted.` }))
      return
    }

    let cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').slice(0, 60)
    if (!cleanBase || cleanBase === '_') cleanBase = 'product'
    const uniqueName = `${Date.now()}_${cleanBase}${ext}`

    let base64Data = base64
    const base64Index = base64.indexOf('base64,')
    if (base64Index !== -1) {
      base64Data = base64.slice(base64Index + 7)
    } else {
      base64Data = base64.replace(/^data:.*?;base64,/, '')
    }
    base64Data = base64Data.trim()

    const buffer = Buffer.from(base64Data, 'base64')
    const mime = type || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream')
    const fullDataUrl = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64Data}`

    let finalUrl = null
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      const distUploadsDir = path.join(process.cwd(), 'dist', 'uploads')
      if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(distUploadsDir)) {
        try {
          fs.mkdirSync(distUploadsDir, { recursive: true })
        } catch (_) {}
      }

      const filePath = path.join(uploadsDir, uniqueName)
      fs.writeFileSync(filePath, buffer)

      if (fs.existsSync(distUploadsDir)) {
        try {
          fs.copyFileSync(filePath, path.join(distUploadsDir, uniqueName))
        } catch (_) {}
      }
      finalUrl = `/uploads/${uniqueName}`
    } catch (fsErr) {
      finalUrl = fullDataUrl
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        success: true,
        url: finalUrl,
        filename: rawName,
        size: buffer.length,
        type: mime,
        storage: finalUrl.startsWith('data:') ? 'direct_data' : 'server_disk',
      })
    )
  } catch (err) {
    console.error('Upload handler error:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Upload failed' }))
  }
}
