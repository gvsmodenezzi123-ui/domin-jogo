/**
 * Versão 2.46: os personagens em volume. Cada um foi modelado em 3D (a mesma cabeça de frente e de
 * perfil, o corpo, a roupa, o objeto e as mãos dos emotes), iluminado e passado para pixel art fora
 * do jogo (tools/volume); aqui ficam só os quadros prontos, em dois pedaços por personagem
 * (art/cast/<chave>.js: o parado e os humores; <chave>.g.js: os emotes), carregados em segundo
 * plano na abertura (`preloadCast`). Enquanto um não chega, o desenho antigo dele segue valendo
 * (sem os emotes, o rosto do emote sem o braço).
 *
 * Cada quadro: paleta RGBA + RLE em base64. O parado é inteiro; os humores, a boca falando e os
 * emotes são recortes por cima dele (o índice 1 da paleta quer dizer "fica o de baixo"). Cada emote
 * tem os quadros do gesto (`frontG`/`sideG`) e os dois do braço subindo (`frontR`/`sideR`), que
 * descem pelo caminho de volta.
 * De frente: 176×168 (o busto 88×84 em dobro). Sentado de lado: 240×328 (120×164 em dobro),
 * em camadas: a cadeira (a mesma para todos), as pernas e o corpo de cima.
 */
import { NPC_PORTRAITS, PORTRAITS } from './portraitSpecs.js';

const LOADERS = {
  tioZe: () => import('./cast/tioZe.js'),
  tonho: () => import('./cast/tonho.js'),
  baiano: () => import('./cast/baiano.js'),
  valdir: () => import('./cast/valdir.js'),
  neide: () => import('./cast/neide.js'),
  arlindo: () => import('./cast/arlindo.js'),
  marcao: () => import('./cast/marcao.js'),
  serginho: () => import('./cast/serginho.js'),
  cida: () => import('./cast/cida.js'),
  paulinho: () => import('./cast/paulinho.js'),
  tiao: () => import('./cast/tiao.js'),
  beto: () => import('./cast/beto.js'),
  carlinhos: () => import('./cast/carlinhos.js'),
  bigode: () => import('./cast/bigode.js'),
  sofia: () => import('./cast/sofia.js'),
  fausto: () => import('./cast/fausto.js'),
  alemao: () => import('./cast/alemao.js'),
  comendador: () => import('./cast/comendador.js'),
  donoDaNoite: () => import('./cast/donoDaNoite.js'),
  voJuca: () => import('./cast/voJuca.js'),
  juvenal: () => import('./cast/juvenal.js'),
  zeca: () => import('./cast/zeca.js'),
  genesio: () => import('./cast/genesio.js'),
  marquinhos: () => import('./cast/marquinhos.js'),
  nelsinho: () => import('./cast/nelsinho.js'),
  soro: () => import('./cast/soro.js'),
  brandao: () => import('./cast/brandao.js'),
  geraldo: () => import('./cast/geraldo.js'),
  odete: () => import('./cast/odete.js'),
  valtinhoRenegado: () => import('./cast/valtinhoRenegado.js'),
  valtinho: () => import('./cast/valtinho.js'),
  seuTiao: () => import('./cast/seuTiao.js'),
  corvo: () => import('./cast/corvo.js'),
  chairs: () => import('./cast/chairs.js'),
};
/** Os emotes de cada um (o grosso dos quadros), num pedaço à parte: só aparecem na roda. */
const MOTION = {
  tioZe: () => import('./cast/tioZe.g.js'),
  tonho: () => import('./cast/tonho.g.js'),
  baiano: () => import('./cast/baiano.g.js'),
  valdir: () => import('./cast/valdir.g.js'),
  neide: () => import('./cast/neide.g.js'),
  arlindo: () => import('./cast/arlindo.g.js'),
  marcao: () => import('./cast/marcao.g.js'),
  serginho: () => import('./cast/serginho.g.js'),
  cida: () => import('./cast/cida.g.js'),
  paulinho: () => import('./cast/paulinho.g.js'),
  tiao: () => import('./cast/tiao.g.js'),
  beto: () => import('./cast/beto.g.js'),
  carlinhos: () => import('./cast/carlinhos.g.js'),
  bigode: () => import('./cast/bigode.g.js'),
  sofia: () => import('./cast/sofia.g.js'),
  fausto: () => import('./cast/fausto.g.js'),
  alemao: () => import('./cast/alemao.g.js'),
  comendador: () => import('./cast/comendador.g.js'),
  donoDaNoite: () => import('./cast/donoDaNoite.g.js'),
  voJuca: () => import('./cast/voJuca.g.js'),
  juvenal: () => import('./cast/juvenal.g.js'),
  zeca: () => import('./cast/zeca.g.js'),
  genesio: () => import('./cast/genesio.g.js'),
  marquinhos: () => import('./cast/marquinhos.g.js'),
  nelsinho: () => import('./cast/nelsinho.g.js'),
  soro: () => import('./cast/soro.g.js'),
  brandao: () => import('./cast/brandao.g.js'),
  geraldo: () => import('./cast/geraldo.g.js'),
  odete: () => import('./cast/odete.g.js'),
  valtinhoRenegado: () => import('./cast/valtinhoRenegado.g.js'),
  valtinho: () => import('./cast/valtinho.g.js'),
  seuTiao: () => import('./cast/seuTiao.g.js'),
  corvo: () => import('./cast/corvo.g.js'),
};

