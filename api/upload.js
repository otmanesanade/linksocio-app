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
    const { filename, base64, type } = req.body || {}

    if (!base64) {
      res.status(400).json({ error: 'No file data provided' })
      return
    }

    const rawName = filename || 'digital_product'
    const ext = path.extname(rawName) || '.bin'
    const cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_')
    const uniqueName = `${Date.now()}_${cleanBase}${ext}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const base64Data = base64.replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const filePath = path.join(uploadsDir, uniqueName)
    fs.writeFileSync(filePath, buffer)

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
