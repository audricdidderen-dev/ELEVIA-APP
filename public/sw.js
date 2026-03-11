const CACHE_NAME = 'elevia-v1.1.0'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
]

// Install: cache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Skip non-GET and Supabase API calls (always network)
  if (e.request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        }
        return response
      }).catch(() => cached)

      return cached || fetchPromise
    })
  )
})