/** Quem é quem: a ficha → a chave. */
const KEY_OF = new Map(Object.entries({ ...PORTRAITS, ...NPC_PORTRAITS }).map(([k, s]) => [s, k]));
export const castKeyOf = (spec) => KEY_OF.get(spec) ?? null;

const DATA = new Map();
let version = 0;
const subs = new Set();
export const castVersion = () => version;
export function subscribeCast(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
let started = null;
let bumpTimer = null;
/** Avisa quem desenha que chegaram quadros novos (junta as chegadas de um quinto de segundo). */
function bump() {
  if (bumpTimer) return;
  bumpTimer = setTimeout(() => {
    bumpTimer = null;
    version += 1;
    for (const fn of subs) fn();
  }, 200);
}
/**
 * Carrega os quadros de todos (em paralelo, cada um no seu pedaço): primeiro o parado e os humores
 * (leves), depois os emotes. Quem chega já aparece: a cada leva de chegadas, quem desenha
 * personagem repinta (`subscribeCast`).
 */
export function preloadCast() {
  if (started) return started;
  const each = (loaders, take) =>
    Promise.all(
      Object.entries(loaders).map(([k, load]) =>
        load()
          .then((m) => {
            take(k, m.default);
            bump();
          })
          .catch(() => {}),
      ),
    );
  started = each(LOADERS, (k, d) => DATA.set(k, { ...d })).then(() =>
    each(MOTION, (k, d) => {
      if (DATA.has(k)) Object.assign(DATA.get(k), d);
    }),
  );
  return started;
}
/** Para os testes (e o servidor): põe os dados de um personagem direto. */
export function setCastData(key, data) {
  DATA.set(key, data);
}
/** Os dados de `spec` (ou null, se ainda não chegaram; sem as cadeiras, também não). */
export function castOf(spec) {
  const k = castKeyOf(spec);
  return k && DATA.has('chairs') ? (DATA.get(k) ?? null) : null;
}
export function castSpot(spec, name) {
  return castOf(spec)?.spots?.[name] ?? null;
}

// ------------------------------------------------------------------ a decodificação
const bytesOf = (s) => {
  const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u[i] = bin.charCodeAt(i);
  return u;
};
const RAW = new WeakMap();
/** O quadro `f` aberto: os pixels RGBA da região e quais ficam como estavam. */
function decode(f) {
  let r = RAW.get(f);
  if (r) return r;
  const n = f.w * f.h;
  const px = new Uint8ClampedArray(n * 4);
  const keep = new Uint8Array(n);
  if (n) {
    const pal = bytesOf(f.p);
    const rle = bytesOf(f.d);
    let o = 0;
    for (let i = 0; i < rle.length; ) {
      const run = rle[i];
      let idx = rle[i + 1];
      i += 2;
      if (f.i === 2) {
        idx = (idx << 8) | rle[i];
        i += 1;
      }
      const c = idx * 4;
      for (let k = 0; k < run; k += 1) {
        if (idx === 1) keep[o] = 1;
        else if (idx > 1) {
          px[o * 4] = pal[c];
          px[o * 4 + 1] = pal[c + 1];
          px[o * 4 + 2] = pal[c + 2];
          px[o * 4 + 3] = pal[c + 3];
        }
        o += 1;
      }
    }
  }
  r = { x: f.x ?? 0, y: f.y ?? 0, w: f.w, h: f.h, px, keep };
  RAW.set(f, r);
  return r;
}

/** A prancha do quadro: a base inteira com os recortes por cima, espelhada se `flip`. */
function boardOf(W, H, layers, flip = false) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (const f of layers) {
    if (!f) continue;
    const r = decode(f);
    for (let y = 0; y < r.h; y += 1) {
      for (let x = 0; x < r.w; x += 1) {
        const s = y * r.w + x;
        if (r.keep[s]) continue;
        const X = r.x + x;
        const Y = r.y + y;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const o = (Y * W + X) * 4;
        if (!r.px[s * 4 + 3] && layers.length > 1 && f === layers[0]) continue;
        data[o] = r.px[s * 4];
        data[o + 1] = r.px[s * 4 + 1];
        data[o + 2] = r.px[s * 4 + 2];
        data[o + 3] = r.px[s * 4 + 3];
      }
    }
  }
  if (flip) {
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W / 2; x += 1) {
        const a = (y * W + x) * 4;
        const b = (y * W + (W - 1 - x)) * 4;
        for (let c = 0; c < 4; c += 1) {
          const t = data[a + c];
          data[a + c] = data[b + c];
          data[b + c] = t;
        }
      }
    }
  }
  const put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    if (a >= 1 || !data[i + 3]) {
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
      return;
    }
    data[i] = Math.round(data[i] + (c[0] - data[i]) * a);
    data[i + 1] = Math.round(data[i + 1] + (c[1] - data[i + 1]) * a);
    data[i + 2] = Math.round(data[i + 2] + (c[2] - data[i + 2]) * a);
  };
  return { w: W, h: H, S: 2, data, put };
}

