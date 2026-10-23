/**
 * Meta-progressão gravada no aparelho (Patch 0.8.0). "Apagar tudo" não mexe nisso.
 *
 *   buxaria_gold_caps               Tampinhas Douradas (número)
 *   buxaria_black_tiles_unlocked    'true' depois de derrotar o Comendador nas Peças
 *                                   Brancas: libera as Peças Pretas (modo difícil).
 *                                   Quem tinha a Maleta Preta aberta (0.6.3,
 *                                   `buxaria_hard_mode_unlocked`) já vem liberado.
 *   buxaria_silver_tiles_unlocked   'true' depois de derrotar o Comendador nas Peças
 *                                   Pretas: libera as Peças Prateadas (Modo Inferno, 0.9.0).
 *   buxaria:upgrades                melhorias da Conta do Boteco compradas
 *   buxaria:maletas                 maletas liberadas no Balcão (a Clássica sempre)
 *   buxaria:maletas_seen            maletas que já mostraram as correntes caindo
 *   buxaria:challenges              { unlocked, done }: desafios liberados e concluídos
 *   buxaria:frame                   moldura equipada (de um desafio concluído)
 *   buxaria:meta_tranca_wins        rodadas vencidas por tranca (somando as runs)
 *   buxaria:meta_run_relics         talismãs comprados nesta run ({ seed, ids })
 */

import { MALETAS, MALETA_IDS, DEFAULT_MALETA } from '../data/maletas.js';
import { CHALLENGES, CHALLENGE_IDS, UPGRADES, UPGRADE_IDS } from '../data/meta.js';
import { announce, readJson, readRaw, writeJson, writeRaw } from './storage.js';

export const GOLD_CAPS_KEY = 'buxaria_gold_caps';
export const BLACK_TILES_KEY = 'buxaria_black_tiles_unlocked';
export const SILVER_TILES_KEY = 'buxaria_silver_tiles_unlocked';
/** Chave antiga das Peças Pretas (Patch 0.6.3): vale como Peças Pretas liberadas. */
export const LEGACY_HARD_KEY = 'buxaria_hard_mode_unlocked';

const KEYS = {
  upgrades: 'buxaria:upgrades',
  maletas: 'buxaria:maletas',
  maletasSeen: 'buxaria:maletas_seen',
  challenges: 'buxaria:challenges',
  frame: 'buxaria:frame',
  trancaWins: 'buxaria:meta_tranca_wins',
  runRelics: 'buxaria:meta_run_relics',
};

// quem mostra tampinhas, melhorias ou desbloqueios na tela assina aqui (useSyncExternalStore)
const listeners = new Set();

