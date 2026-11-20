import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { sound } from '../engine/audioSynth.js';
import { prefersReducedMotion } from './motion.js';

/**
 * Versão 2.43: a morte. Uma cena em quatro tempos, toda em WAAPI (transform e opacity):
 *  1. As trincas (0 – 3 s): três golpes, cada um com um clarão, um tranco e a tela chegando
 *     mais perto; a cada um, uma leva de trincas corre do impacto para fora (com galhos finos e
 *     a teia de arcos em volta do impacto), exatamente onde o vidro vai se partir. O coração bate
 *     duas vezes e a cor vai embora; no fim as trincas brilham e abrem um fio.
 *  2. O vidro (3 – 5,5 s): a tela se parte em cacos (células de Voronoi em volta do impacto,
 *     com a imagem da tela em cada um), com a quina clara, a espessura, lascas na beirada e
 *     riscos, e eles caem girando em 3D, os de perto primeiro. Atrás, o escuro com poeira.
 *  3. A última pedra (5,2 – 9,7 s): a luz acende três vezes, piscando como lâmpada velha; em
 *     cada uma a pedra de dominó em pé está mais longe; na terceira a lâmpada é vermelha (a pedra
 *     fica no tom dela), a pedra balança, tomba e levanta poeira, e a luz morre falhando.
 *  4. O fim (10 s): no escuro, o letreiro de LED vermelho "O BAR FECHOU" acende piscando e entram
 *     os botões TENTE NOVAMENTE e VOLTAR.
 *  4. Aí entra o fim de jogo (ou, com `fade`, o escuro some e fica o modo espectador).
 */
export const BREAK_MS = 11400;
/** Versão 2.43.1: a versão curta (a roda online): acaba quando o último caco cai. */
export const SHORT_MS = 5300;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Um aleatório com semente: a quebra é desenhada, sempre a mesma (e bonita). */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Corta o polígono pelo semiplano dos pontos mais perto de `a` que de `b` (Sutherland–Hodgman). */
function clipHalf(poly, a, b) {
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp <= 0) !== (sq <= 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** Os cacos: as células de Voronoi de sementes em anéis em volta do impacto (em px da tela). */
function shardsOf(W, H, impact, light = false) {
  const r = rngOf(4307);
  const D = Math.hypot(W, H);
  const seeds = [];
  // versão 2.44.2: na roda (a versão curta), menos cacos: cada caco é uma cópia da tela inteira
  const rings = light
    ? [
        [0.09, 3],
        [0.3, 6],
      ]
    : [
        [0.07, 4],
        [0.2, 6],
        [0.42, 7],
      ];
  rings.forEach(([rad, n], k) => {
    const off = r() * Math.PI * 2;
    for (let i = 0; i < n; i += 1) {
      const a = off + (i / n) * Math.PI * 2 + (r() - 0.5) * (Math.PI / n);
      const d = rad * D * (0.82 + r() * 0.36);
      seeds.push([impact[0] + Math.cos(a) * d * (1 + k * 0.08), impact[1] + Math.sin(a) * d * 0.78]);
    }
  });
  const rect = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  const cells = [];
  for (const s of seeds) {
    let poly = rect;
    for (const o of seeds) if (o !== s) poly = clipHalf(poly, s, o);
    if (poly.length < 3) continue;
    let cx = 0;
    let cy = 0;
    for (const p of poly) {
      cx += p[0];
      cy += p[1];
    }
    cx /= poly.length;
    cy /= poly.length;
    cells.push({ poly, cx, cy, dist: Math.hypot(cx - impact[0], cy - impact[1]) / D, rnd: [r(), r(), r(), r(), r()] });
  }
  return cells;
}

/** As trincas: as beiradas dos cacos que não estão na borda da tela (sem repetir). */
function cracksOf(cells, W, H, impact) {
  const D = Math.hypot(W, H);
  const seen = new Set();
  const out = [];
  const onBorder = (p, q) => (Math.abs(p[0]) < 0.5 && Math.abs(q[0]) < 0.5) || (Math.abs(p[0] - W) < 0.5 && Math.abs(q[0] - W) < 0.5) || (Math.abs(p[1]) < 0.5 && Math.abs(q[1]) < 0.5) || (Math.abs(p[1] - H) < 0.5 && Math.abs(q[1] - H) < 0.5);
  for (const c of cells) {
    for (let i = 0; i < c.poly.length; i += 1) {
      let p = c.poly[i];
      let q = c.poly[(i + 1) % c.poly.length];
      if (onBorder(p, q) || Math.hypot(q[0] - p[0], q[1] - p[1]) < 1) continue;
      const key = [p, q]
        .map((v) => `${Math.round(v[0])},${Math.round(v[1])}`)
        .sort()
        .join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      // corre do lado mais perto do impacto para o mais longe
      if (Math.hypot(q[0] - impact[0], q[1] - impact[1]) < Math.hypot(p[0] - impact[0], p[1] - impact[1])) [p, q] = [q, p];
      out.push({ p, q, d: Math.hypot(p[0] - impact[0], p[1] - impact[1]) / D, len: Math.hypot(q[0] - p[0], q[1] - p[1]) });
    }
  }
  return out;
}

/** O que a cópia guarda de cada coisa que estava animando na hora (o resto já vem no DOM). */
const FROZEN = ['opacity', 'transform', 'translate', 'rotate', 'scale', 'filter', 'visibility', 'clip-path', '-webkit-clip-path', 'background-position', 'stroke-dashoffset', 'color'];

function pathOf(el, root) {
  const path = [];
  for (let n = el; n && n !== root; n = n.parentElement) {
    if (!n.parentElement) return null;
    path.push(Array.prototype.indexOf.call(n.parentElement.children, n));
  }
  return path.reverse();
}

/** O quadro exato de cada coisa que estava no meio de uma animação (vai para as cópias). */
function freezeStates(root, overlay) {
  const out = [];
  const anims = typeof document.getAnimations === 'function' ? document.getAnimations() : [];
  const seen = new Set();
  for (const a of anims) {
    const el = a.effect?.target;
    if (!el || seen.has(el) || a.effect?.pseudoElement || !root.contains(el) || overlay.contains(el)) continue;
    seen.add(el);
    const path = pathOf(el, root);
    if (!path) continue;
    const cs = getComputedStyle(el);
    out.push({ path, style: FROZEN.map((p) => [p, p === 'transform' ? (flat2d(cs.transform) ?? cs.transform) : cs.getPropertyValue(p)]).filter(([, v]) => v) });
  }
  // versão 2.44.2: o que só tem um "3D de enfeite" (translateZ(0), will-change) vira 2D na cópia:
  // cada um desses virava uma camada na placa de vídeo em cada caco (e puxava as vizinhas junto)
  for (const el of root.querySelectorAll('*')) {
    if (seen.has(el) || overlay.contains(el)) continue;
    const cs = getComputedStyle(el);
    const flat = flat2d(cs.transform);
    const hidden = cs.backfaceVisibility === 'hidden';
    if (!flat && !hidden) continue;
    const path = pathOf(el, root);
    if (!path) continue;
    const style = [];
    if (flat) style.push(['transform', flat]);
    if (hidden) style.push(['backface-visibility', 'visible']);
    out.push({ path, style });
  }
  return out;
}

/** Um matrix3d que na verdade é 2D (sem giro em X/Y, sem profundidade) → o matrix 2D igual. */
function flat2d(t) {
  // (o navegador já devolve "matrix(...)" para um translateZ(0): fixar esse valor na cópia tira o 3D)
  if (t?.startsWith('matrix(')) return t;
  if (!t || !t.startsWith('matrix3d(')) return null;
  const m = t.slice(9, -1).split(',').map(Number);
  if (m.length !== 16 || m.some((v) => !Number.isFinite(v))) return null;
  const z = [m[2], m[3], m[6], m[7], m[8], m[9], m[11], m[14]];
  if (z.some((v) => Math.abs(v) > 1e-6) || Math.abs(m[10] - 1) > 1e-6 || Math.abs(m[15] - 1) > 1e-6) return null;
  return `matrix(${m[0]}, ${m[1]}, ${m[4]}, ${m[5]}, ${m[12]}, ${m[13]})`;
}

const CANVAS_LOOK = ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'transform', 'transform-origin', 'image-rendering', 'opacity', 'filter', 'z-index', 'mix-blend-mode', 'flex', 'vertical-align', 'max-width', 'max-height', 'min-width', 'min-height', 'box-sizing', 'border', 'border-radius', 'background', 'clip-path', 'visibility'];

