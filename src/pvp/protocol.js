/**
 * Patch PvP: o protocolo da mesa online. Tudo que passa pelo canal P2P (PeerJS / WebRTC
 * DataChannel) é um objeto JSON `{ type, v, payload }`; este módulo diz quais tipos existem,
 * confere o formato de cada um antes de o jogo usar e cuida do ID da sala.
 *
 * Mensagens principais (as do pedido, mais as de controle):
 *   HELLO         { id, name, version, rejoin, room? }  quem é você (o anfitrião manda a configuração da mesa)
 *   HANDSHAKE     { name, suitcase, initialDeck }       maleta escolhida e o baralho inicial
 *   RUN_START     { seed, seedCode, room }              (anfitrião) a rota começa, igual para os dois
 *   STATUS        { where, node, ... }                  onde você está, corações, moedas, talismãs
 *   SHOP_FINISH   { newTalismans, newCoins }            PRONTO PARA O DUELO: saiu do Mercado Negro
 *   DUEL_READY    { node, kind, profile }               baralho fechado: pronto para o duelo
 *   DUEL_START    { duelId, final, state, clock }       (anfitrião) a mesa começou
 *   PLAY_TILE     { duelId, tile, targetEnd, updatedDeck }
 *   PASS_TURN     { duelId, paid }
 *   BUY_TILE      { duelId, count }
 *   DUEL_PICK     { duelId, kind, tileId }              escolhas (Barbante, Giz, Canivete)
 *   DUEL_STATE    { duelId, state, clock }              (anfitrião) a mesa depois de cada jogada
 *   DUEL_REJECT   { duelId, reason }                    (anfitrião) jogada recusada
 *   ROUND_RESULT  { duelId, winnerId, damage, heartsLeft, kind, final, matchOver }
 *   NEXT_READY    { duelId }                            mesa final: pronto para a próxima rodada
 *   PING / PONG   { t }                                 latência (o indicador do canto)
 *   SYNC          { ... }                               (anfitrião) tudo de novo para quem voltou
 *   GAME_OVER     { winnerId, reason }                  'hearts' · 'wo' · 'quit'
 *   BYE           { reason }                            saiu de propósito
 *   ROOM_FULL     {}                                    a mesa já tem dois
 */

/**
 * 2 = versão 1.3 (rota Loja → Mercado Negro → Duelo e a configuração da mesa).
 * 3 = versão 1.4 (talismãs e pedras de grife novos, o Grampo de Cabelo): uma mesa 1.3 e uma
 * 1.4 não sentam juntas (uma não conhece as peças da outra).
 */
import { isRoom } from '../data/pvpRoom.js';

export const PROTOCOL_VERSION = 3;

export const MSG = Object.freeze({
  HELLO: 'HELLO',
  HANDSHAKE: 'HANDSHAKE',
  RUN_START: 'RUN_START',
  STATUS: 'STATUS',
  SHOP_FINISH: 'SHOP_FINISH',
  DUEL_READY: 'DUEL_READY',
  DUEL_START: 'DUEL_START',
  PLAY_TILE: 'PLAY_TILE',
  PASS_TURN: 'PASS_TURN',
  BUY_TILE: 'BUY_TILE',
  DUEL_PICK: 'DUEL_PICK',
  DUEL_STATE: 'DUEL_STATE',
  DUEL_REJECT: 'DUEL_REJECT',
  ROUND_RESULT: 'ROUND_RESULT',
  NEXT_READY: 'NEXT_READY',
  PING: 'PING',
  PONG: 'PONG',
  SYNC: 'SYNC',
  GAME_OVER: 'GAME_OVER',
  BYE: 'BYE',
  ROOM_FULL: 'ROOM_FULL',
});

const TYPES = new Set(Object.values(MSG));

// ---------------------------------------------------------------------------
// ID da sala: 5 caracteres legíveis (sem 0/O, 1/I/L), mostrado como "MESA-8B2KQ"
// ---------------------------------------------------------------------------

export const ROOM_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_LENGTH = 5;
export const ROOM_PREFIX = 'MESA-';

/** Um código novo de sala (`random` devolve [0, 1), como Math.random). */
export function generateRoomCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < ROOM_LENGTH; i += 1) code += ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length) % ROOM_ALPHABET.length];
  return code;
}

/** "MESA-8B2KQ" a partir do código. */
export const formatRoomId = (code) => `${ROOM_PREFIX}${code}`;

/**
 * O que a pessoa digitou (ou colou: "mesa-8b2kq", "MESA 8B2KQ", um link com ?mesa=) → o
 * código, ou null se não for um código válido.
 */
