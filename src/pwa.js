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
  // no APK (Capacitor) os arquivos já moram dentro do app: sem service worker
  if (import.meta.env.VITE_NATIVE === '1') return;
  // dentro de um iframe (a prévia jogável, um artifact) o jogo não vira app: sem service worker
  try {
    if (window.self !== window.top) return;
  } catch {
    return; // iframe de outra origem: nem dá para perguntar
  }
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

/**
 * Versão 2.10.1: a altura do jogo segue a janela de verdade. No iPhone deitado (app instalado
 * e Safari) o 100% do CSS pode ficar menor que a tela depois de girar, e sobrava uma faixa
 * preta embaixo: a altura medida vira a variável --app-h (o CSS usa ela no html, body e #root).
 */
export function installViewportFit() {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const fit = () => {
    const h = Math.round(Math.max(window.innerHeight || 0, window.visualViewport?.height || 0));
    if (h > 0) root.style.setProperty('--app-h', `${h}px`);
  };
  fit();
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  // o Safari só acerta a medida um tempo depois de girar
  window.addEventListener('orientationchange', () => {
    fit();
    setTimeout(fit, 120);
    setTimeout(fit, 500);
  });
}
