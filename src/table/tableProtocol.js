/**
 * Versão 2.4: o protocolo da mesa online de 2 a 4. Corre no mesmo canal P2P do duelo (PeerJS),
 * mas com outro ID de anfitrião ("RODA-8B2KQ" em vez de "MESA-8B2KQ") e mensagens próprias.
 * A rede é uma estrela: cada convidado fala só com o anfitrião, que roda o motor
 * (tableEngine.js) e manda a cada cadeira o espelho dela (viewFor), nunca o estado inteiro.
 *
 *   T_HELLO   (convidado) { id, name, face, version }        quem chegou
 *   T_LOBBY   (anfitrião) { config, seats, you, started }    o saguão (cadeiras, rostos, PRONTO)
 *   T_SEAT    (convidado) { face?, ready? }                  troca de rosto / PRONTO
 *   T_STATE   (anfitrião) { view, clock, ready, links }      a mesa vista da sua cadeira
 *   T_INTENT  (convidado) { action }                         PLAY · DRAW · PASS
 *   T_REJECT  (anfitrião) { reason }                         jogada recusada (a mesa mudou)
 *   T_NEXT    (convidado) {}                                 pronto para a próxima rodada
 *   T_PING / T_PONG       { t }                              latência
 *   T_BYE                 { reason }                         saiu de propósito
 *   T_FULL    (anfitrião) { reason }                         'full' · 'started' · 'version'
 *   T_END     (anfitrião) { reason }                         a mesa acabou (o anfitrião saiu)
 */
import { ROOM_ALPHABET, ROOM_LENGTH } from '../pvp/protocol.js';

/**
 * Sobe quando o formato muda: mesas de versões diferentes não sentam juntas.
 * 2 (versão 2.7): as duplas e a contagem por tentos (o espelho traz `team`, `tentos`, `target`).
 */
export const TABLE_PROTOCOL = 2;

export const TMSG = Object.freeze({
  HELLO: 'T_HELLO',
  LOBBY: 'T_LOBBY',
  SEAT: 'T_SEAT',
  STATE: 'T_STATE',
  INTENT: 'T_INTENT',
  REJECT: 'T_REJECT',
  NEXT: 'T_NEXT',
  PING: 'T_PING',
  PONG: 'T_PONG',
  BYE: 'T_BYE',
  FULL: 'T_FULL',
  END: 'T_END',
});

const TYPES = new Set(Object.values(TMSG));

export const TABLE_PREFIX = 'RODA-';

/** "RODA-8B2KQ" a partir do código. */
export const formatTableId = (code) => `${TABLE_PREFIX}${code}`;

/** ID do anfitrião da roda no servidor de sinalização (outro espaço que o do duelo). */
export const tablePeerId = (code) => `buxaria-roda-${String(code).toLowerCase()}`;

/** O que a pessoa digitou ou colou ("roda-8b2kq", um link com ?roda=) → o código, ou null. */
export function parseTableInput(text) {
  if (typeof text !== 'string') return null;
  let raw = text.trim();
  const fromLink = raw.match(/[?&#]roda=([A-Za-z0-9-]+)/);
  if (fromLink) raw = fromLink[1];
  raw = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.startsWith('RODA')) raw = raw.slice(4);
  if (raw.length !== ROOM_LENGTH || [...raw].some((ch) => !ROOM_ALPHABET.includes(ch))) return null;
  return raw;
}

/** Máscara do campo do código: só o que cabe, em maiúsculas, sem o RODA- na frente. */
export function maskTableInput(text) {
  return String(text ?? '')
    .toUpperCase()
    .replace(/^RODA-?/, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_LENGTH);
}

/** O que o anfitrião escolhe ao abrir a mesa. */
export const TABLE_OPTIONS = Object.freeze({
  seats: Object.freeze([2, 3, 4]),
  batida: Object.freeze(['todos', 'pesada']),
  /** com tentos, é a meta: quantos tentos para vencer */
  hearts: Object.freeze([3, 5, 7]),
  turn: Object.freeze([15, 30, 45, 60]),
  /** versão 2.7: duplas (só com 4 cadeiras) */
  teams: Object.freeze([false, true]),
  /** versão 2.7: a partida conta por corações (perde quem zera) ou por tentos (vence quem faz a meta) */
  scoring: Object.freeze(['coracoes', 'tentos']),
});
export const DEFAULT_TABLE_CONFIG = Object.freeze({ seats: 4, batida: 'todos', hearts: 5, turn: 30, teams: false, scoring: 'coracoes' });

export function sanitizeTableConfig(config) {
  const pick = (key) => (TABLE_OPTIONS[key].includes(config?.[key]) ? config[key] : DEFAULT_TABLE_CONFIG[key]);
  const seats = pick('seats');
  return { seats, batida: pick('batida'), hearts: pick('hearts'), turn: pick('turn'), teams: seats === 4 && pick('teams'), scoring: pick('scoring') };
}

export const makeTableMessage = (type, payload = {}) => ({ type, v: TABLE_PROTOCOL, payload });

const isObj = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isStr = (x, max = 64) => typeof x === 'string' && x.length <= max;
const optStr = (x, max) => x == null || isStr(x, max);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isAction = (a) =>
  isObj(a) && (a.type === 'PLAY' ? isStr(a.tileId, 8) && (a.side === 'left' || a.side === 'right' || a.side === 'root') : a.type === 'DRAW' || a.type === 'PASS');

/** O que chega dos convidados é conferido com rigor (o anfitrião é quem manda na mesa). */
const CHECKS = {
  T_HELLO: (p) => isStr(p.id, 64) && isStr(p.name, 40) && optStr(p.face, 24) && Number.isInteger(p.version),
  T_LOBBY: (p) => isObj(p.config) && Array.isArray(p.seats) && optStr(p.you, 4),
  T_SEAT: (p) => optStr(p.face, 24) && (p.ready == null || typeof p.ready === 'boolean'),
  T_STATE: (p) => isObj(p.view) && Array.isArray(p.view.seats) && isObj(p.view.board),
  T_INTENT: (p) => isAction(p.action),
  T_REJECT: (p) => optStr(p.reason, 60),
  T_NEXT: () => true,
  T_PING: (p) => isNum(p.t),
  T_PONG: (p) => isNum(p.t),
  T_BYE: (p) => optStr(p.reason, 40),
  T_FULL: (p) => optStr(p.reason, 20),
  T_END: (p) => optStr(p.reason, 40),
};

/** A mensagem chegou inteira e no formato certo? Versões diferentes: só o HELLO e o FULL passam. */
export function validateTableMessage(msg) {
  if (!isObj(msg) || !TYPES.has(msg.type) || !isObj(msg.payload)) return false;
  if (msg.v !== TABLE_PROTOCOL && msg.type !== TMSG.HELLO && msg.type !== TMSG.FULL) return false;
  return CHECKS[msg.type](msg.payload);
}
