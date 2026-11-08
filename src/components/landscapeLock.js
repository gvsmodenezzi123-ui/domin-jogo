/**
 * Versão 2.12: o jogo é deitado. No toque de entrada (AccessGate), no celular e no tablet, o
 * jogo pede a tela cheia e trava a tela na horizontal (é o que o Android deixa fazer a partir de
 * um toque). Onde o sistema não deixa travar (o Safari do iPhone), o aviso de GIRE O CELULAR
 * cobre a tela enquanto ela estiver em pé. No computador não faz nada. No app Android, o próprio
 * app já nasce deitado (sensorLandscape no manifesto).
 */

const coarse = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);

/** Dá para pedir a tela cheia daqui (o iPhone não deixa: lá fica o aviso de girar)? */
export function canForceLandscape() {
  if (typeof document === 'undefined' || !coarse()) return false;
  const el = document.documentElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

function lockLandscape() {
  try {
    const pending = window.screen?.orientation?.lock?.('landscape');
    pending?.catch?.(() => {});
  } catch {
    /* o sistema não deixa travar: fica o aviso de girar */
  }
}

/** Chamar dentro do toque (o navegador só deixa a tela cheia a partir de um gesto). */
export function enterLandscape() {
  if (!coarse() || import.meta.env?.VITE_NATIVE === '1') return;
  const el = document.documentElement;
  let pending = null;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) pending = el.requestFullscreen({ navigationUI: 'hide' });
    else if (!document.webkitFullscreenElement && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch {
    pending = null;
  }
  if (pending?.then) pending.then(lockLandscape, lockLandscape);
  else lockLandscape();
}
