
const CACHE_NAME = 'ajinkya-novel-helper-cache-v9-deep-analysis';

// Only cache the absolute essentials for the app shell here.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  // External static assets (CDNs) defined in index.html
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/docx@8.5.0/build/index.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the new service worker to become active immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(err => {
            console.warn('Some assets failed to cache during install:', err);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages immediately
  );
});

self.addEventListener('fetch', (event) => {
    // 1. Ignore non-http/https requests (like chrome-extension://)
    if (!event.request.url.startsWith('http')) {
        return;
    }

    // 2. Handle API requests (Firebase/Gemini): Network Only
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('generativelanguage.googleapis.com') ||
        event.request.url.includes('googleapis.com')) {
        return; // Let the browser handle it (Network only)
    }

    // 3. Handle Navigation (HTML): Network First, fall back to Cache (App Shell)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match('/index.html');
                })
        );
        return;
    }

    // 4. Handle Assets (JS, CSS, Images): Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request)
        .then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then(
                (networkResponse) => {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                        return networkResponse;
                    }

                    // Cache the new response for next time
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }
            ).catch(() => {
                // Network failed, handled by returning cachedResponse below or undefined
            });

            // Return cached response immediately if available, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});
