/**
 * Layout da mesa em "U" + câmera dinâmica (sem zoom manual).
 *
 * Unidade: o lado curto de uma pedra (1). Pedra comum = 2 x 1. Bucha = 1 x 2
 * ATRAVESSADA em relação à linha (em pé quando a linha corre na horizontal,
 * deitada quando a linha sobe), centrada no encaixe.
 *
 * O "mundo" tem WORLD_COLS unidades de largura e a altura acompanha a tela.
 * A primeira pedra fica no centro da linha de baixo e cada ponta vive na sua
 * metade da mesa (uma ponta nunca mexe na posição da outra):
 *
 *   espiral (padrão): anda para fora pela linha de baixo, sobe pela margem,
 *                     curva para dentro no topo e desce pelo meio;
 *   gancho (corrente longa): igual até curvar no topo, depois sobe pelo
 *                     centro, saindo do mundo (a câmera afasta).
 *
 * A ponta usa a espiral enquanto ela comporta todas as pedras + a próxima
 * vaga; quando não comporta, a ponta inteira passa para o gancho.
 *
 * Em cada pedra a tartaruga tenta: seguir reto, virar a esquina (a pedra
 * ocupa o quadrado logo após a ponta) ou virar "apertado" (a pedra encosta de
 * lado na última metade). Entre voltas sempre sobra folga.
 */

import { getOpenEnds } from './dominoLogic.js';

export const WORLD_COLS = 10;
export const MIN_WORLD_ROWS = 9;
export const MAX_WORLD_ROWS = 22;
/** px por unidade com zoom máximo (pedra comum 96 x 48 px). */
export const BASE_UNIT_PX = 48;
/** Abaixo disso a câmera prefere enquadrar só as pontas abertas. */
export const MIN_UNIT_PX = 26;
/** Zoom mínimo absoluto (só em correntes enormes). Os badges têm tamanho fixo na tela. */
export const FLOOR_UNIT_PX = 12;
/** Folga mínima entre pedras que não se encaixam (voltas da espiral). */
const GAP = 0.5;
/** Quantas pedras à frente a tartaruga confere antes de entrar num corredor. */
const LOOKAHEAD = 2;
const EPS = 1e-6;

const DIR = {
  W: { x: -1, y: 0 },
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
};

/** Sequência de curvas por ponta e estratégia. */
const TURNS = {
  spiral: {
    left: { W: 'N', N: 'E', E: 'S', S: 'W' },
    right: { E: 'N', N: 'W', W: 'S', S: 'E' },
  },
  hook: {
    left: { W: 'N', N: 'E', E: 'N' },
    right: { E: 'N', N: 'W', W: 'N' },
  },
};

const axisOf = (d) => (d === 'W' || d === 'E' ? 'horizontal' : 'vertical');
const add = (p, d, k = 1) => ({ x: p.x + DIR[d].x * k, y: p.y + DIR[d].y * k });

/** Orientação real na mesa: bucha sempre atravessada em relação à linha. */
export function tileOrientationOnBoard(isDouble, lineAxis) {
  if (!isDouble) return lineAxis;
  return lineAxis === 'horizontal' ? 'vertical' : 'horizontal';
}

