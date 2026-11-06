self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  event.waitUntil(self.skipWaiting()); // 즉시 활성화
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
  event.waitUntil(self.clients.claim()); // 기존 페이지에 즉시 적용
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ✅ 오디오는 가로채지 않음
  // 미디어 요소는 Range 요청으로 음원을 조금씩 받아간다. 서비스워커가 fetch() 로
  // 대신 받아 넘기면 교차 출처 음원이 opaque 응답이 되어 사파리에서 재생이 끊긴다.
  // respondWith 를 부르지 않으면 브라우저가 직접 처리한다.
  if (event.request.destination === "audio") {
    return;
  }

  // ✅ 폰트 파일 캐싱
  if (
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".otf")
  ) {
    event.respondWith(
      caches.open("font-cache").then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          const fetchAndUpdate = fetch(event.request)
            .then((response) => {
              cache.put(event.request, response.clone()); // 최신 폰트 캐싱
              return response;
            })
            .catch(() => cachedResponse); // 네트워크 실패 시 캐시 사용

          return cachedResponse || fetchAndUpdate;
        }),
      ),
    );
  } else if (url.pathname.startsWith("/images/")) {
    // ✅ 이미지 파일 캐싱
    event.respondWith(
      caches.open("image-cache").then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          const fetchAndUpdate = fetch(event.request)
            .then((response) => {
              cache.put(event.request, response.clone()); // 최신 이미지 캐싱
              return response;
            })
            .catch(() => cachedResponse); // 네트워크 실패 시 캐시 사용

          return cachedResponse || fetchAndUpdate;
        }),
      ),
    );
  } else {
    // ✅ 그 외 요청은 항상 네트워크에서 가져오기
    event.respondWith(fetch(event.request));
  }
});