const FACES = new Set(['blink', 'thinking', 'smug', 'hurt']);
/** O rosto de baixo de cada emote (o recorte do emote só traz o braço; a risada traz o rosto). */
const GESTURE_BASE = { joinha: 'smug', negativo: 'smug', dedo: 'smug', palmas: 'smug' };
/** O nome do quadro do rosto: falando, piscando (e desmaiado), pensando, convencido, apanhando. */
export const faceOf = (mood, speaking) => (speaking && mood !== 'hurt' ? 'talk' : mood === 'out' ? 'blink' : FACES.has(mood) ? mood : 'idle');

/** O recorte do braço do emote: o quadro `frame` do gesto ou, com `raise` (0 ou 1), o da subida. */
function armOf(gestures, raises, gesture, frame, raise) {
  if (raise != null && raises?.[gesture]?.[raise]) return raises[gesture][raise];
  const list = gestures[gesture];
  return list[frame % list.length];
}

/**
 * O busto de frente (176×168) do `data` no humor (ou no emote `gesture`, quadro `frame`; com
 * `raise` 0 ou 1, o braço ainda subindo).
 */
export function castFront(data, mood, speaking, gesture = null, frame = 0, raise = null) {
  const f = data.front;
  if (gesture && data.frontG?.[gesture]) {
    const arm = armOf(data.frontG, data.frontR, gesture, frame, raise);
    const face = GESTURE_BASE[gesture];
    return boardOf(176, 168, face ? [f.idle, f[face], arm] : [f.idle, arm]);
  }
  const face = faceOf(mood, speaking);
  return boardOf(176, 168, face === 'idle' ? [f.idle] : [f.idle, f[face]]);
}

/** De lado, de busto (o recorte de cima do corpo sentado, 176×168), olhando para `facing`. */
export function castProfile(data, mood, speaking, facing = 'right') {
  const s = data.side;
  const face = faceOf(mood, speaking);
  const full = boardOf(240, 328, face === 'idle' ? [s.idle] : [s.idle, s[face]]);
  const out = boardOf(176, 168, []);
  for (let y = 0; y < 168; y += 1) for (let x = 0; x < 176; x += 1) {
    const i = (y * 240 + x) * 4;
    if (!full.data[i + 3]) continue;
    const X = facing === 'left' ? 175 - x : x;
    out.data.set(full.data.subarray(i, i + 4), (y * 176 + X) * 4);
  }
  return out;
}

/** Sentado de lado (240×328): a camada `part` ('chair', 'legs', 'upper' ou 'all'). */
export function castSeated(data, mood, speaking, facing, chair, part, gesture = null, frame = 0, raise = null) {
  const s = data.side;
  const chairs = DATA.get('chairs');
  const chairF = chairs ? chairs[chair === 'plastico' ? 'plastico' : 'madeira'] : null;
  const face = faceOf(mood, speaking);
  const arm = gesture && data.sideG?.[gesture] ? armOf(data.sideG, data.sideR, gesture, frame, raise) : null;
  const gface = arm ? GESTURE_BASE[gesture] : null;
  const upper = arm ? (gface ? [s.idle, s[gface], arm] : [s.idle, arm]) : face === 'idle' ? [s.idle] : [s.idle, s[face]];
  const flip = facing === 'left';
  if (part === 'chair') return boardOf(240, 328, [chairF], flip);
  if (part === 'legs') return boardOf(240, 328, [s.legs], flip);
  if (part === 'upper') return boardOf(240, 328, upper, flip);
  const all = boardOf(240, 328, [chairF], flip);
  for (const layer of [boardOf(240, 328, [s.legs], flip), boardOf(240, 328, upper, flip)]) {
    for (let i = 0; i < layer.data.length; i += 4) if (layer.data[i + 3]) all.data.set(layer.data.subarray(i, i + 4), i);
  }
  return all;
}
