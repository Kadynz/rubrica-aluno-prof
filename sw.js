const CACHE_NAME = 'rubrica-static-v1';

const CORE_ASSETS = [
    './',
    './index.html',
    './logo.png',
    './manifest.webmanifest',
    './shared/theme.js',
    './shared/utils.js',
    './aluno/',
    './aluno/index.html',
    './aluno/script.js',
    './aluno/styles.css',
    './professor/',
    './professor/index.html',
    './professor/script.js',
    './professor/styles.css'
];

const OPTIONAL_CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS).then(() => Promise.allSettled(
                OPTIONAL_CDN_ASSETS.map(url => fetch(url, { mode: 'cors' }).then(response => {
                    if (response && response.ok) return cache.put(url, response);
                    return null;
                }))
            )))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                if (!response || (!response.ok && response.type !== 'opaque')) return response;
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./aluno/index.html').then(page => page || caches.match('./index.html'));
                }
                return Response.error();
            });
        })
    );
});
