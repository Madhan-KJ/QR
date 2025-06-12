self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("fetch", e => {
  // Basic shell cache or just pass-through
});
