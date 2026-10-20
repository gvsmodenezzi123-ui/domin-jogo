/**
 * Tudo que o jogo guarda no aparelho (localStorage), num lugar só:
 *   buxaria:run         save da run (engine/save.js) para o CONTINUAR
 *   buxaria:collection  o que você já viu: talismãs, pedras de grife e rivais (Livro de Boteco)
 *   buxaria:settings    volume dos efeitos, da música e vibração
 *
 * Sem storage (aba privada, Safari bloqueando) tudo continua funcionando,
 * só não sobrevive ao fechar o app.
 */

import { isValidSave } from './save.js';

const RUN_KEY = 'buxaria:run';
const COLLECTION_KEY = 'buxaria:collection';
const SETTINGS_KEY = 'buxaria:settings';

function read(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* sem storage: vale só nesta sessão */
  }
}

// ---------------------------------------------------------------------------
// Save da run
// ---------------------------------------------------------------------------

export function loadRunSave() {
  const save = read(RUN_KEY);
  return isValidSave(save) ? save : null;
}

export const hasRunSave = () => loadRunSave() !== null;

export const writeRunSave = (save) => write(RUN_KEY, save);

export const clearRunSave = () => write(RUN_KEY, null);

// ---------------------------------------------------------------------------
// Coleção (Livro de Boteco)
// ---------------------------------------------------------------------------

const EMPTY_COLLECTION = Object.freeze({ relics: [], tiles: [], rivals: [] });

export function loadCollection() {
  const data = read(COLLECTION_KEY);
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  return { relics: list(data?.relics), tiles: list(data?.tiles), rivals: list(data?.rivals) };
}

/**
 * Junta o que apareceu agora ao que já estava no livro. Devolve a coleção
 * nova (ou a mesma, se nada era novo) e grava só quando muda.
 */
export function discover(collection, seen) {
  let changed = false;
  const next = { ...collection };
  for (const kind of Object.keys(EMPTY_COLLECTION)) {
    const fresh = (seen[kind] ?? []).filter((id) => id && !next[kind].includes(id));
    if (fresh.length) {
      next[kind] = [...next[kind], ...new Set(fresh)];
      changed = true;
    }
  }
  if (!changed) return collection;
  write(COLLECTION_KEY, next);
  return next;
}

// ---------------------------------------------------------------------------
// Opções
// ---------------------------------------------------------------------------

/** Volumes padrão do motor de som (engine/audioSynth.js). */
export const DEFAULT_SETTINGS = Object.freeze({ sfx: 0.7, music: 0.4, haptics: true });

const clamp01 = (v, fallback) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);

export function loadSettings() {
  const data = read(SETTINGS_KEY);
  return {
    sfx: clamp01(data?.sfx, DEFAULT_SETTINGS.sfx),
    music: clamp01(data?.music, DEFAULT_SETTINGS.music),
    haptics: typeof data?.haptics === 'boolean' ? data.haptics : DEFAULT_SETTINGS.haptics,
  };
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
  haptics.enabled = settings.haptics;
}

/** "Resetar progresso": apaga a run salva e o Livro de Boteco (as opções ficam). */
export function resetProgress() {
  write(RUN_KEY, null);
  write(COLLECTION_KEY, null);
  return { ...EMPTY_COLLECTION, relics: [], tiles: [], rivals: [] };
}

// ---------------------------------------------------------------------------
// Vibração (respeita a opção)
// ---------------------------------------------------------------------------

export const haptics = {
  enabled: loadSettings().haptics,
  vibrate(pattern) {
    if (!this.enabled) return;
    try {
      globalThis.navigator?.vibrate?.(pattern);
    } catch {
      /* sem vibração neste aparelho */
    }
  },
};

export const haptic = (pattern) => haptics.vibrate(pattern);