/** Uma cópia parada da tela agora (o DOM do #root, com o desenho de cada canvas copiado). */
function snapshotOf(root, overlay, frozen) {
  const copy = root.cloneNode(true);
  copy.removeAttribute('id');
  copy.className = 'screen-shard-copy';
  for (const { path, style } of frozen) {
    let node = copy;
    for (const i of path) node = node?.children[i];
    if (!node?.style) continue;
    for (const [prop, value] of style) node.style.setProperty(prop, value, 'important');
  }
  const from = [...root.querySelectorAll('canvas')].filter((c) => !overlay.contains(c));
  const to = [...copy.querySelectorAll('canvas')].filter((c) => !c.closest('.screen-break'));
  // versão 2.44.2: cada canvas vira uma imagem (a mesma para todos os cacos): canvas copiado é
  // uma camada própria na placa de vídeo em cada caco, e isso derrubava o celular
  from.forEach((src, i) => {
    const dst = to[i];
    if (!dst) return;
    // versão 2.45.2: o brilho da luz (WebGL, por cima de tudo com "screen") não vai para os
    // cacos: em cada cópia ele era mais uma camada da tela inteira
    if (src.classList.contains('fx-layer')) {
      dst.remove();
      return;
    }
    const img = document.createElement('img');
    for (const { name, value } of dst.attributes) img.setAttribute(name, value);
    img.alt = '';
    img.draggable = false;
    // (as regras do CSS que pegam "canvas" pelo nome não valem para a imagem: o estilo vai junto)
    const cs = getComputedStyle(src);
    for (const prop of CANVAS_LOOK) img.style.setProperty(prop, cs.getPropertyValue(prop), 'important');
    if (src.width && src.height) {
      try {
        src.fxRedraw?.();
        img.src = src.toDataURL();
      } catch {
        // (se a luz em WebGL não copiar, fica sem o brilho, sem problema)
      }
    }
    dst.replaceWith(img);
  });
  copy.querySelectorAll('.screen-break').forEach((el) => el.remove());
  return copy;
}

const el = (tag, cls, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  parent?.appendChild(n);
  return n;
};
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.appendChild(n);
  return n;
};
const run = (node, frames, opts) => (typeof node.animate === 'function' ? node.animate(frames, { fill: 'both', ...opts }) : null);

/** A pedra de dominó em pé (pixel art em SVG): a carroça de sena, marfim gasto, contorno escuro. */
/** As cores da pedra: o marfim debaixo da lâmpada quente, ou tingido pela luz vermelha. */
const BONE = { ink: '#1a120a', face: '#d8cba6', top: '#f4ecd2', lit: '#ece2c2', side: '#a89a76', foot: '#9a8c68', mid: '#3a2a18', pip: '#1a120a', pipLit: '#4a3a2a' };
const BONE_RED = { ink: '#160303', face: '#b8322c', top: '#f0645a', lit: '#d84a40', side: '#7a1a18', foot: '#661412', mid: '#3a0606', pip: '#200404', pipLit: '#5a1010' };

