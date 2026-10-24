/*
 * Service worker do Buxaria: o jogo funciona offline depois da primeira visita.
 *  - navegação: rede primeiro, cai no index.html do cache sem internet;
 *  - outras páginas (a Política de Privacidade, Patch 0.9.7): rede primeiro, guardadas com o
 *    próprio endereço (nunca no lugar do index.html do jogo);
 *  - arquivos (JS/CSS com hash, fontes, ícones): cache primeiro.
 * Troque CACHE_VERSION a cada release para limpar caches antigos.
 */
const CACHE_VERSION = 'buxaria-v1.1.0';
const CORE = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // o jogo é a raiz do escopo (ou o index.html dela); qualquer outra página é só ela mesma
    const root = new URL('./', self.location.href).pathname;
    const shell = url.pathname === root || url.pathname === `${root}index.html`;
    const key = shell ? './index.html' : request;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(key, copy));
          }
          return response;
        })
        .catch(() => caches.match(key).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
