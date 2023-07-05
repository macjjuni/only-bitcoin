// sw.js

// install event
self.addEventListener('install', (e) => {
  console.warn('[Service Worker] installed')
})

// activate event
self.addEventListener('activate', (e) => {
  console.warn('[Service Worker] actived', e)
})

// fetch event
self.addEventListener('fetch', (e) => {
  console.warn('[Service Worker] fetched resource ' + e.request.url)
})

self.addEventListener('message', (e) => {
  console.warn('[Service Worker] Socket resource ' + e.request.url)
})
