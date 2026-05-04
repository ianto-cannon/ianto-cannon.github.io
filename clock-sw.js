// Install event
// Runs when the service worker is first installed or updated.
// skipWaiting() forces the new service worker to move immediately
// to the activation phase instead of staying in "waiting".
self.addEventListener('install', event => {
  self.skipWaiting();
});
// Activate event
// Runs when the service worker becomes active and takes control.
// This is typically where cleanup and migration logic is done.
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Get all cache names stored by this origin
      const keys = await caches.keys();
      // Delete every cache found (full cleanup of cached assets)
      await Promise.all(
        keys.map(key => caches.delete(key))
      );
      // Unregister this service worker completely
      // After this, it will no longer control any pages
      await self.registration.unregister();
    })()
  );
});
