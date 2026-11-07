/**
 * Versão 2.8: a "malha" única das pedras. Toda pedra (a comum de marfim, as Peças Pretas e
 * Prateadas e todas as aprimoradas) tem a mesma geometria: o contorno escuro de 1 px em volta
 * da face e da lateral, o chanfro (quina clara em cima e à esquerda, escura embaixo e à
 * direita), a lateral com a espessura da pedra (faixas de 1 px do tom da quina ao da base,
 * com o contorno embaixo) e a sombra no pano que cai para longe da lâmpada (`var(--cast)`).
 * O que muda de um material para o outro são só as cores daqui e o "shader" da face (o fundo,
 * os pips e o brilho no CSS de cada .tile-enh-*).
 *
 * side:  [tom da quina, tom da base] da lateral
 * line:  o contorno
 * hi/lo: a quina clara e a escura do chanfro
 * inner: brilho por dentro (vidro, resina)
 * extra: brilho por fora (metal, resina)
 */
export const TILE_MATERIALS = Object.freeze({
  bone: { side: ['#dcc58c', '#8f6d38'], line: '#24180a', hi: 'rgba(255, 253, 240, 0.95)', lo: 'rgba(122, 92, 42, 0.42)' },
  onyx: { side: ['#3c3530', '#0d0b0a'], line: '#000000', hi: 'rgba(255, 255, 255, 0.16)', lo: 'rgba(0, 0, 0, 0.7)' },
  silver: { side: ['#bcc2c8', '#4a5056'], line: '#1c2024', hi: 'rgba(255, 255, 255, 0.9)', lo: 'rgba(40, 44, 50, 0.5)' },
  ouro: { side: ['#c08e2c', '#5c3a08'], line: '#2a1804', hi: 'rgba(255, 250, 220, 0.95)', lo: 'rgba(90, 55, 10, 0.75)', extra: '0 0 9px rgba(255, 210, 110, 0.35)' },
  rubi: { side: ['#a10c26', '#3a020a'], line: '#2a0008', hi: 'rgba(255, 200, 205, 0.85)', lo: 'rgba(60, 0, 10, 0.8)' },
  cristal: { side: ['#2a95b8', '#0a3c50'], line: '#08303e', hi: 'rgba(200, 255, 255, 0.95)', lo: 'rgba(10, 70, 95, 0.6)', inner: 'inset 0 0 7px rgba(190, 255, 255, 0.75)' },
  chumbo: { side: ['#30353a', '#0c0e10'], line: '#050607', hi: 'rgba(255, 255, 255, 0.2)', lo: 'rgba(0, 0, 0, 0.65)' },
  fantasma: { side: ['#5c33a4', '#2a0f5a'], line: '#1e0a3c', hi: 'rgba(235, 220, 255, 0.75)', lo: 'rgba(40, 10, 90, 0.5)', inner: 'inset 0 0 8px rgba(235, 215, 255, 0.5)' },
  ambar: {
    side: ['#a84e0e', '#4a1a04'],
    line: '#2a1004',
    hi: 'rgba(255, 224, 170, 0.9)',
    lo: 'rgba(120, 40, 0, 0.55)',
    inner: 'inset 0 0 8px rgba(255, 200, 120, 0.5), inset 0 -3px 6px rgba(120, 40, 0, 0.45)',
    extra: '0 0 7px rgba(255, 150, 40, 0.3)',
  },
  obsidiana: { side: ['#2a2034', '#08060b'], line: '#000000', hi: 'rgba(235, 225, 255, 0.6)', lo: 'rgba(0, 0, 0, 0.85)' },
  // o verso (pedra virada): madeira escura envernizada
  back: { side: ['#3a2c1e', '#120b06'], line: '#0b0705', hi: 'rgba(255, 220, 170, 0.16)', lo: 'rgba(0, 0, 0, 0.6)' },
});

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cache = new Map();

/**
 * A sombra inteira da malha (box-shadow) para um material e uma espessura `depth` (px). Fica
 * em cache: as pedras do mesmo material e espessura dividem a mesma string.
 */
export function tileMesh(material, depth) {
  const key = `${material}|${depth}`;
  let out = cache.get(key);
  if (out) return out;
  const m = TILE_MATERIALS[material] ?? TILE_MATERIALS.bone;
  const d = Math.max(1, Math.round(depth));
  const a = hexRgb(m.side[0]);
  const b = hexRgb(m.side[1]);
  const parts = [`inset 2px 2px 0 ${m.hi}`, `inset -2px -2px 0 ${m.lo}`];
  if (m.inner) parts.push(m.inner);
  // o contorno da face, por cima da lateral
  parts.push(`0 0 0 1px ${m.line}`);
  // a lateral: uma faixa de 1 px por pixel de espessura, da quina clara à base escura
  for (let i = 1; i <= d; i += 1) {
    const t = d > 1 ? (i - 1) / (d - 1) : 0;
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
    parts.push(`0 ${i}px 0 rgb(${c.join(',')})`);
  }
  // o contorno da lateral (dos lados e embaixo) e a sombra no pano
  parts.push(`0 ${d}px 0 1px ${m.line}`, 'var(--cast, 0 0 0 transparent)');
  if (m.extra) parts.push(m.extra);
  out = parts.join(', ');
  cache.set(key, out);
  return out;
}
