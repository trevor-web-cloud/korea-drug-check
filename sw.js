/* 韓國入境管制藥品查詢頁 — Service Worker（離線快取）
 * 版號由 build_index.py 寫入，每次重建更新；版號變更時舊快取自動清除。
 */
const CACHE_NAME = 'korea-drug-check-2026-10-30-52b096d69f';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // 導覽請求：network-first（2026-10-12 使用者要求根治舊快取問題）。
  // 回訪者改版後直接拿到最新 HTML；離線或網路失敗時退回快取，離線仍可用。
  // 成功時把新回應寫回快取，保持離線副本新鮮。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res && typeof res.clone === 'function') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
