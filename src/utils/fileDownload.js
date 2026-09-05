/**
 * Robust Cross-Device File Download Utility
 * Handles Data URIs (Base64), Blob URLs, Server uploads, and Cloud storage links.
 * Works seamlessly on iOS Safari, Android Chrome, In-App WebViews, and Desktop browsers.
 */

export function sanitizeFileUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  let clean = rawUrl.trim()
  // Strip any accidental https:// or http:// prefix added to data: or blob:
  if (/^https?:\/\/(data:|blob:)/i.test(clean)) {
    clean = clean.replace(/^https?:\/\//i, '')
  }
  return clean
}

export function dataUriToBlob(dataUri) {
  try {
    const cleanUri = sanitizeFileUrl(dataUri)
    const commaIdx = cleanUri.indexOf(',')
    if (commaIdx === -1) return null

    const meta = cleanUri.slice(0, commaIdx)
    const mimeMatch = meta.match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf'
    const base64Data = cleanUri.slice(commaIdx + 1)
    const binaryStr = atob(base64Data.trim())
    const len = binaryStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  } catch (err) {
    console.error('Failed to convert data URI to blob:', err)
    return null
  }
}

export function getCleanDownloadName(productName, rawFileName, fallbackExt = '.pdf') {
  let name = (rawFileName || '').trim()
  if (!name || name === '.' || name.startsWith('data:')) {
    if (productName && typeof productName === 'string') {
      name = productName.trim().replace(/[^a-zA-Z0-9_\-\u0600-\u06FF\s]/g, '_')
    } else {
      name = 'digital_product'
    }
  }

  if (!name.includes('.')) {
    name = `${name}${fallbackExt}`
  }
  return name
}

export async function downloadFile(rawUrl, desiredFileName) {
  const url = sanitizeFileUrl(rawUrl)
  if (!url) {
    throw new Error('No valid file URL provided for download.')
  }

  const fileName = getCleanDownloadName('', desiredFileName)
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream

  // 1. Data URI -> Convert to standard Blob URL for 100% native browser support
  if (url.startsWith('data:')) {
    const blob = dataUriToBlob(url)
    if (!blob) throw new Error('Invalid or corrupted file data.')

    const blobUrl = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    link.rel = 'noopener noreferrer'
    link.target = isIOS ? '_blank' : '_self'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // On iOS Safari, opening the blob URL directly opens it in the built-in PDF viewer
    if (isIOS) {
      window.open(blobUrl, '_blank')
    }

    // Keep blob URL alive so the user can also click manual download button if desired
    return { blobUrl, fileName }
  }

  // 2. Blob URL
  if (url.startsWith('blob:')) {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return { blobUrl: url, fileName }
  }

  // 3. Server Files (/uploads/ or /api/download)
  if (url.startsWith('/uploads/') || url.startsWith('/api/download')) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Server status ${res.status}`)
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('text/html')) throw new Error('Server returned HTML')

      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.target = isIOS ? '_blank' : '_self'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      if (isIOS) {
        window.open(blobUrl, '_blank')
      }
      return { blobUrl, fileName }
    } catch (fetchErr) {
      console.warn('Direct blob fetch failed, falling back to server download stream:', fetchErr)
      const fallbackUrl = `/api/download?file=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`
      window.location.href = fallbackUrl
      return { blobUrl: fallbackUrl, fileName }
    }
  }

  // 4. External Cloud Links (Google Drive, Dropbox, Notion, Canva, external websites)
  window.open(url, '_blank')
  return { blobUrl: url, fileName }
}
