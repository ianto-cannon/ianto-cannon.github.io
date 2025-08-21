const CACHE_NAME = 'clock-cache-v1';
const urlsToCache = [
  '/',
  'clock.html',
  'clock.css',
  'dark.css',
  'common.css',
  'clock.js',
  'common.js',
  'favicon.svg',
  'sa.svg',
  'cc.svg',
  'by.svg'
];

// Install event – caching all files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event – serve from cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Activate event – clean old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (!cacheWhitelist.includes(key)) return caches.delete(key);
        })
      )
    )
  );
});
