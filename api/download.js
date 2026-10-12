// Serverless API endpoint for downloading uploaded digital product files
import fs from 'fs'
import path from 'path'
import os from 'os'
import { applyCors } from './_supabase.js'

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.epub': 'application/epub+zip',
  '.mobi': 'application/x-mobipocket-ebook',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return

  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type')

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const queryFile = urlObj.searchParams.get('file') || urlObj.searchParams.get('url') || ''
  const customDownloadName = urlObj.searchParams.get('name') || ''

  if (!queryFile) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing file parameter' }))
    return
  }

  // If queryFile is a Data URI, decode and stream it directly
  if (queryFile.startsWith('data:')) {
    try {
      const commaIdx = queryFile.indexOf(',')
      const meta = queryFile.slice(5, commaIdx)
      const mime = meta.split(';')[0] || 'application/pdf'
      const base64Content = queryFile.slice(commaIdx + 1)
      const buffer = Buffer.from(base64Content, 'base64')

      const dlName = customDownloadName || 'digital_product.pdf'
      const encodedName = encodeURIComponent(dlName)

      res.setHeader('Content-Type', mime)
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Content-Disposition', `attachment; filename="${dlName.replace(/["\r\n]/g, '_')}"; filename*=UTF-8''${encodedName}`)
      res.statusCode = 200
      res.end(buffer)
      return
    } catch (e) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Failed to decode data URI' }))
      return
    }
  }

  // Prevent path traversal
  const fileName = path.basename(decodeURIComponent(queryFile))
  if (!fileName || fileName === '.' || fileName === '/' || fileName.includes('..')) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid file name' }))
    return
  }

  const possibleDirs = [
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'dist', 'uploads'),
    path.join(os.tmpdir(), 'uploads'),
    path.join(os.tmpdir()),
  ]

  let targetPath = null
  for (const dir of possibleDirs) {
    const candidate = path.join(dir, fileName)
    if (fs.existsSync(candidate)) {
      targetPath = candidate
      break
    }
  }

  if (targetPath) {
    try {
      const stat = fs.statSync(targetPath)
      const ext = path.extname(fileName).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      const cleanDownloadName = customDownloadName || fileName.replace(/^\d+_/, '')
      const encodedName = encodeURIComponent(cleanDownloadName)

      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', stat.size)
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanDownloadName.replace(/["\r\n]/g, '_')}"; filename*=UTF-8''${encodedName}`
      )
      res.statusCode = 200
      const stream = fs.createReadStream(targetPath)
      return stream.pipe(res)
    } catch (e) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Stream error' }))
      return
    }
  }

  // If not found locally, redirect safely if external URL
  if (queryFile.startsWith('http://') || queryFile.startsWith('https://')) {
    res.statusCode = 302
    res.setHeader('Location', queryFile)
    res.end()
    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'File not found on server' }))
}
