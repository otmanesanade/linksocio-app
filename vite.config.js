import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function apiPlugin() {
  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        if (urlObj.pathname === '/api/fetch-product') {
          const queryUrl = urlObj.searchParams.get('url')
          if (!queryUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url parameter' }))
            return
          }
          try {
            const response = await fetch(queryUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkSocioBot/1.0)' },
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
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})

