const CACHE_NAME = 'elevia-v2.5.0'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
]

// Install: cache shell + skip waiting immediately
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean ALL old caches + claim clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: NETWORK-FIRST for HTML/JS, cache as fallback for offline
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Skip non-GET and external APIs
  if (e.request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return

  // Network-first: try network, cache the response, fallback to cache if offline
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        }
        return response
      })
      .catch(() => caches.match(e.request))
  )
})
