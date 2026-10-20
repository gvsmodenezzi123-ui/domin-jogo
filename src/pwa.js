/**
 * Suporte PWA: bloqueio de zoom por gesto (o viewport já bloqueia, mas o
 * Safari ignora `user-scalable=no` fora do modo app) e registro do service worker.
 */

export function installTouchGuards() {
  if (typeof document === 'undefined') return;
  const block = (event) => event.preventDefault();
  // pinça no Safari
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('gestureend', block, { passive: false });
  // pinça com dois dedos em outros navegadores
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) event.preventDefault();
    },
    { passive: false },
  );
  // sem menu de contexto em toque longo
  document.addEventListener('contextmenu', block);
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
        console.warn('Service worker não registrado:', error);
      });
    } catch (error) {
      // páginas em iframe isolado (ex.: prévias) não permitem service worker
      console.warn('Service worker indisponível aqui:', error);
    }
  });
}