export function subscribeMeta(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function changed() {
  for (const fn of [...listeners]) fn();
}

const toInt = (raw) => {
  const n = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// ---------------------------------------------------------------------------
// Tampinhas Douradas
// ---------------------------------------------------------------------------

export const loadGoldCaps = () => toInt(readRaw(GOLD_CAPS_KEY));

export function addGoldCaps(amount) {
  const total = loadGoldCaps() + Math.max(0, Math.floor(amount));
  writeRaw(GOLD_CAPS_KEY, String(total));
  changed();
  return total;
}

// ---------------------------------------------------------------------------
// A Conta do Boteco (melhorias permanentes)
// ---------------------------------------------------------------------------

export const loadUpgrades = () => readJson(KEYS.upgrades, []).filter((id) => UPGRADES[id]);

/** Compra a melhoria com tampinhas. Devolve { ok, caps, upgrades } (ok falso: já tem ou não tem saldo). */
export function buyUpgrade(id) {
  const upgrade = UPGRADES[id];
  const owned = loadUpgrades();
  const caps = loadGoldCaps();
  if (!upgrade || owned.includes(id) || caps < upgrade.cost) return { ok: false, caps, upgrades: owned };
  const upgrades = UPGRADE_IDS.filter((u) => u === id || owned.includes(u));
  writeRaw(GOLD_CAPS_KEY, String(caps - upgrade.cost));
  writeJson(KEYS.upgrades, upgrades);
  changed();
  return { ok: true, caps: caps - upgrade.cost, upgrades };
}

// ---------------------------------------------------------------------------
// Peças Pretas (modo difícil)
// ---------------------------------------------------------------------------

export const isBlackTilesUnlocked = () => readRaw(BLACK_TILES_KEY) === 'true' || readRaw(LEGACY_HARD_KEY) === 'true';

export function saveBlackTilesUnlocked(on = true) {
  writeRaw(BLACK_TILES_KEY, on ? 'true' : null);
  // a chave antiga também abriria: trancar (DEV) apaga as duas
  if (!on) writeRaw(LEGACY_HARD_KEY, null);
  changed();
}

// ---------------------------------------------------------------------------
// Peças Prateadas (Modo Inferno, Patch 0.9.0)
// ---------------------------------------------------------------------------

export const isSilverTilesUnlocked = () => readRaw(SILVER_TILES_KEY) === 'true';

export function saveSilverTilesUnlocked(on = true) {
  writeRaw(SILVER_TILES_KEY, on ? 'true' : null);
  changed();
}

// ---------------------------------------------------------------------------
// Maletas do Balcão
// ---------------------------------------------------------------------------

export function loadUnlockedMaletas() {
  const saved = readJson(KEYS.maletas, []);
  return MALETA_IDS.filter((id) => id === DEFAULT_MALETA || saved.includes(id));
}

export const isMaletaUnlocked = (id) => loadUnlockedMaletas().includes(id);

/** Libera a maleta (com aviso no alto da tela). Devolve true se ela acabou de sair. */
export function unlockMaleta(id) {
  const maleta = MALETAS[id];
  if (!maleta || isMaletaUnlocked(id)) return false;
  writeJson(KEYS.maletas, [...loadUnlockedMaletas().filter((m) => m !== DEFAULT_MALETA), id]);
  changed();
  announce({ id: `maleta:${id}`, kind: 'maleta', kicker: 'MALETA DESBLOQUEADA!', title: maleta.name, line: 'Ela já espera no Balcão de Maletas.' });
  return true;
}

export const loadSeenMaletas = () => readJson(KEYS.maletasSeen, []);

export function markMaletasSeen(ids) {
  const seen = new Set([...loadSeenMaletas(), ...ids]);
  writeJson(KEYS.maletasSeen, [...seen]);
}

// ---------------------------------------------------------------------------
// Desafios e molduras
// ---------------------------------------------------------------------------

export function loadChallenges() {
  const saved = readJson(KEYS.challenges, {});
  const pick = (list) => CHALLENGE_IDS.filter((id) => Array.isArray(list) && list.includes(id));
  return { unlocked: pick(saved.unlocked), done: pick(saved.done) };
}

function saveChallenges(next) {
  writeJson(KEYS.challenges, { unlocked: next.unlocked, done: next.done });
}

/** Libera o desafio (com aviso). Devolve true se ele acabou de sair. */
export function unlockChallenge(id) {
  const challenge = CHALLENGES[id];
  const current = loadChallenges();
  if (!challenge || current.unlocked.includes(id)) return false;
  saveChallenges({ ...current, unlocked: CHALLENGE_IDS.filter((c) => c === id || current.unlocked.includes(c)) });
  changed();
  announce({ id: `challenge:${id}`, kind: 'challenge', kicker: 'DESAFIO DESBLOQUEADO!', title: challenge.name, line: 'Jogue em JOGAR → DESAFIOS.' });
  return true;
}

/** Marca o desafio como concluído (a moldura sai junto; a tampinha é a da run vencida, Patch 0.9.6). */
export function completeChallenge(id) {
  const challenge = CHALLENGES[id];
  const current = loadChallenges();
  if (!challenge || current.done.includes(id)) return false;
  saveChallenges({
    unlocked: CHALLENGE_IDS.filter((c) => c === id || current.unlocked.includes(c)),
    done: CHALLENGE_IDS.filter((c) => c === id || current.done.includes(c)),
  });
  changed();
  announce({ id: `frame:${id}`, kind: 'frame', kicker: 'DESAFIO CONCLUÍDO!', title: challenge.name, line: `${challenge.frameName} liberada` });
  return true;
}

/** Molduras liberadas (uma por desafio concluído). */
export const loadFrames = () => loadChallenges().done.map((id) => CHALLENGES[id].frame);

export function loadEquippedFrame() {
  const frame = readRaw(KEYS.frame);
  return frame && loadFrames().includes(frame) ? frame : null;
}

export function saveEquippedFrame(frame) {
  writeRaw(KEYS.frame, frame ?? null);
  changed();
}

// ---------------------------------------------------------------------------
// Contadores das metas das maletas
// ---------------------------------------------------------------------------

export const loadTrancaWins = () => toInt(readRaw(KEYS.trancaWins));

export function addTrancaWin() {
  const total = loadTrancaWins() + 1;
  writeRaw(KEYS.trancaWins, String(total));
  return total;
}

/** Talismã comprado na run `seed`: devolve quantos diferentes já foram comprados nela. */
export function addRunRelic(seed, relicId) {
  const saved = readJson(KEYS.runRelics, null);
  const ids = saved && saved.seed === seed ? saved.ids : [];
  const next = ids.includes(relicId) ? ids : [...ids, relicId];
  writeJson(KEYS.runRelics, { seed, ids: next });
  return next.length;
}

export const resetRunRelics = (seed) => writeJson(KEYS.runRelics, { seed, ids: [] });

/** Progresso das metas que somam, para o Balcão e o livro. */
export function loadMetaProgress() {
  return { trancaWins: loadTrancaWins() };
}

/** DEV: apaga tampinhas, melhorias, maletas, desafios e molduras (as Peças Pretas ficam). */
export function resetMeta() {
  writeRaw(GOLD_CAPS_KEY, null);
  for (const key of Object.values(KEYS)) writeRaw(key, null);
  changed();
}

/** DEV: libera todas as maletas e todos os desafios (sem aviso). */
export function unlockAllMeta() {
  writeJson(KEYS.maletas, MALETA_IDS.filter((id) => id !== DEFAULT_MALETA));
  writeJson(KEYS.challenges, { unlocked: [...CHALLENGE_IDS], done: loadChallenges().done });
  changed();
}
