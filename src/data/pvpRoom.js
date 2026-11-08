/**
 * Versão 1.3: a configuração da mesa online. Quem cria a mesa escolhe (só na hora de criar) e
 * ela vale para os dois: as moedas de cada um, os corações do duelo, a raridade dos talismãs
 * que aparecem na loja e o tempo de cada jogada. A rota é sempre Loja → Mercado Negro → Duelo.
 * Versão 2.13: e a sala do duelo (data/tableMaps.js), com a trilha dela. A sala é opcional na
 * rede (quem tem a versão de antes manda a configuração sem ela: vira o boteco).
 */
import { DEFAULT_MAP, MAP_IDS, mapOf } from './tableMaps.js';

/** As escolhas de cada item, na ordem dos botões. */
export const ROOM_OPTIONS = Object.freeze({
  coins: Object.freeze([50, 100, 150, 200, 300]),
  hearts: Object.freeze([3, 5, 7, 9]),
  rarity: Object.freeze(['todas', 'comuns', 'raros', 'lendarios']),
  turn: Object.freeze([15, 30, 45, 60]),
});

/** As salas do duelo (fora de ROOM_OPTIONS: a configuração antiga, sem sala, continua valendo). */
export const ROOM_MAPS = MAP_IDS;

export const DEFAULT_ROOM = Object.freeze({ coins: 100, hearts: 5, rarity: 'todas', turn: 30, map: DEFAULT_MAP });

/** Rótulo curto de cada raridade escolhida (nos botões e no resumo). */
export const RARITY_LABEL = Object.freeze({ todas: 'TODAS', comuns: 'SÓ COMUNS', raros: 'RAROS+', lendarios: 'LENDÁRIOS+' });

/**
 * Chances (por raridade) dos talismãs na Loja do Valtinho da mesa online. "Todas" é a mistura
 * da última região do solo; as outras cortam as raridades de baixo.
 */
export const ROOM_RARITY_CHANCES = Object.freeze({
  todas: Object.freeze({ comum: 30, raro: 30, lendario: 25, mitico: 15 }),
  comuns: Object.freeze({ comum: 100, raro: 0, lendario: 0, mitico: 0 }),
  raros: Object.freeze({ comum: 0, raro: 55, lendario: 30, mitico: 15 }),
  lendarios: Object.freeze({ comum: 0, raro: 0, lendario: 70, mitico: 30 }),
});

/** A configuração que chegou (da tela ou da rede), só com valores que existem. */
export function sanitizeRoom(room) {
  const pick = (key) => (ROOM_OPTIONS[key].includes(room?.[key]) ? room[key] : DEFAULT_ROOM[key]);
  return { coins: pick('coins'), hearts: pick('hearts'), rarity: pick('rarity'), turn: pick('turn'), map: ROOM_MAPS.includes(room?.map) ? room.map : DEFAULT_MAP };
}

/** A configuração veio inteira e válida? (a mensagem da rede; a sala pode faltar) */
export const isRoom = (room) =>
  Boolean(room) && typeof room === 'object' && Object.keys(ROOM_OPTIONS).every((key) => ROOM_OPTIONS[key].includes(room[key])) && (room.map == null || ROOM_MAPS.includes(room.map));

/** "$100 · 5♥ · TALISMÃS: TODAS · 30 S POR JOGADA" */
export function describeRoom(room) {
  const r = sanitizeRoom(room);
  return `$${r.coins} · ${r.hearts}♥ · TALISMÃS: ${RARITY_LABEL[r.rarity]} · ${r.turn} S POR JOGADA · ${mapOf(r.map).label}`;
}
