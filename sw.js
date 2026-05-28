const CACHE_NAME = 'nachi-repair-v1';
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
  // Skip Google APIs and LINE (always need network)
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('api.line.me') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('jsdelivr.net')) {
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
