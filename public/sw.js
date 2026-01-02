self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(self.skipWaiting()); // 즉시 활성화
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
  event.waitUntil(self.clients.claim()); // 기존 페이지에 즉시 적용
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ✅ 폰트 파일 캐싱
  if (url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.otf')) {
    
    event.respondWith(
      caches.open('font-cache').then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          const fetchAndUpdate = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone()); // 최신 폰트 캐싱
            return response;
          }).catch(() => cachedResponse); // 네트워크 실패 시 캐시 사용
          
          return cachedResponse || fetchAndUpdate;
        })
      )
    );
    
  } else if (url.pathname.startsWith('/images/')) {
    // ✅ 이미지 파일 캐싱
    event.respondWith(
      caches.open('image-cache').then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          const fetchAndUpdate = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone()); // 최신 이미지 캐싱
            return response;
          }).catch(() => cachedResponse); // 네트워크 실패 시 캐시 사용
          
          return cachedResponse || fetchAndUpdate;
        })
      )
    );
    
  } else {
    // ✅ 그 외 요청은 항상 네트워크에서 가져오기
    event.respondWith(fetch(event.request));
  }
});
