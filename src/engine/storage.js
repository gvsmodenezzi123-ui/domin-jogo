/**
 * Acesso ao localStorage com reserva em memória (aba privada, Safari bloqueando,
 * testes no Node): o que não couber no aparelho vale até fechar o app. Usado pelas
 * conquistas (engine/achievements.js) e pela meta-progressão (engine/meta.js).
 *
 * `announce(detail)` dispara o evento global `buxaria-achievement`, que o App
 * transforma no aviso do alto da tela (AchievementToast.jsx).
 */

export const ACHIEVEMENT_EVENT = 'buxaria-achievement';

const memory = new Map();

export function readRaw(key) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    if (value !== null && value !== undefined) return value;
  } catch {
    /* sem storage */
  }
  return memory.has(key) ? memory.get(key) : null;
}

export function writeRaw(key, value) {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    /* sem storage: vale só nesta sessão */
  }
}

export function readJson(key, fallback) {
  try {
    const raw = readRaw(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const writeJson = (key, value) => writeRaw(key, value === null ? null : JSON.stringify(value));

/** Avisa o App (aviso no alto da tela). Devolve o próprio `detail`. */
export function announce(detail) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(ACHIEVEMENT_EVENT, { detail }));
  }
  return detail;
}
