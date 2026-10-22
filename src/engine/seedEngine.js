/**
 * Motor de sementes (Patch 0.9.2): PRNG Mulberry32, leve e sem dependências, e as sementes
 * de texto que o jogador vê, copia e cola ("BUX-9K2").
 *
 * Uma run inteira sai de uma semente só:
 *   - o número da semente (`state.seed`, 32 bits) vem do texto (`seedNumberOf`);
 *   - a teia de caminhos e o elenco de cada região, a vitrine da Loja Clandestina, o Mercado
 *     Negro, o dinheiro do Seu Tião e os sorteios dos talismãs já eram tirados desse número
 *     (engine/campaignMap.js, shop.js, blackMarket.js, data/relics.js) com este mesmo
 *     Mulberry32 (`mulberry32` = `createSeededRng` de dominoLogic.js) e o `mixSeed`;
 *   - o embaralhamento das 28 pedras de cada rodada também: `shuffle(pedras, chave)` usa uma
 *     sequência própria para cada mesa/rodada (a chave), então a mesma semente com as mesmas
 *     escolhas dá exatamente as mesmas mãos, mesmo que você jogue mais ou menos rodadas antes.
 *
 * Sem semente ativa, `random()` e `shuffle()` caem no Math.random (fora de uma run).
 * Sementes antigas (runs salvas antes do 0.9.2, só com o número) aparecem como "#123456" e
 * colar "#123456" volta exatamente naquele número.
 */

/** Letras e algarismos da semente sorteada, sem os que se confundem (0/O, 1/I). */
export const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Tamanho máximo de uma semente digitada. */
export const SEED_MAX_LENGTH = 24;

/** Mulberry32: 32 bits de estado, período 2^32, rápido e bom o bastante para jogo. */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a de `text` a partir de `seed`: deriva sequências independentes da mesma semente. */
export function mixSeed(seed, text) {
  let h = (seed >>> 0) ^ 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Texto da semente → número de 32 bits (FNV-1a com a mistura final do MurmurHash3). */
export function hashSeed(text) {
  let h = mixSeed(0x9e3779b9, String(text));
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Semente como o jogador digitou → forma canônica (maiúsculas, sem espaços). Seis letras ou
 * algarismos ganham o hífen no meio ("bux9k2" → "BUX-9K2"); "#123" (semente antiga) fica
 * como está. Em branco: null.
 */
export function normalizeSeed(input) {
  const text = String(input ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, SEED_MAX_LENGTH);
  if (!text) return null;
  if (/^#\d{1,10}$/.test(text)) return text;
  const plain = text.replace(/[^A-Z0-9]/g, '');
  if (!plain) return null;
  return plain.length === 6 ? `${plain.slice(0, 3)}-${plain.slice(3)}` : plain;
}

/** Número de 32 bits de uma semente (texto, "#número" antigo, ou já um número). */
export function seedNumberOf(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const code = normalizeSeed(seed);
  if (!code) return 0;
  if (code.startsWith('#')) return Number(code.slice(1)) >>> 0;
  // o hífen não conta: "BUX-9K2" e "BUX9K2" são a mesma semente
  return hashSeed(code.replace(/-/g, ''));
}

/** Como mostrar a semente de uma run (o texto dela; das antigas, o "#número"). */
export const seedLabelOf = (state) => state?.seedCode ?? (state?.seed != null ? `#${state.seed >>> 0}` : null);

/**
 * Semente nova ao acaso: 6 caracteres maiúsculos em dois grupos ("BUX-9K2"). Usa o
 * gerador do aparelho quando dá (crypto), senão o Math.random.
 */
export function generateRandomSeed() {
  const bytes = new Uint32Array(6);
  try {
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 2 ** 32);
  }
  const chars = Array.from(bytes, (n) => SEED_ALPHABET[n % SEED_ALPHABET.length]).join('');
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}

// ---------------------------------------------------------------------------
// Semente ativa (a da run em andamento)
// ---------------------------------------------------------------------------

let active = { code: null, number: null, rng: null };

/**
 * Liga o PRNG na semente da run (texto, "#número" ou número). Devolve o número de 32 bits
 * que vai para `state.seed`.
 */
export function initPRNG(seedString) {
  const number = seedNumberOf(seedString);
  const code = typeof seedString === 'number' ? `#${number}` : (normalizeSeed(seedString) ?? `#${number}`);
  if (active.number !== number || active.code !== code) active = { code, number, rng: mulberry32(number) };
  return number;
}

/** Desliga a semente ativa (de volta ao Math.random). */
export function clearPRNG() {
  active = { code: null, number: null, rng: null };
}

/** A semente ativa ({ code, number }) ou null. */
export const activeSeed = () => (active.rng ? { code: active.code, number: active.number } : null);

/** Número decimal em [0, 1): da semente ativa, ou do Math.random sem semente. */
export const random = () => (active.rng ? active.rng() : Math.random());

/** Número decimal em [min, max). */
export const randomRange = (min, max) => min + random() * (max - min);

/** Inteiro em [min, max] (os dois inclusos). */
export const randomInt = (min, max) => Math.floor(randomRange(min, max + 1));

/** Sequência própria e repetível da semente ativa para `key` (ex.: a rodada de uma mesa). */
export function rngFor(key, seed = active.number) {
  if (seed == null) return Math.random;
  return mulberry32(mixSeed(seed, String(key)));
}

/** Fisher–Yates com o `rng` dado (não mexe no original). */
export function shuffleWith(items, rng) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Embaralha `items` com a semente ativa. Com `key` (ex.: 'r1-f2-l1:tonho:3' = nó, rival e
 * rodada), usa a sequência daquela chave: o resultado não depende do que veio antes.
 */
export const shuffle = (items, key = null) => shuffleWith(items, key == null ? random : rngFor(key));
