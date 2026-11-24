/**
 * Versão 2.47: as salas da mesa deitada em volume. Cada sala foi renderizada fora do jogo
 * (tools/volume/cena: modelada por distância com sinal, iluminada pelas luzes dela e passada para
 * pixel art), com a câmera alta na MESMA perspectiva do tampo (o chão e a mesa ficam paralelos),
 * numa imagem larga de 1040 × 414: a tela de referência (896 × 414) no meio e 72 px de sobra de
 * cada lado. O jogo corta o meio que cabe em cada tela (a altura vai inteira, a sobra dos lados
 * aparece nas telas mais compridas). Nas salas de dia a imagem tem buraco onde é céu ou mar: a
 * camada de trás continua a de landRooms.js, com as nuvens e as cristas andando.
 *
 * Cada sala é um módulo à parte (o PNG em data URL), carregado só quando precisa; enquanto não
 * chega (ou sem Image, nos testes), fica a pintura de sempre (landRooms.js).
 */
export const HD_W = 1040;
export const HD_H = 414;

const LOADERS = {
  landroom: () => import('./rooms/landroom.js'),
  landsinuca: () => import('./rooms/landsinuca.js'),
  landbicho: () => import('./rooms/landbicho.js'),
  landnoite: () => import('./rooms/landnoite.js'),
  landcalcada: () => import('./rooms/landcalcada.js'),
  landpraia: () => import('./rooms/landpraia.js'),
  landpraca: () => import('./rooms/landpraca.js'),
};

/** As salas que têm a versão em volume. */
export const HD_ROOM_IDS = Object.freeze(Object.keys(LOADERS));

const ready = new Map();
const pending = new Map();
const listeners = new Set();

export const hasRoomHD = (name) => Object.prototype.hasOwnProperty.call(LOADERS, name);

/** A imagem da sala, se já chegou (senão null). */
export const roomHD = (name) => ready.get(name) ?? null;

function decode(url) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('sem Image'));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Traz a sala (uma vez só); resolve com a imagem, ou null se não deu. */
export function loadRoomHD(name) {
  if (!hasRoomHD(name)) return Promise.resolve(null);
  if (ready.has(name)) return Promise.resolve(ready.get(name));
  let p = pending.get(name);
  if (!p) {
    p = LOADERS[name]()
      .then((m) => decode(m.default))
      .then((img) => {
        ready.set(name, img);
        pending.delete(name);
        for (const fn of listeners) fn(name);
        return img;
      })
      .catch(() => {
        pending.delete(name);
        return null;
      });
    pending.set(name, p);
  }
  return p;
}

/** Já vai trazendo a sala (o mapa chama para a mesa do próximo nó). */
export const preloadRoomHD = (name) => {
  if (name) void loadRoomHD(name);
};

/** Avisa quando uma sala chega (devolve o desligar). */
export function subscribeRoomHD(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** O pedaço da imagem que cabe numa caixa de `bw` × `bh` px: [x0, largura], em px da imagem. */
export function roomCrop(bw, bh) {
  const vis = Math.max(1, Math.min(HD_W, Math.round((bw / Math.max(1, bh)) * HD_H)));
  return [Math.round((HD_W - vis) / 2), vis];
}