export function parseRoomInput(text) {
  if (typeof text !== 'string') return null;
  let raw = text.trim();
  const fromLink = raw.match(/[?&#]mesa=([A-Za-z0-9-]+)/);
  if (fromLink) raw = fromLink[1];
  raw = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.startsWith('MESA')) raw = raw.slice(4);
  if (raw.length !== ROOM_LENGTH || [...raw].some((ch) => !ROOM_ALPHABET.includes(ch))) return null;
  return raw;
}

/** Máscara do campo "DIGITE O ID DA SALA": só o que cabe, em maiúsculas, com o MESA- na frente. */
export function maskRoomInput(text) {
  const raw = String(text ?? '')
    .toUpperCase()
    .replace(/^MESA-?/, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_LENGTH);
  return raw;
}

/** ID do anfitrião no servidor de sinalização do PeerJS (minúsculo, com o prefixo do jogo). */
export const peerIdOf = (code) => `buxaria-mesa-${String(code).toLowerCase()}`;

/** ID aleatório de quem entra numa mesa (o PeerJS só aceita letras, números, - e _). */
export const guestPeerId = (random = Math.random) => `buxaria-cadeira-${Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0')}`;

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

export const makeMessage = (type, payload = {}) => ({ type, v: PROTOCOL_VERSION, payload });

const isObj = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isStr = (x, max = 200) => typeof x === 'string' && x.length <= max;
const isInt = (x) => Number.isInteger(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isSide = (x) => x === 'left' || x === 'right' || x === 'root';
const isTile = (t) => isObj(t) && isStr(t.id, 16) && isInt(t.a) && isInt(t.b);
const isStrList = (x, max = 12) => Array.isArray(x) && x.length <= max && x.every((s) => isStr(s, 40));
const isDeck = (d) => isObj(d) && Object.keys(d).length <= 28 && Object.values(d).every((e) => isStr(e, 20));
const optStr = (x, max) => x == null || isStr(x, max);
const isDuelId = (x) => isInt(x) && x >= 0;
const isClock = (c) => c == null || (isObj(c) && (c.actor == null || c.actor === 'player' || c.actor === 'tioZe') && (c.msLeft == null || isNum(c.msLeft)) && (c.totalMs == null || isNum(c.totalMs)));
const isState = (s) => isObj(s) && isStr(s.phase, 20) && isObj(s.hands) && isObj(s.board) && Array.isArray(s.boneyard);
const isProfile = (p) => isObj(p) && isInt(p.hearts) && isInt(p.maxHearts) && isInt(p.coins) && isStrList(p.relics, 8) && isDeck(p.deck ?? {}) && optStr(p.maleta, 20);

const CHECKS = {
  HELLO: (p) => isStr(p.id, 64) && isStr(p.name, 40) && isInt(p.version) && (p.room == null || isRoom(p.room)),
  HANDSHAKE: (p) => isStr(p.name, 40) && isStr(p.suitcase, 20) && isDeck(p.initialDeck ?? {}),
  RUN_START: (p) => isInt(p.seed) && optStr(p.seedCode, 24) && isRoom(p.room),
  STATUS: (p) => isStr(p.where, 20) && optStr(p.node, 40) && isInt(p.hearts) && isInt(p.maxHearts) && isInt(p.coins) && isStrList(p.relics, 8),
  SHOP_FINISH: (p) => isStrList(p.newTalismans, 8) && isInt(p.newCoins),
  DUEL_READY: (p) => optStr(p.node, 40) && (p.kind === 'combat' || p.kind === 'boss' || p.kind === 'done') && isProfile(p.profile),
  DUEL_START: (p) => isDuelId(p.duelId) && isState(p.state) && isClock(p.clock),
  PLAY_TILE: (p) => isDuelId(p.duelId) && isTile(p.tile) && isSide(p.targetEnd),
  PASS_TURN: (p) => isDuelId(p.duelId) && typeof p.paid === 'boolean',
  BUY_TILE: (p) => isDuelId(p.duelId) && isInt(p.count),
  DUEL_PICK: (p) => isDuelId(p.duelId) && isStr(p.kind, 20) && optStr(p.tileId, 16),
  DUEL_STATE: (p) => isDuelId(p.duelId) && isState(p.state) && isClock(p.clock),
  DUEL_REJECT: (p) => isDuelId(p.duelId) && optStr(p.reason, 60),
  ROUND_RESULT: (p) => isDuelId(p.duelId) && optStr(p.winnerId, 64) && isInt(p.damage) && isObj(p.heartsLeft),
  NEXT_READY: (p) => isDuelId(p.duelId),
  PING: (p) => isNum(p.t),
  PONG: (p) => isNum(p.t),
  SYNC: (p) => isStr(p.stage, 20),
  GAME_OVER: (p) => optStr(p.winnerId, 64) && isStr(p.reason, 20),
  BYE: (p) => optStr(p.reason, 40),
  ROOM_FULL: () => true,
};

/** A mensagem chegou inteira e no formato certo? (o resto é ignorado) */
export function validateMessage(msg) {
  if (!isObj(msg) || !TYPES.has(msg.type) || !isObj(msg.payload)) return false;
  // versões diferentes: só o HELLO e o aviso de mesa recusada passam (os dois lados ficam sabendo)
  if (msg.v !== PROTOCOL_VERSION) return msg.type === MSG.HELLO || msg.type === MSG.ROOM_FULL;
  try {
    return CHECKS[msg.type](msg.payload) === true;
  } catch {
    return false;
  }
}

/** Nome do jogador como vai para a mesa: sem espaços sobrando, até 14 letras. */
export function cleanName(text) {
  const name = [...String(text ?? '')]
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch !== '<' && ch !== '>')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
  return name;
}
