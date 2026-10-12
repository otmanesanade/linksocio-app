import { applyCors } from './_supabase.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return

  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`)
  const targetUrl = req.query?.url || urlObj.searchParams.get('url')

  if (!targetUrl) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  // SSRF Protection: validate protocol and host
  try {
    const parsed = new URL(targetUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid URL protocol' }))
      return
    }

    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Prohibited target host' }))
      return
    }

    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkSocioBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    })

    const html = await response.text()

    const titleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)

    const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)

    const priceMatch =
      html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        title: titleMatch ? titleMatch[1].trim() : null,
        image: imageMatch ? imageMatch[1].trim() : null,
        price: priceMatch ? priceMatch[1].trim() : null,
      })
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Failed to fetch product info' }))
  }
}
