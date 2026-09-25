// Service Worker para Loyola's Gestão (PWA)
// Versão do cache:
const CACHE_NAME = 'loyolas-gestao-v1'

// Recursos essenciais para shell do app offline
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg',
  '/pwa-icon-maskable.svg',
  '/apple-touch-icon.svg',
  '/og-image.png',
]

self.addEventListener('install', (event) => {
  // Ativação imediata sem esperar fechamento das abas
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usa addAll resiliente: falhas individuais não quebram o install
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Falha ao pré-cachear asset:', url, err)
          }),
        ),
      )
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // 1. Apenas requisições GET
  if (req.method !== 'GET') {
    return
  }

  // 2. NUNCA interceptar chamadas de API, PocketBase ou SSE/realtime
  // Garante que SSE (/api/realtime), endpoints /api/, /backend/ e PocketBase nunca quebrem
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/backend/') ||
    url.pathname.includes('/realtime') ||
    req.headers.get('accept')?.includes('text/event-stream')
  ) {
    return
  }

  // 3. NUNCA interceptar scripts externos de infraestrutura (skip.js, etc.)
  if (url.origin !== self.location.origin) {
    // Permite cache de fontes Google Fonts se desejado, mas não mexe em APIs
    if (
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')
    ) {
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached
          return fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                const resClone = networkRes.clone()
                caches.open(CACHE_NAME).then((c) => c.put(req, resClone))
              }
              return networkRes
            })
            .catch(() => cached)
        }),
      )
    }
    return
  }

  // 4. Navegação SPA (HTML / rotas como /, /gestao, /loja, /config, etc.)
  // Estratégia: NETWORK-FIRST para sempre pegar o bundle mais recente se online,
  // com fallback para o index.html em cache se estiver offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          }
          return networkRes
        })
        .catch(async () => {
          // Se falhar (offline), busca cache da rota ou fallback pro index.html
          const cachedRoute = await caches.match(req)
          if (cachedRoute) return cachedRoute
          const cachedIndex = await caches.match('/index.html')
          if (cachedIndex) return cachedIndex
          const cachedRoot = await caches.match('/')
          if (cachedRoot) return cachedRoot
          return new Response('Offline: o painel requer carregamento prévio.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        }),
    )
    return
  }

  // 5. Assets estáticos locais (CSS, JS, SVG, imagens em /assets/ ou raiz)
  // Estratégia: CACHE-FIRST com atualização em background (stale-while-revalidate / cache first)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        if (cachedRes) {
          // Se tiver em cache, retorna de imediato e tenta atualizar em segundo plano
          fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                const resClone = networkRes.clone()
                caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
              }
            })
            .catch(() => {})
          return cachedRes
        }

        // Se não estiver em cache, busca na rede e guarda em cache
        return fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
            }
            return networkRes
          })
          .catch((err) => {
            console.warn('[SW] Falha ao buscar asset estático:', req.url, err)
            return new Response(null, { status: 404 })
          })
      }),
    )
    return
  }

  // 6. Demais requisições: Network First padrão
  event.respondWith(fetch(req).catch(() => caches.match(req)))
})
