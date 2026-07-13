// รวม OneSignal Push SDK เข้ากับ Service Worker เดิม (1 scope ใช้ SW ได้แค่ตัวเดียว)
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'nachi-repair-v3';
const URLS_TO_CACHE = [
  '/electrical-repair/',
  '/electrical-repair/index.html'
];

// Install - cache files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', function(event) {
  // Skip Google APIs, LINE, Supabase (REST+Storage) และ OneSignal — ต้องผ่านเน็ตตรง ห้ามดัก/cache เด็ดขาด
  // (Supabase ใช้ POST/PATCH ตอนอัปโหลดรูป/บันทึกงาน ถ้าโดน SW ดักไปพยายาม cache จะพังได้)
  if (event.request.method !== 'GET' ||
      event.request.url.includes('script.google.com') ||
      event.request.url.includes('api.line.me') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('jsdelivr.net') ||
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('onesignal.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Network failed - use cache
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('/electrical-repair/index.html');
        });
      })
  );
});