/** Retângulo centrado em `c`, com `along` unidades na direção `d` e `across` na perpendicular. */
function rectAround(c, d, along, across) {
  const horizontal = axisOf(d) === 'horizontal';
  const w = horizontal ? along : across;
  const h = horizontal ? across : along;
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

/** Retângulo que vai de `from` até `from + len·d`, com largura `across`. */
function rectFrom(from, d, len, across) {
  return rectAround(add(from, d, len / 2), d, len, across);
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
}

/** Distância (Chebyshev) entre dois retângulos; 0 se encostam ou se cruzam. */
export function rectGap(a, b) {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.max(dx, dy);
}

/** Altura do mundo para um container (a largura é sempre WORLD_COLS). */
export function computeWorldSize(width, height, cols = WORLD_COLS) {
  if (!width || !height) return { cols, rows: 13 };
  const rows = Math.floor(height / (width / cols));
  return { cols, rows: Math.max(MIN_WORLD_ROWS, Math.min(MAX_WORLD_ROWS, rows)) };
}

/**
 * Posições candidatas da próxima pedra a partir de um cursor
 * { p: ponto de encaixe, d: direção, prevHalf: meia-largura da pedra anterior, turns }.
 * `core` é a faixa da linha (largura 1) usada para os limites: a parte da
 * bucha que sobra para fora da faixa pode passar um pouco da borda.
 */
function candidates(cursor, double, turnMap) {
  const { p, d, prevHalf, turns } = cursor;
  const list = [];

  // 1) reto
  if (double) {
    const c = add(p, d, 0.5);
    list.push({
      rect: rectAround(c, d, 1, 2),
      core: rectAround(c, d, 1, 1),
      lineAxis: axisOf(d),
      inner: c,
      outer: c,
      next: { p: add(p, d, 1), d, prevHalf: 1, turns },
    });
  } else {
    list.push({
      rect: rectFrom(p, d, 2, 1),
      core: rectFrom(p, d, 2, 1),
      lineAxis: axisOf(d),
      inner: add(p, d, 0.5),
      outer: add(p, d, 1.5),
      next: { p: add(p, d, 2), d, prevHalf: 0.5, turns },
    });
  }

  const d2 = turnMap[d];
  if (!d2) return list;

  // 2) esquina: o quadrado logo após a ponta vira o canto
  const c = add(p, d, 0.5);
  if (double) {
    list.push({
      rect: rectAround(c, d, 1, 2),
      // bucha de quina pode passar meia unidade da borda (a câmera cobre):
      // assim ela fica em pé no fim da linha em vez de deitar por cima da anterior
      core: { ...rectFrom(add(c, d2, -0.5), d2, 1.5, 1), ...halfAlong(p, d) },
      lineAxis: axisOf(d),
      inner: c,
      outer: c,
      next: { p: add(c, d2, 1), d: d2, prevHalf: 0.5, turns: turns + 1 },
    });
  } else {
    list.push({
      rect: rectFrom(add(c, d2, -0.5), d2, 2, 1),
      core: rectFrom(add(c, d2, -0.5), d2, 2, 1),
      lineAxis: axisOf(d2),
      inner: c,
      outer: add(c, d2, 1),
      next: { p: add(c, d2, 1.5), d: d2, prevHalf: 0.5, turns: turns + 1 },
    });
  }

  // 3) esquina apertada: encosta de lado na última metade da pedra anterior
  const base = add(p, d, -0.5);
  if (double) {
    const center = add(base, d2, prevHalf + 0.5);
    list.push({
      rect: rectAround(center, d2, 1, 2),
      core: rectAround(center, d2, 1, 1),
      lineAxis: axisOf(d2),
      inner: center,
      outer: center,
      next: { p: add(center, d2, 0.5), d: d2, prevHalf: 1, turns: turns + 1 },
    });
  } else {
    const inner = add(base, d2, prevHalf + 0.5);
    list.push({
      rect: rectFrom(add(inner, d2, -0.5), d2, 2, 1),
      core: rectFrom(add(inner, d2, -0.5), d2, 2, 1),
      lineAxis: axisOf(d2),
      inner,
      outer: add(inner, d2, 1),
      next: { p: add(inner, d2, 1.5), d: d2, prevHalf: 0.5, turns: turns + 1 },
    });
  }
  return list;
}

/** No gancho, depois da 3ª curva a corrente sobe sem teto. */
function boundsFor(ctx, cand) {
  if (ctx.policy === 'hook' && cand.next.turns >= 3) return { ...ctx.bounds, y0: -Infinity };
  return ctx.bounds;
}

/** Faixa de meia unidade logo após `p` na direção `d` (só o eixo de `d`). */
function halfAlong(p, d) {
  const r = rectFrom(p, d, 0.5, 1);
  return axisOf(d) === 'horizontal' ? { x: r.x, w: r.w } : { y: r.y, h: r.h };
}

function insideBounds(r, b) {
  return r.x >= b.x0 - EPS && r.x + r.w <= b.x1 + EPS && r.y >= b.y0 - EPS && r.y + r.h <= b.y1 + EPS;
}

/** Nível 0 exige folga entre voltas; nível 1 permite encostar. Nunca sobrepõe nem sai da metade. */
function isValid(cand, ctx, level) {
  if (!insideBounds(cand.core, boundsFor(ctx, cand))) return false;
  for (const other of ctx.placed) {
    if (rectsOverlap(cand.rect, other)) return false;
    if (level === 0 && other !== ctx.prev && rectGap(cand.rect, other) < GAP - EPS) return false;
  }
  return true;
}

/** Depois de `cand`, ainda cabem `depth` pedras comuns? (evita becos) */
function hasWayOut(cand, ctx, depth) {
  if (depth === 0) return true;
  const after = { ...ctx, placed: [...ctx.placed, cand.rect], prev: cand.rect };
  return candidates(cand.next, false, ctx.turnMap).some((next) => isValid(next, after, 1) && hasWayOut(next, after, depth - 1));
}

/** Melhor posição para a pedra, ou null se a estratégia não comporta. */
function choosePlacement(cursor, double, ctx) {
  const list = candidates(cursor, double, ctx.turnMap);
  for (let level = 0; level <= 1; level += 1) {
    const valid = list.filter((cand) => isValid(cand, ctx, level));
    const safe = valid.find((cand) => hasWayOut(cand, ctx, LOOKAHEAD));
    if (safe) return safe;
    if (valid.length && level === 1) return valid[0];
  }
  return null;
}

/** Último recurso (não deveria acontecer): sobe até achar espaço livre, sem sobrepor. */
function emergencyPlacement(cursor, double, ctx) {
  const list = candidates(cursor, double, ctx.turnMap);
  const open = { ...ctx, bounds: { ...ctx.bounds, y0: -Infinity } };
  for (let k = 0; k <= 60; k += 0.5) {
    for (const cand of list) {
      const dy = -k;
      const moved = {
        ...cand,
        rect: { ...cand.rect, y: cand.rect.y + dy },
        core: { ...cand.core, y: cand.core.y + dy },
        inner: { ...cand.inner, y: cand.inner.y + dy },
        outer: { ...cand.outer, y: cand.outer.y + dy },
        next: { ...cand.next, p: { ...cand.next.p, y: cand.next.p.y + dy } },
        detached: k > 0,
      };
      if (isValid(moved, open, 1)) return moved;
    }
  }
  return list[0];
}

/**
 * Posiciona uma ponta inteira com uma estratégia. Retorna null se não couber
 * (todas as pedras + a próxima vaga, comum ou bucha).
 */
function layoutBranch(branchTiles, start, ctxBase, policy, allowEmergency = false) {
  const ctx = { ...ctxBase, policy, turnMap: TURNS[policy][ctxBase.branch], placed: [...ctxBase.placed] };
  const out = [];
  let cursor = start;
  let prev = ctxBase.rootRect;
  for (const tile of branchTiles) {
    ctx.prev = prev;
    const double = tile.inner === tile.outer;
    let cand = choosePlacement(cursor, double, ctx);
    if (!cand) {
      if (!allowEmergency) return null;
      cand = emergencyPlacement(cursor, double, ctx);
    }
    out.push({ tile, cand, double });
    ctx.placed.push(cand.rect);
    prev = cand.rect;
    cursor = cand.next;
  }
  ctx.prev = prev;
  const previews = {};
  for (const double of [false, true]) {
    let cand = choosePlacement(cursor, double, ctx);
    if (!cand) {
      if (!allowEmergency) return null;
      cand = emergencyPlacement(cursor, double, ctx);
    }
    previews[double ? 'double' : 'normal'] = cand;
  }
  return { placements: out, previews, cursor, policy };
}

/** Valores [primeiro, segundo] na orientação real da pedra (esq/dir ou cima/baixo). */
function valuesFor(cand, innerValue, outerValue, orientation) {
  if (innerValue === outerValue) return [innerValue, outerValue];
  if (orientation === 'horizontal') {
    return cand.inner.x < cand.outer.x ? [innerValue, outerValue] : [outerValue, innerValue];
  }
  return cand.inner.y < cand.outer.y ? [innerValue, outerValue] : [outerValue, innerValue];
}

function rootGeometry(root, cols, rows, previewDouble) {
  const double = root ? root.a === root.b : previewDouble;
  const cx = cols / 2;
  const laneY = rows - 1;
  const rect = double
    ? { x: cx - 0.5, y: laneY - 1, w: 1, h: 2 }
    : { x: cx - 1, y: laneY - 0.5, w: 2, h: 1 };
  return { rect, double, laneY, left: rect.x, right: rect.x + rect.w };
}

/**
 * Calcula a mesa inteira.
 *
 * Retorna (tudo em unidades):
 *   tiles: [{ id, x, y, w, h, lineAxis, orientation, values, isDouble, branch, isOpenEnd }]
 *   slots: { root } com a mesa vazia, ou { left, right }:
 *          { x, y, w, h, lineAxis, orientation, isDouble, badge: {x, y} | null, value }
 *   policies: { left, right } — 'spiral' ou 'hook'
 *   world: { cols, rows }
 *
 * `previewDouble`: a vaga mostra o espaço de uma bucha (pedra selecionada é bucha).
 */
export function computeBoardLayout(board, cols = WORLD_COLS, rows = 13, { previewDouble = false } = {}) {
  const geo = rootGeometry(board.root, cols, rows, previewDouble);

  if (!board.root) {
    return {
      tiles: [],
      slots: {
        root: {
          ...geo.rect,
          lineAxis: 'horizontal',
          orientation: tileOrientationOnBoard(previewDouble, 'horizontal'),
          isDouble: previewDouble,
          badge: null,
          value: null,
        },
      },
      policies: {},
      world: { cols, rows },
    };
  }

  const ends = getOpenEnds(board);
  const tiles = [
    {
      id: board.root.id,
      ...geo.rect,
      lineAxis: 'horizontal',
      orientation: tileOrientationOnBoard(geo.double, 'horizontal'),
      values: [board.root.left, board.root.right],
      isDouble: geo.double,
      branch: 'root',
      isOpenEnd: board.left.length === 0 || board.right.length === 0,
    },
  ];
  const slots = {};
  const policies = {};
  const bottom = geo.laneY + 0.5;
  const rootHalf = geo.double ? 1 : 0.5;

  const branches = [
    {
      branch: 'left',
      start: { p: { x: geo.left, y: geo.laneY }, d: 'W', prevHalf: rootHalf, turns: 0 },
      bounds: { x0: 0, x1: geo.left, y0: 0, y1: bottom },
    },
    {
      branch: 'right',
      start: { p: { x: geo.right, y: geo.laneY }, d: 'E', prevHalf: rootHalf, turns: 0 },
      bounds: { x0: geo.right, x1: cols, y0: 0, y1: bottom },
    },
  ];

  for (const { branch, start, bounds } of branches) {
    const ctxBase = { branch, bounds, placed: [geo.rect], rootRect: geo.rect };
    const result =
      layoutBranch(board[branch], start, ctxBase, 'spiral') ??
      layoutBranch(board[branch], start, ctxBase, 'hook') ??
      layoutBranch(board[branch], start, ctxBase, 'hook', true);
    policies[branch] = result.policy;

    result.placements.forEach(({ tile, cand, double }, i) => {
      const orientation = tileOrientationOnBoard(double, cand.lineAxis);
      tiles.push({
        id: tile.id,
        ...cand.rect,
        lineAxis: cand.lineAxis,
        orientation,
        values: valuesFor(cand, tile.inner, tile.outer, orientation),
        isDouble: double,
        branch,
        isOpenEnd: i === result.placements.length - 1,
      });
    });

    const preview = previewDouble ? result.previews.double : result.previews.normal;
    // badge no centro do quadrado onde a próxima pedra encosta: dentro da vaga,
    // sem cobrir os pips da pedra da ponta
    const anchor = result.previews.normal.inner;
    slots[branch] = {
      ...preview.rect,
      lineAxis: preview.lineAxis,
      orientation: tileOrientationOnBoard(previewDouble, preview.lineAxis),
      isDouble: previewDouble,
      badge: { x: anchor.x, y: anchor.y },
      value: ends[branch],
    };
  }

  return { tiles, slots, policies, world: { cols, rows } };
}

function boundsOf(rects, pad) {
  if (!rects.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Câmera: escala e deslocamento (px) para enquadrar a ação no viewport.
 * Zoom máximo = BASE_UNIT_PX; se tudo só caberia muito pequeno, enquadra as
 * pontas abertas e as vagas, que é onde o jogo acontece.
 */
export function computeCamera(layout, viewport, { basePx = BASE_UNIT_PX, minPx = MIN_UNIT_PX, padding = 0.6, anchorY = 0.55 } = {}) {
  const { width, height } = viewport;
  const slotRects = Object.values(layout.slots);
  let box = boundsOf([...layout.tiles, ...slotRects], padding);
  if (!box || !width || !height) return { unitPx: basePx, scale: 1, x: 0, y: 0, focus: 'all' };

  let unitPx = Math.min(basePx, width / box.w, height / box.h);
  let focus = 'all';
  if (unitPx < minPx) {
    // não cabe tudo num tamanho confortável: enquadra só as pontas abertas e as
    // vagas, afastando o quanto for preciso para as DUAS pontas ficarem visíveis
    const endsBox = boundsOf([...layout.tiles.filter((t) => t.isOpenEnd), ...slotRects], padding);
    const endsPx = endsBox ? Math.min(basePx, width / endsBox.w, height / endsBox.h) : 0;
    if (endsPx > unitPx) {
      box = endsBox;
      unitPx = Math.max(FLOOR_UNIT_PX, endsPx);
      focus = 'ends';
    }
  }

  const fit = (size, start, span, anchor) => {
    const centered = size * anchor - (start + span / 2) * unitPx;
    const lo = size - (start + span) * unitPx;
    const hi = -start * unitPx;
    // se cabe, mantém tudo dentro; se não cabe, centraliza
    return lo <= hi ? clamp(centered, lo, hi) : size / 2 - (start + span / 2) * unitPx;
  };

  return {
    unitPx,
    scale: unitPx / basePx,
    x: fit(width, box.x, box.w, 0.5),
    y: fit(height, box.y, box.h, anchorY),
    focus,
  };
}