function dominoSvg(parent, P = BONE) {
  const svg = svgEl('svg', { viewBox: '0 0 22 42', class: 'death-domino-px', 'shape-rendering': 'crispEdges' }, parent);
  const R = (x, y, w, h, c) => svgEl('rect', { x, y, width: w, height: h, fill: c }, svg);
  R(1, 0, 20, 42, P.ink);
  R(0, 1, 22, 40, P.ink);
  R(1, 1, 20, 40, P.face);
  R(2, 1, 18, 2, P.top);
  R(1, 2, 2, 37, P.lit);
  R(19, 3, 2, 37, P.side);
  R(2, 38, 18, 2, P.foot);
  R(3, 20, 16, 2, P.mid);
  R(3, 22, 16, 1, P.top);
  for (const [cx, cy] of [
    [6, 5],
    [6, 10],
    [6, 15],
    [15, 5],
    [15, 10],
    [15, 15],
    [6, 26],
    [6, 31],
    [6, 36],
    [15, 26],
    [15, 31],
    [15, 36],
  ]) {
    R(cx - 1, cy - 1, 3, 3, P.pip);
    R(cx - 1, cy - 1, 1, 1, P.pipLit);
  }
  return svg;
}

/** Versão 2.43: as letras do letreiro de LED (5 × 7 pontos). */
const LED_FONT = {
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

/**
 * O letreiro de LED vermelho ("O BAR FECHOU"): a placa escura, os pontos apagados no fundo e os
 * acesos com o brilho. Devolve a altura em px.
 */
function ledSign(parent, text, width) {
  const cols = text.length * 6 - 1 + 4;
  const rows = 7 + 4;
  const pitch = width / cols;
  const svg = svgEl('svg', { class: 'death-led', viewBox: `0 0 ${cols} ${rows}`, width: width.toFixed(1), height: (rows * pitch).toFixed(1) }, parent);
  const defs = svgEl('defs', {}, svg);
  const pat = svgEl('pattern', { id: 'death-led-dot', width: 1, height: 1, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('circle', { cx: 0.5, cy: 0.5, r: 0.32, fill: '#3a0a0c' }, pat);
  svgEl('rect', { x: 0, y: 0, width: cols, height: rows, rx: 0.8, fill: '#0c0506', stroke: '#2a1416', 'stroke-width': 0.35 }, svg);
  svgEl('rect', { x: 1, y: 1, width: cols - 2, height: rows - 2, fill: 'url(#death-led-dot)' }, svg);
  const lit = svgEl('g', { class: 'death-led-lit' }, svg);
  [...text].forEach((ch, i) => {
    const g = LED_FONT[ch] ?? LED_FONT[' '];
    g.forEach((row, y) => {
      [...row].forEach((on, x) => {
        if (on === '1') svgEl('circle', { cx: 2 + i * 6 + x + 0.5, cy: 2 + y + 0.5, r: 0.42 }, lit);
      });
    });
  });
  return rows * pitch;
}

/** Os tempos da cena (ms). */
const T = {
  crack: [80, 1100, 2100], // as três levas de trincas (cada uma com um tranco)
  open: 2600, // as trincas brilham e abrem um fio
  fall: 3000, // os cacos começam a cair
  // a luz acende três vezes; em cada uma a pedra está mais longe; na última ela cai e a luz morre
  lamps: [
    [5200, 6300],
    [6750, 7850],
    [8300, 9650],
  ],
  wobble: 8700,
  topple: 9050,
  thud: 9350,
  // depois do escuro: o letreiro "O BAR FECHOU" acende piscando e entram os botões
  sign: 10050,
  buttons: 10800,
};

/** Encolhe (b > 0) ou estica (b < 0) o polígono em `b` px na direção do centro. */
function inset(poly, cx, cy, b) {
  return poly.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const n = Math.hypot(dx, dy) || 1;
    const k = Math.max(0, n - b) / n;
    return [cx + dx * k, cy + dy * k];
  });
}
const pts = (poly) => poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Monta e anima a cena inteira dentro de `host`. Devolve as animações (para cancelar). */
function stage(host, root, sizeW, sizeH, short = false) {
  const W = sizeW;
  const H = sizeH;
  const D = Math.hypot(W, H);
  const u = D / 1000; // a régua dos detalhes (em telas pequenas, tudo menor)
  const impact = [W * 0.5, H * 0.6];
  const anims = [];
  const A = (node, frames, opts) => {
    const a = run(node, frames, opts);
    if (a) anims.push(a);
    return a;
  };
  /** Quadros-chave em ms absolutos da cena (vira `offset` sobre BREAK_MS). */
  const at = (list, step = false) => list.map(([ms, k]) => ({ ...k, offset: Math.min(1, Math.max(0, ms / BREAK_MS)), ...(step ? { easing: 'steps(1, end)' } : {}) }));
  const rd = rngOf(77);

  // --- o escuro de trás: um vermelho fundo que pulsa com o coração, e a poeira subindo -------
  const voidEl = el('div', 'death-void', host);
  const pulse = el('div', 'death-pulse', voidEl);
  pulse.style.left = `${impact[0]}px`;
  pulse.style.top = `${impact[1]}px`;
  A(
    pulse,
    at([
      [0, { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6)' }],
      [T.fall, { opacity: 0.2, transform: 'translate(-50%, -50%) scale(0.9)' }],
      [T.fall + 300, { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1)' }],
      [T.fall + 900, { opacity: 0.3, transform: 'translate(-50%, -50%) scale(1.1)' }],
      [T.fall + 1300, { opacity: 0.6, transform: 'translate(-50%, -50%) scale(1.05)' }],
      [T.lamps[0][0], { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.15)' }],
      [BREAK_MS, { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }],
    ]),
    { duration: BREAK_MS, easing: 'linear' },
  );
  for (let i = 0; i < 30; i += 1) {
    const mote = el('span', 'death-mote', voidEl);
    const s = 1 + Math.round(rd() * 2);
    Object.assign(mote.style, { left: `${rd() * W}px`, top: `${H * (0.35 + rd() * 0.7)}px`, width: `${s}px`, height: `${s}px` });
    A(
      mote,
      [
        { opacity: 0, transform: 'translate3d(0, 0, 0)' },
        { opacity: 0.55, transform: `translate3d(${(rd() - 0.5) * 20}px, ${-H * 0.08}px, 0)`, offset: 0.4 },
        { opacity: 0, transform: `translate3d(${(rd() - 0.5) * 40}px, ${-H * (0.2 + rd() * 0.15)}px, 0)` },
      ],
      { duration: 2600 + rd() * 1600, delay: T.fall + 200 + rd() * 3600, easing: 'ease-out' },
    );
  }

  // --- as três luzes e a pedra cada vez mais longe (não na versão curta) ---------------------
  const tall0 = Math.round(Math.min(H * 0.26, W * 0.16));
  const stations = [
    { k: 1, floor: H * 0.7 },
    { k: 0.6, floor: H * 0.6 },
    { k: 0.38, floor: H * 0.535 },
  ];
  (short ? [] : stations).forEach(({ k, floor }, n) => {
    const [on, off] = T.lamps[n];
    const last = n === stations.length - 1;
    const tall = Math.round(tall0 * k);
    const wide = Math.round((tall * 22) / 42);
    const lamp = el('div', `death-lamp ${last ? 'is-red' : ''}`, host);
    // versão 2.43: na última, a lâmpada é vermelha (e a pedra fica no tom dela)
    const coneTop = 0;
    const cone = el('div', 'death-cone', lamp);
    const pool = el('div', 'death-pool', lamp);
    const shadow = el('div', 'death-shadow', lamp);
    const pivot = el('div', 'death-domino', lamp);
    Object.assign(cone.style, { left: `${W / 2}px`, top: `${coneTop}px`, width: `${last ? Math.min(W * 0.5, tall0 * 3) : tall0 * 3.4 * (0.45 + k * 0.55)}px`, height: `${floor + tall * 0.25 - coneTop}px` });
    Object.assign(pool.style, { left: `${W / 2}px`, top: `${floor}px`, width: `${tall * 3.2}px`, height: `${tall * 0.5}px` });
    Object.assign(shadow.style, { left: `${W / 2}px`, top: `${floor}px`, width: `${wide * 1.6}px`, height: `${Math.max(4, tall * 0.12)}px` });
    Object.assign(pivot.style, { left: `${W / 2 - wide / 2}px`, top: `${floor - tall}px`, width: `${wide}px`, height: `${tall}px` });
    dominoSvg(pivot, last ? BONE_RED : BONE);
    // a luz: acende piscando (lâmpada velha), fica, e apaga de uma vez; a última morre falhando
    const light = [
      [0, { opacity: 0 }],
      [on, { opacity: 1 }],
      [on + 70, { opacity: 0.15 }],
      [on + 130, { opacity: 0.9 }],
      [on + 190, { opacity: 0.4 }],
      [on + 240, { opacity: 1 }],
    ];
    if (last) {
      light.push([off - 300, { opacity: 1 }], [off - 200, { opacity: 0.3 }], [off - 140, { opacity: 1 }], [off - 80, { opacity: 0.12 }], [off - 40, { opacity: 0.7 }], [off, { opacity: 0 }]);
    }
    else light.push([off, { opacity: 0 }]);
    light.push([BREAK_MS, { opacity: 0 }]);
    A(lamp, at(light, true), { duration: BREAK_MS });
    if (!last) return;
    // a última: balança, tomba para a direita (presa no canto de baixo) e quica
    A(
      pivot,
      at([
        [0, { transform: 'rotate(0deg)' }],
        [T.wobble, { transform: 'rotate(0deg)', easing: 'ease-in-out' }],
        [T.wobble + 110, { transform: 'rotate(4deg)', easing: 'ease-in-out' }],
        [T.wobble + 210, { transform: 'rotate(-2.5deg)', easing: 'ease-in-out' }],
        [T.topple, { transform: 'rotate(7deg)', easing: 'cubic-bezier(0.5, 0, 0.9, 0.4)' }],
        [T.thud, { transform: 'rotate(90deg)', easing: 'ease-out' }],
        [T.thud + 90, { transform: 'rotate(82deg)', easing: 'ease-in' }],
        [T.thud + 180, { transform: 'rotate(90deg)' }],
        [BREAK_MS, { transform: 'rotate(90deg)' }],
      ]),
      { duration: BREAK_MS },
    );
    A(
      shadow,
      at([
        [0, { transform: 'translate(-50%, -50%) scaleX(1)' }],
        [T.topple, { transform: 'translate(-50%, -50%) scaleX(1.2)' }],
        [T.thud, { transform: `translate(calc(-50% + ${tall * 0.45}px), -50%) scaleX(3.4)` }],
        [BREAK_MS, { transform: `translate(calc(-50% + ${tall * 0.45}px), -50%) scaleX(3.4)` }],
      ]),
      { duration: BREAK_MS },
    );
    const hitX = W / 2 + wide / 2 + tall * 0.5;
    for (let i = 0; i < 12; i += 1) {
      const puff = el('span', 'death-dust', lamp);
      const s = 2 + Math.round(rd() * 4 * k + 1);
      Object.assign(puff.style, { left: `${hitX + (rd() - 0.5) * tall}px`, top: `${floor - 2}px`, width: `${s}px`, height: `${s}px` });
      const dir = rd() < 0.5 ? -1 : 1;
      A(
        puff,
        [
          { opacity: 0, transform: 'translate3d(0, 0, 0) scale(0.6)' },
          { opacity: 0.8, transform: `translate3d(${dir * (5 + rd() * 9)}px, ${-3 - rd() * 6}px, 0) scale(1)`, offset: 0.2 },
          { opacity: 0, transform: `translate3d(${dir * (14 + rd() * 26)}px, ${-10 - rd() * 18}px, 0) scale(1.8)` },
        ],
        { duration: 800 + rd() * 400, delay: T.thud, easing: 'ease-out' },
      );
    }
  });

  // --- o vidro: a tela em cacos -------------------------------------------------------------
  const cells = shardsOf(W, H, impact, true);
  // (o zoom, o tranco e a perspectiva em camadas separadas: nenhuma animação briga com outra)
  const zoom = el('div', 'death-glass', host);
  const glass = el('div', 'death-shake', zoom);
  const frozen = freezeStates(root, host);
  const base = snapshotOf(root, host, frozen);
  // para cada caco, só o que aparece nele: os blocos soltos (absolute/fixed) que ficam inteiros
  // fora do caco saem da cópia (sem mexer no resto da tela). Assim cada caco tem pouca coisa.
  const live = [...root.querySelectorAll('*')].filter((n) => !host.contains(n));
  const boxes = live.map((n) => {
    const b = n.getBoundingClientRect();
    const pos = getComputedStyle(n).position;
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, loose: pos === 'absolute' || pos === 'fixed' };
  });
  const indexOf = new Map(live.map((n, i) => [n, i]));
  for (let i = live.length - 1; i >= 0; i -= 1) {
    const j = indexOf.get(live[i].parentElement) ?? -1;
    if (j < 0) continue;
    const a = boxes[j];
    const b = boxes[i];
    if (b.r - b.l <= 0 && b.b - b.t <= 0) continue;
    a.l = Math.min(a.l, b.l);
    a.t = Math.min(a.t, b.t);
    a.r = Math.max(a.r, b.r);
    a.b = Math.max(a.b, b.b);
  }
  const prune = (copy, c) => {
    const xs = c.poly.map((q) => q[0]);
    const ys = c.poly.map((q) => q[1]);
    const L = Math.min(...xs) - 30;
    const R = Math.max(...xs) + 30;
    const Tp = Math.min(...ys) - 30;
    const B = Math.max(...ys) + 30;
    const nodes = [...copy.querySelectorAll('*')];
    if (nodes.length !== boxes.length) return;
    const drop = [];
    const hollow = [];
    nodes.forEach((n, k) => {
      const bx = boxes[k];
      if (!(bx.r < L || bx.l > R || bx.b < Tp || bx.t > B)) return;
      if (bx.loose) drop.push(n);
      // versão 2.44.2: o que está no fluxo e fica todo fora do caco vira uma caixa vazia do
      // mesmo tamanho (o resto da tela não se mexe e a cópia tem bem menos coisa)
      else if (n.firstChild && n.style) hollow.push([n, bx]);
    });
    for (const n of drop) n.remove();
    for (const [n, bx] of hollow) {
      if (!n.isConnected) continue;
      n.style.setProperty('box-sizing', 'border-box', 'important');
      n.style.setProperty('width', `${bx.w}px`, 'important');
      n.style.setProperty('height', `${bx.h}px`, 'important');
      n.style.setProperty('flex', 'none', 'important');
      n.replaceChildren();
    }
  };
  cells.forEach((c, i) => {
    // o fio que abre na trinca > a queda em 3D > o recorte do caco (o recorte vai junto com ele)
    // versão 2.44.2: cada caco é do tamanho dele (antes, cada camada do caco tinha a tela
    // inteira: ~100 camadas de tela cheia na placa de vídeo derrubavam o celular na roda)
    const xs = c.poly.map((q) => q[0]);
    const ys = c.poly.map((q) => q[1]);
    const bl = Math.floor(Math.min(...xs)) - 3;
    const bt = Math.floor(Math.min(...ys)) - 3;
    const bw = Math.ceil(Math.max(...xs)) + 3 - bl;
    const bh = Math.ceil(Math.max(...ys)) + 3 - bt;
    const wrap = el('div', 'death-shard-wrap', glass);
    Object.assign(wrap.style, { left: `${bl}px`, top: `${bt}px`, width: `${bw}px`, height: `${bh}px` });
    const fall = el('div', 'death-shard-fall', wrap);
    fall.style.transformOrigin = `${c.cx - bl}px ${c.cy - bt}px`;
    const shard = el('div', 'death-shard', fall);
    // (o recorte 1 px maior para fora: os cacos se sobrepõem e não aparece fresta antes da hora)
    const clip = `polygon(${inset(c.poly, c.cx, c.cy, -1)
      .map(([x, y]) => `${(x - bl).toFixed(1)}px ${(y - bt).toFixed(1)}px`)
      .join(', ')})`;
    shard.style.clipPath = clip;
    shard.style.webkitClipPath = clip;
    let copy = base;
    if (i > 0) copy = base.cloneNode(true);
    if (i > 0) prune(copy, c);
    Object.assign(copy.style, { position: 'absolute', left: `${-bl}px`, top: `${-bt}px`, width: `${W}px`, height: `${H}px` });
    shard.appendChild(copy);
    if (i === cells.length - 1) prune(base, cells[0]);
    const gray = el('div', 'death-gray', shard);
    const shade = el('div', 'death-shade', shard);
    const sheen = el('div', 'death-sheen', shard);
    // o vidro de verdade: a quina clara, a espessura (uma faixa clara e uma escura por dentro da
    // beirada), lascas tiradas da beirada e riscos de desgaste
    const rr = rngOf(900 + i * 31);
    const rim = svgEl('svg', { class: 'death-rim', viewBox: `${bl} ${bt} ${bw} ${bh}`, width: bw, height: bh }, shard);
    svgEl('polygon', { class: 'rim-bevel', points: pts(inset(c.poly, c.cx, c.cy, 4 * u + 2)), 'stroke-width': (5 * u + 2).toFixed(1) }, rim);
    svgEl('polygon', { class: 'rim-depth', points: pts(inset(c.poly, c.cx, c.cy, 8 * u + 4)), 'stroke-width': (2 * u + 1.5).toFixed(1) }, rim);
    svgEl('polygon', { class: 'rim-edge', points: pts(c.poly), 'stroke-width': (2.4 * u + 1.6).toFixed(1) }, rim);
    for (let e = 0; e < c.poly.length; e += 1) {
      const p = c.poly[e];
      const q = c.poly[(e + 1) % c.poly.length];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 30) continue;
      const ex = (q[0] - p[0]) / len;
      const ey = (q[1] - p[1]) / len;
      // para dentro do caco
      let nx = -ey;
      let ny = ex;
      if ((c.cx - p[0]) * nx + (c.cy - p[1]) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const chips = 1 + Math.floor(rr() * Math.min(3, len / 60));
      for (let k = 0; k < chips; k += 1) {
        const t = 0.15 + rr() * 0.7;
        const half = (2.5 + rr() * 4) * u + 1;
        const deep = (2 + rr() * 5) * u + 1;
        const bx = p[0] + ex * len * t;
        const by = p[1] + ey * len * t;
        const tri = [
          [bx - ex * half, by - ey * half],
          [bx + ex * half, by + ey * half],
          [bx + nx * deep + ex * (rr() - 0.5) * half, by + ny * deep + ey * (rr() - 0.5) * half],
        ];
        svgEl('polygon', { class: 'rim-chip', points: pts(tri) }, rim);
        svgEl('line', { class: 'rim-chip-lit', x1: tri[1][0].toFixed(1), y1: tri[1][1].toFixed(1), x2: tri[2][0].toFixed(1), y2: tri[2][1].toFixed(1) }, rim);
      }
    }
    for (let k = 0; k < 3; k += 1) {
      const a = rr() * Math.PI;
      const l = (14 + rr() * 40) * u;
      const ox = c.cx + (rr() - 0.5) * 60 * u;
      const oy = c.cy + (rr() - 0.5) * 40 * u;
      svgEl('line', { class: 'rim-scratch', x1: (ox - Math.cos(a) * l).toFixed(1), y1: (oy - Math.sin(a) * l).toFixed(1), x2: (ox + Math.cos(a) * l).toFixed(1), y2: (oy + Math.sin(a) * l).toFixed(1) }, rim);
    }
    A(gray, [{ opacity: 0 }, { opacity: 1 }], { duration: T.open, delay: 80, easing: 'ease-in' });
    // o caco: abre um fio na trinca, espera a vez e cai girando em 3D (parábola de verdade)
    const [r0, r1, r2, r3, r4] = c.rnd;
    const vx = (c.cx - impact[0]) / (D * c.dist + 1);
    const vy = (c.cy - impact[1]) / (D * c.dist + 1);
    const delay = T.fall + c.dist * 1300 + r0 * 220;
    const dur = 1600 + r1 * 500;
    const rx = (r2 - 0.5) * 150;
    const ry = (r3 - 0.5) * 120;
    const rz = (r4 - 0.5) * 70 + vx * 25;
    const push = 30 + (1 - c.dist) * 70;
    const frames = [];
    for (let k = 0; k <= 10; k += 1) {
      const t = k / 10;
      // (começa parado: o fio da trinca já foi aberto pelo `wrap`)
      const x = vx * push * Math.pow(t, 0.6);
      const y = vy * push * 0.5 * t + H * 1.3 * t * t;
      const z = 140 * t * (0.5 + r3);
      frames.push({ transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${(rx * t).toFixed(1)}deg) rotateY(${(ry * t).toFixed(1)}deg) rotateZ(${(rz * t).toFixed(1)}deg)`, offset: t });
    }
    // o fio abre em dois tempos (o vidro cede) e o caco ainda treme antes de soltar
    A(
      wrap,
      at([
        [0, { transform: 'translate3d(0, 0, 0)' }],
        [T.open, { transform: 'translate3d(0, 0, 0)', easing: 'ease-out' }],
        [T.open + 120, { transform: `translate3d(${(vx * 1.6).toFixed(1)}px, ${(vy * 1.6).toFixed(1)}px, 0)`, easing: 'ease-out' }],
        [T.fall - 60, { transform: `translate3d(${(vx * 2).toFixed(1)}px, ${(vy * 2).toFixed(1)}px, 0)` }],
        [T.fall, { transform: `translate3d(${(vx * 3.2).toFixed(1)}px, ${(vy * 3.2).toFixed(1)}px, 0)` }],
        [BREAK_MS, { transform: `translate3d(${(vx * 3.2).toFixed(1)}px, ${(vy * 3.2).toFixed(1)}px, 0)` }],
      ]),
      { duration: BREAK_MS },
    );
    const drop = A(fall, frames, { duration: dur, delay, easing: 'linear' });
    // versão 2.45.2: o caco que já caiu (fora da tela) sai da página e devolve a memória dele
    drop?.finished.then(() => wrap.remove()).catch(() => {});
    A(shade, [{ opacity: 0 }, { opacity: 0.75 }], { duration: dur, delay, easing: 'ease-in' });
    // o reflexo corre pelo caco enquanto ele gira
    A(sheen, [{ opacity: 0, transform: 'translateX(-30%)' }, { opacity: 0.95, transform: 'translateX(0%)', offset: 0.25 }, { opacity: 0.2, transform: 'translateX(30%)' }], { duration: dur, delay: delay - 150, easing: 'ease-out' });
    A(rim, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: T.open - 80, easing: 'ease-out' });
  });
  // a cada leva de trincas, um tranco (cada vez mais forte) e a tela chega um pouco mais perto
  A(
    zoom,
    at([
      [0, { transform: 'scale(1)' }],
      [T.crack[0] + 200, { transform: 'scale(1.02)' }],
      [T.crack[1], { transform: 'scale(1.024)' }],
      [T.crack[1] + 160, { transform: 'scale(1.038)' }],
      [T.crack[2], { transform: 'scale(1.04)' }],
      [T.crack[2] + 160, { transform: 'scale(1.055)' }],
      [BREAK_MS, { transform: 'scale(1.06)' }],
    ]),
    { duration: BREAK_MS, easing: 'linear' },
  );
  const jolt = (t0, amp) =>
    A(
      glass,
      [0, -1, 0.85, -0.6, 0.4, -0.15, 0].map((m, k) => ({ transform: `translate(${(m * amp).toFixed(1)}px, ${(-m * amp * 0.6 * (k % 2 ? -1 : 1)).toFixed(1)}px)` })),
      { duration: 300, delay: t0, easing: 'steps(6, end)', fill: 'none' },
    );
  jolt(T.crack[0], 7);
  jolt(T.crack[1], 5);
  jolt(T.crack[2], 8);
  jolt(T.fall - 20, 4);

  // --- as trincas: três levas, do impacto para fora, onde o vidro vai se partir -------------
  const cracks = svgEl('svg', { class: 'death-cracks', viewBox: `0 0 ${W} ${H}`, width: W, height: H }, glass);
  const draw = (p, q, delay, kind = 'main') => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 1) return;
    const dash = `${len.toFixed(1)} ${(len + 2).toFixed(1)}`;
    const layers = kind === 'main' ? ['crack-halo', 'crack-dark', 'crack-glint'] : ['crack-hair', 'crack-glint-thin'];
    for (const cls of layers) {
      const off = cls.includes('glint') ? -0.8 : 0;
      const n = svgEl('line', { class: cls, x1: p[0].toFixed(1), y1: (p[1] + off).toFixed(1), x2: q[0].toFixed(1), y2: (q[1] + off).toFixed(1), 'stroke-dasharray': dash }, cracks);
      A(n, [{ strokeDashoffset: len + 1 }, { strokeDashoffset: 0 }], { duration: 90 + len * 0.35, delay, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
    }
    return 90 + len * 0.35;
  };
  const wave = (d) => (d < 0.12 ? 0 : d < 0.28 ? 1 : 2);
  const bands = [
    [0, 0.12],
    [0.12, 0.28],
    [0.28, 0.75],
  ];
  const rb = rngOf(311);
  for (const k of cracksOf(cells, W, H, impact)) {
    const w = wave(k.d);
    const [lo, hi] = bands[w];
    const delay = T.crack[w] + ((k.d - lo) / (hi - lo)) * 600;
    const took = draw(k.p, k.q, delay);
    // os galhos finos que saem da trinca para os lados (um ou dois em cada uma)
    const ex = (k.q[0] - k.p[0]) / k.len;
    const ey = (k.q[1] - k.p[1]) / k.len;
    const n = k.len > 40 ? 1 + Math.floor(rb() * 2.2) : 0;
    for (let b = 0; b < n; b += 1) {
      const f = 0.2 + rb() * 0.6;
      const o = [k.p[0] + ex * k.len * f, k.p[1] + ey * k.len * f];
      const ang = Math.atan2(ey, ex) + (rb() < 0.5 ? -1 : 1) * (0.45 + rb() * 0.6);
      const l = (10 + rb() * 26) * u + 4;
      const e2 = [o[0] + Math.cos(ang) * l, o[1] + Math.sin(ang) * l];
      draw(o, e2, delay + (took ?? 0) * f + 40, 'hair');
      if (rb() < 0.5) {
        const ang2 = ang + (rb() - 0.5) * 1.2;
        const l2 = l * (0.4 + rb() * 0.4);
        draw(e2, [e2[0] + Math.cos(ang2) * l2, e2[1] + Math.sin(ang2) * l2], delay + (took ?? 0) * f + 120, 'hair');
      }
    }
  }
  // a teia do impacto: arcos curtos em volta do ponto, como no vidro de verdade
  for (const [rad, count] of [
    [16, 5],
    [32, 6],
    [54, 7],
  ]) {
    for (let k = 0; k < count; k += 1) {
      const a0 = rb() * Math.PI * 2;
      const span = 0.35 + rb() * 0.5;
      const r0 = rad * u * (0.85 + rb() * 0.3) + 4;
      const steps = 4;
      let prev = null;
      for (let s = 0; s <= steps; s += 1) {
        const a = a0 + (span * s) / steps;
        const rr = r0 * (0.95 + rb() * 0.1);
        const pnt = [impact[0] + Math.cos(a) * rr, impact[1] + Math.sin(a) * rr * 0.85];
        if (prev) draw(prev, pnt, T.crack[0] + 120 + rad * 4 + s * 25, 'hair');
        prev = pnt;
      }
    }
  }
  // as trincas brilham (o vidro pega a luz) e somem quando os cacos se soltam
  A(
    cracks,
    at([
      [0, { opacity: 1, filter: 'brightness(1)' }],
      [T.open, { opacity: 1, filter: 'brightness(1)' }],
      [T.open + 120, { opacity: 1, filter: 'brightness(1.6)' }],
      [T.fall + 80, { opacity: 1, filter: 'brightness(1)' }],
      [T.fall + 260, { opacity: 0 }],
      [BREAK_MS, { opacity: 0 }],
    ]),
    { duration: BREAK_MS },
  );

  // --- o clarão a cada leva e a vinheta -----------------------------------------------------
  const flash = el('div', 'death-flash', host);
  flash.style.setProperty('--ix', `${impact[0]}px`);
  flash.style.setProperty('--iy', `${impact[1]}px`);
  A(
    flash,
    at([
      [0, { opacity: 1 }],
      [110, { opacity: 0.6 }],
      [420, { opacity: 0 }],
      [T.crack[1], { opacity: 0.45 }],
      [T.crack[1] + 260, { opacity: 0 }],
      [T.crack[2], { opacity: 0.55 }],
      [T.crack[2] + 280, { opacity: 0 }],
      [BREAK_MS, { opacity: 0 }],
    ]),
    { duration: BREAK_MS },
  );
  // --- o fim: o letreiro de LED vermelho e os botões (não na versão curta) -------------------
  if (!short) endSign(host, A, at, W, H);
  const vignette = el('div', 'death-vignette', host);
  A(vignette, at([[0, { opacity: 0 }], [600, { opacity: 0.7 }], [T.fall, { opacity: 1 }], [BREAK_MS, { opacity: 1 }]]), { duration: BREAK_MS, easing: 'ease-out' });
  return anims;
}

/** O letreiro "O BAR FECHOU" acendendo no escuro (e a altura dos botões logo abaixo dele). */
function endSign(host, A, at, W, H) {
  const end = el('div', 'death-end', host);
  const signW = Math.min(W * 0.7, H * 1.5);
  const sign = el('div', 'death-sign', end);
  const signH = ledSign(sign, 'O BAR FECHOU', signW);
  Object.assign(sign.style, { left: `${(W - signW) / 2}px`, top: `${H * 0.3 - signH / 2}px`, width: `${signW}px`, height: `${signH}px` });
  const signOn = [[0, { opacity: 0 }], [T.sign, { opacity: 1 }], [T.sign + 60, { opacity: 0.1 }], [T.sign + 140, { opacity: 1 }], [T.sign + 210, { opacity: 0.25 }], [T.sign + 300, { opacity: 1 }]];
  A(sign, at([...signOn, [BREAK_MS, { opacity: 1 }]], true), { duration: BREAK_MS });
  const glow = el('div', 'death-sign-glow', end);
  Object.assign(glow.style, { left: `${W / 2}px`, top: `${H * 0.3}px`, width: `${signW * 1.5}px`, height: `${signH * 4}px` });
  A(glow, at([...signOn, [BREAK_MS, { opacity: 1 }]], true), { duration: BREAK_MS });
  // (os botões são do React, em cima da cena: aqui só a altura deles, logo abaixo do letreiro)
  host.parentElement?.style.setProperty('--death-actions-top', `${H * 0.3 + signH / 2 + Math.max(24, H * 0.1)}px`);
}

/**
 * `actions`: os botões do fim ([{ label, onClick, tone: 'retry' | 'back' | 'more' }]); com eles a
 * cena fica no letreiro esperando a escolha. Sem eles (a roda online), `onDone` vem no fim e, com
 * `fade`, o escuro some e fica o modo espectador.
 */
function ScreenBreak({ onDone, fade = false, actions = null, short = false }) {
  const ref = useRef(null);
  const done = useRef(onDone);
  // (o `short` de cada morte é fixo: a `key` troca a cada uma)
  const isShort = useRef(short);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useLayoutEffect(() => {
    const host = ref.current;
    const root = document.getElementById('root');
    if (!host || !root) return undefined;
    const box = host.getBoundingClientRect();
    const anims = prefersReducedMotion() ? [] : stage(host, root, Math.max(1, box.width), Math.max(1, box.height), isShort.current);
    // versão 2.45.2: a tela de verdade, por baixo dos cacos, some enquanto a cena roda (a cópia
    // já está nos cacos): o fundo, a luz em WebGL e a mesa param de ocupar a placa de vídeo
    const html = document.documentElement;
    if (anims.length) html.classList.add('death-on');
    return () => {
      html.classList.remove('death-on');
      for (const a of anims) a.cancel();
      host.replaceChildren();
    };
  }, []);
  useEffect(() => {
    sound.playDeath?.(isShort.current);
    // (para conferir quadro a quadro: `window.__HOLD_DEATH = true` segura o fim)
    if (globalThis.__HOLD_DEATH) return undefined;
    const id = setTimeout(() => done.current?.(), prefersReducedMotion() ? 900 : isShort.current ? SHORT_MS : BREAK_MS);
    return () => clearTimeout(id);
  }, []);
  const still = prefersReducedMotion();
  return (
    <div className={`screen-break death-scene ${fade ? 'is-fade' : ''} ${short ? 'is-short' : ''} ${actions ? 'has-actions' : ''}`} aria-hidden={actions ? undefined : 'true'}>
      <div ref={ref} className="death-stage" />
      {actions?.length > 0 && (
        <div className="death-actions" role="group" aria-label="O bar fechou" style={{ animationDelay: still ? '0ms' : `${T.buttons}ms` }}>
          {still && <p className="death-still-title font-pixel">O BAR FECHOU</p>}
          {actions.map((a) => (
            <button key={a.label} type="button" className={`death-btn is-${a.tone ?? 'back'}`} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ScreenBreak);
