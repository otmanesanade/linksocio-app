// Serverless API endpoint to upload files from desktop (PDF, ZIP, Audio, etc.)
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { filename, base64, type } = body

    if (!base64 || typeof base64 !== 'string') {
      res.status(400).json({ error: 'No valid base64 file data provided' })
      return
    }

    let rawName = 'file.pdf'
    try {
      rawName = decodeURIComponent(filename || 'file.pdf')
    } catch (_) {
      rawName = filename || 'file.pdf'
    }

    const ext = (path.extname(rawName) || '.bin').toLowerCase()
    let cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').slice(0, 60)
    if (!cleanBase || cleanBase === '_') cleanBase = 'product'
    const uniqueName = `${Date.now()}_${cleanBase}${ext}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const distUploadsDir = path.join(process.cwd(), 'dist', 'uploads')
    if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(distUploadsDir)) {
      fs.mkdirSync(distUploadsDir, { recursive: true })
    }

    let base64Data = base64
    const base64Index = base64.indexOf('base64,')
    if (base64Index !== -1) {
      base64Data = base64.slice(base64Index + 7)
    } else {
      base64Data = base64.replace(/^data:.*?;base64,/, '')
    }
    base64Data = base64Data.trim()

    const buffer = Buffer.from(base64Data, 'base64')
    const filePath = path.join(uploadsDir, uniqueName)
    fs.writeFileSync(filePath, buffer)

    if (fs.existsSync(distUploadsDir)) {
      try {
        fs.copyFileSync(filePath, path.join(distUploadsDir, uniqueName))
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      url: `/uploads/${uniqueName}`,
      filename: rawName,
      size: buffer.length,
      type: type || 'application/octet-stream',
    })
  } catch (err) {
    console.error('Upload handler error:', err)
    return res.status(500).json({ error: 'Upload failed: ' + err.message })
  }
}
