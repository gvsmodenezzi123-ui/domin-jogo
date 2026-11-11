/**
 * Versão 2.1: os retratos dos rivais em 64×64 (antes 40×40), pintados por código e feitos
 * para encher a foto da polaroide inteira: fundo (a parede de cada um), busto, cabeça com
 * volume (luz da lâmpada de cima e da esquerda, três tons de pele, contorno escuro), cabelo,
 * chapéu, roupa e o objeto de cada personagem. Cada retrato tem os humores do jogo:
 *
 *   idle      olhar para a frente
 *   thinking  olhos para o alto, uma sobrancelha erguida, boca de lado
 *   smug      pálpebra caída, sorriso de canto
 *   hurt      olhos apertados, sobrancelhas de dor, boca aberta, suor e a bochecha marcada
 *   blink     piscando (os atendentes da loja, do porão e do beco piscam de vez em quando)
 *
 * e `speaking` (a boca abre, menos no hurt). O desenho é puro e com semente (cache por chave).
 */
import { paintKit } from './botecoScene.js';
import { FIG_OX, paintFigure } from './figurePixels.js';

const { hex, rngOf, buffer } = paintKit;

export const PORTRAIT_PX = 64;
const G = PORTRAIT_PX;
const CX = 32;

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (c) => [clamp(c[0]), clamp(c[1]), clamp(c[2])];

/** Sombra da figura na parede (um pouco para a direita e para baixo). */
function dropShadow(bg, fig) {
  for (let y = G - 1; y >= 0; y -= 1) {
    for (let x = G - 1; x >= 0; x -= 1) {
      const sx = x - 3;
      const sy = y - 2;
      if (sx < 0 || sy < 0) continue;
      if (fig.data[(sy * G + sx) * 4 + 3] > 200) bg.put(x, y, [0, 0, 0], 0.35);
    }
  }
}

/** Cola a camada `top` por cima da `base`. */
function over(base, top) {
  for (let i = 0; i < top.data.length; i += 4) {
    const a = top.data[i + 3] / 255;
    if (!a) continue;
    base.data[i] = base.data[i] * (1 - a) + top.data[i] * a;
    base.data[i + 1] = base.data[i + 1] * (1 - a) + top.data[i + 1] * a;
    base.data[i + 2] = base.data[i + 2] * (1 - a) + top.data[i + 2] * a;
    base.data[i + 3] = 255;
  }
}

// ---------------------------------------------------------------------------
// Fundo: a parede de cada um (enche a foto inteira)
// ---------------------------------------------------------------------------

function paintBackground(b, spec, r) {
  const [top, bottom] = (spec.bg ?? ['#3a2a1e', '#1a120c']).map(hex);
  const pattern = spec.bgPattern ?? 'plain';
  for (let y = 0; y < G; y += 1) {
    for (let x = 0; x < G; x += 1) {
      let c = mix(top, bottom, y / (G - 1));
      if (pattern === 'tiles' && (x % 10 === 0 || y % 10 === 0)) c = mix(c, hex('#000000'), 0.25);
      if (pattern === 'tiles' && x % 10 === 1 && y % 10 !== 0) c = mix(c, hex('#ffffff'), 0.06);
      if (pattern === 'wood' && Math.sin(x * 0.9 + Math.sin(y * 0.15) * 2) > 0.85) c = mix(c, hex('#000000'), 0.22);
      if (pattern === 'wood' && x % 13 === 0) c = mix(c, hex('#000000'), 0.35);
      if (pattern === 'stripes' && Math.floor(x / 5) % 2 === 0) c = mix(c, hex('#ffffff'), 0.06);
      if (pattern === 'curtain') c = mix(c, hex('#000000'), (Math.sin(x * 0.55) * 0.5 + 0.5) * 0.35);
      if (pattern === 'brick' && (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 5) % 10 === 0)) c = mix(c, hex('#000000'), 0.3);
      if (pattern === 'stars' && r() < 0.012) c = mix(c, hex('#fff6c8'), 0.8);
      if (pattern === 'frame') {
        const d = Math.min(x, y, G - 1 - x, G - 1 - y);
        if (d < 4) c = d === 0 ? hex('#3a2808') : d === 1 ? hex('#ffe08a') : d === 3 ? hex('#5a3c08') : hex('#c9962e');
      }
      if (pattern === 'neon' && Math.abs(y - 12 - Math.sin(x * 0.2) * 2) < 1) c = mix(c, hex(spec.neon ?? '#ff4ad0'), 0.7);
      b.put(x, y, rgb(c));
    }
  }
  // a luz da lâmpada atrás da cabeça e a vinheta nos cantos
  const glow = hex(spec.glow ?? '#ffd890');
  for (let y = 0; y < G; y += 1) {
    for (let x = 0; x < G; x += 1) {
      const d = Math.hypot((x - CX) / 30, (y - 24) / 28);
      if (d < 1) b.put(x, y, glow, (1 - d) * 0.18);
      const v = Math.hypot((x - CX) / 40, (y - CX) / 40);
      if (v > 0.8) b.put(x, y, [0, 0, 0], Math.min(0.5, (v - 0.8) * 1.6));
    }
  }
}

// ---------------------------------------------------------------------------
// O retrato
// ---------------------------------------------------------------------------

/**
 * Pinta o retrato de `spec` (art/portraitSpecs.js) no humor `mood`. As camadas: fundo, corpo,
 * cabelo de trás, cabeça, rosto, pelos, cabelo da frente, chapéu, óculos e os objetos (o
 * `extra` de cada rival, que desenha atrás e/ou na frente). O personagem ganha contorno.
 */
export function paintPortrait(spec, mood = 'idle', speaking = false, bare = false) {
  // versão 2.17: a figura é a nova (art/figurePixels.js), pintada no tamanho do busto; o retrato
  // é o recorte do meio dela
  const full = paintFigure(spec, mood, speaking);
  const fig = buffer(G, G);
  for (let y = 0; y < G; y += 1) {
    for (let x = 0; x < G; x += 1) {
      const i = (y * full.w + x + FIG_OX) * 4;
      if (full.data[i + 3]) fig.put(x, y, [full.data[i], full.data[i + 1], full.data[i + 2]], full.data[i + 3] / 255);
    }
  }
  if (bare) return fig; // só a figura (para a silhueta de quem você ainda não conhece)
  const bg = buffer(G, G);
  paintBackground(bg, spec, rngOf(spec.seed ?? 7));
  dropShadow(bg, fig);
  over(bg, fig);
  return bg;
}
