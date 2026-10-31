/**
 * Trilha da mesa em "U" + câmera dinâmica (sem zoom manual).
 *
 * Unidade: o lado curto de uma pedra (1). Pedra comum = 2 x 1. Bucha = 1 x 2
 * ATRAVESSADA em relação à linha (em pé quando a linha corre na horizontal,
 * deitada quando a linha sobe), centrada no encaixe.
 *
 * O "mundo" é o feltro: WORLD_COLS unidades de largura e altura fixa durante a
 * rodada. A primeira pedra fica no centro da linha de baixo. Cada ponta segue
 * a serpentina da sua metade, sempre dentro do feltro:
 *
 *   1. base: do centro para a borda;
 *   2. lateral: sobe pela margem, no máximo 3 pedras (Versão 1.5: MAX_VERTICAL_CHAIN);
 *   3. dobra 90° para DENTRO, em direção ao centro;
 *   4. se ainda precisar: sobe em zigue-zague, deitando a cada 3 pedras (a serpente).
 *
 * Posições estáticas: as pedras são posicionadas NA ORDEM EM QUE FORAM JOGADAS
 * (`seq`). Cada pedra nova só olha para as que já estão na mesa, então nunca
 * move, gira ou deforma uma pedra antiga: não existe "teletransporte".
 * Corrente longa que lotou a sua metade continua pelo espaço livre do resto
 * do feltro.
 *
 * Em cada pedra a tartaruga tenta: seguir reto, virar a esquina (a pedra
 * ocupa o quadrado logo após a ponta) ou virar "apertado" (a pedra encosta de
 * lado na última metade).
 */

import { getOpenEnds } from './dominoLogic.js';

export const WORLD_COLS = 10;
/** Versão 1.5: o mundo tem pelo menos 16 linhas: com o braço baixo, a espiral precisa do alto
 *  livre para correntes compridas (a câmera enquadra só as pedras, então não encolhe nada). */
export const MIN_WORLD_ROWS = 16;
export const MAX_WORLD_ROWS = 18;
/** px por unidade com zoom máximo (pedra comum 96 x 48 px). */
export const BASE_UNIT_PX = 48;
/** Abaixo disso a câmera prefere enquadrar só as pontas abertas (Versão 1.5: 22, a mesa lotada fica inteira). */
export const MIN_UNIT_PX = 22;
/** Zoom mínimo absoluto. Os badges têm tamanho fixo na tela. */
export const FLOOR_UNIT_PX = 12;
/** Folga mínima entre pedras que não se encaixam (voltas da serpentina). */
const GAP = 0.5;
/** Quantas pedras à frente a tartaruga confere antes de entrar num corredor. */
const LOOKAHEAD = 2;
/**
 * Versão 1.5: no máximo 3 pedras seguidas subindo; a 4ª deita. O U fica baixo e largo, longe do
 * balão do rival, do dorme e do leque, e a corrente comprida sobe em zigue-zague (serpente).
 */
export const MAX_VERTICAL_CHAIN = 3;
const EPS = 1e-6;

const DIR = {
  W: { x: -1, y: 0 },
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
};

/** Curvas da serpentina: esquerda gira no sentido horário, direita no anti-horário. */
const TURNS = {
  left: { W: 'N', N: 'E', E: 'S', S: 'W' },
  right: { E: 'N', N: 'W', W: 'S', S: 'E' },
};
/** Curva no sentido contrário: só para sair de um beco sem soltar a corrente. */
const COUNTER_TURNS = {
  left: { W: 'S', S: 'E', E: 'N', N: 'W' },
  right: { E: 'S', S: 'W', W: 'N', N: 'E' },
};

/**
 * Níveis de tolerância, do preferido ao último recurso:
 *  - metade própria, com folga entre voltas;
 *  - metade própria, pode encostar;
 *  - feltro inteiro (corrente longa usa o espaço livre), com folga;
 *  - feltro inteiro, pode encostar.
 */
const LEVELS = [
  { area: 'half', gap: true, look: true },
  { area: 'half', gap: false, look: true },
  { area: 'world', gap: true, look: true },
  { area: 'world', gap: false, look: false },
];

/** A serpente só vale dentro da metade do ramo; fora dela, a regra antiga decide. */
const HALF_LEVELS = LEVELS.filter((level) => level.area === 'half');

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

/** Faixa de meia unidade logo após `p` na direção `d` (só o eixo de `d`). */
function halfAlong(p, d) {
  const r = rectFrom(p, d, 0.5, 1);
  return axisOf(d) === 'horizontal' ? { x: r.x, w: r.w } : { y: r.y, h: r.h };
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

/** Altura do mundo para um feltro (a largura é sempre WORLD_COLS). Congele por rodada. */
export function computeWorldSize(width, height, cols = WORLD_COLS) {
  if (!width || !height) return { cols, rows: 12 };
  const rows = Math.floor(height / (width / cols));
  return { cols, rows: Math.max(MIN_WORLD_ROWS, Math.min(MAX_WORLD_ROWS, rows)) };
}

/**
 * Posições candidatas da próxima pedra a partir de um cursor
 * { p: ponto de encaixe, d: direção, prevHalf: meia-largura da pedra anterior }.
 * `core` é a faixa da linha (largura 1) usada para os limites: a parte da
 * bucha que sobra para fora da faixa pode passar meia unidade da borda.
 */
function candidates(cursor, double, turnMap) {
  const { p, d, prevHalf } = cursor;
  const d2 = turnMap[d];
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
      next: { p: add(p, d, 1), d, prevHalf: 1 },
    });
  } else {
    list.push({
      rect: rectFrom(p, d, 2, 1),
      core: rectFrom(p, d, 2, 1),
      lineAxis: axisOf(d),
      inner: add(p, d, 0.5),
      outer: add(p, d, 1.5),
      next: { p: add(p, d, 2), d, prevHalf: 0.5 },
    });
  }

  // 2) esquina: o quadrado logo após a ponta vira o canto
  const c = add(p, d, 0.5);
  if (double) {
    list.push({
      rect: rectAround(c, d, 1, 2),
      // bucha de quina pode passar meia unidade da borda: fica em pé no fim da
      // linha em vez de deitar por cima da anterior
      core: { ...rectFrom(add(c, d2, -0.5), d2, 1.5, 1), ...halfAlong(p, d) },
      lineAxis: axisOf(d),
      inner: c,
      outer: c,
      next: { p: add(c, d2, 1), d: d2, prevHalf: 0.5 },
    });
  } else {
    list.push({
      rect: rectFrom(add(c, d2, -0.5), d2, 2, 1),
      core: rectFrom(add(c, d2, -0.5), d2, 2, 1),
      lineAxis: axisOf(d2),
      inner: c,
      outer: add(c, d2, 1),
      next: { p: add(c, d2, 1.5), d: d2, prevHalf: 0.5 },
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
      next: { p: add(center, d2, 0.5), d: d2, prevHalf: 1 },
    });
  } else {
    const inner = add(base, d2, prevHalf + 0.5);
    list.push({
      rect: rectFrom(add(inner, d2, -0.5), d2, 2, 1),
      core: rectFrom(add(inner, d2, -0.5), d2, 2, 1),
      lineAxis: axisOf(d2),
      inner,
      outer: add(inner, d2, 1),
      next: { p: add(inner, d2, 1.5), d: d2, prevHalf: 0.5 },
    });
  }
  // 4) bucha em corredor apertado: atravessada e encostada na ponta, deslocada
  //    meia unidade para o lado livre (só quando a centrada não cabe)
  if (double) {
    const side = axisOf(d) === 'horizontal' ? ['N', 'S'] : ['W', 'E'];
    for (const shift of side) {
      const c4 = add(add(p, d, 0.5), shift, 0.5);
      list.push({
        rect: rectAround(c4, d, 1, 2),
        core: rectAround(c4, d, 1, 1),
        lineAxis: axisOf(d),
        inner: c4,
        outer: c4,
        next: { p: add(p, d, 1), d, prevHalf: 1 },
      });
    }
  }
  return list;
}

function insideBounds(r, b) {
  return r.x >= b.x0 - EPS && r.x + r.w <= b.x1 + EPS && r.y >= b.y0 - EPS && r.y + r.h <= b.y1 + EPS;
}

function isValid(cand, ctx, level) {
  const bounds = level.area === 'half' ? ctx.half : ctx.world;
  if (!insideBounds(cand.core, bounds)) return false;
  for (const other of ctx.placed) {
    if (rectsOverlap(cand.rect, other)) return false;
    if (level.gap && other !== ctx.prev && rectGap(cand.rect, other) < GAP - EPS) return false;
  }
  return true;
}

/** Depois de `cand`, ainda cabem `depth` pedras comuns? (evita becos) */
function hasWayOut(cand, ctx, level, depth) {
  if (depth === 0) return true;
  const after = { ...ctx, placed: [...ctx.placed, cand.rect], prev: cand.rect };
  const relaxed = { ...level, gap: false };
  return candidates(cand.next, false, ctx.turnMap).some(
    (next) => isValid(next, after, relaxed) && hasWayOut(next, after, level, depth - 1),
  );
}

/**
 * Último recurso (correntes enormes, ~1% das rodadas): o espaço livre do feltro
 * mais perto da ponta. A corrente segue a partir dessa pedra.
 */
function emergencyPlacement(cursor, double, ctx) {
  const fallback = candidates(cursor, double, ctx.turnMap)[0];
  const { x0, x1, y0, y1 } = ctx.world;
  let best = null;
  for (let y = y0; y <= y1 - 1 + EPS; y += 0.5) {
    for (let x = x0; x <= x1 - 1 + EPS; x += 0.5) {
      for (const wide of [true, false]) {
        const rect = { x, y, w: wide ? 2 : 1, h: wide ? 1 : 2 };
        if (rect.x + rect.w > x1 + EPS || rect.y + rect.h > y1 + EPS) continue;
        if (ctx.placed.some((o) => rectsOverlap(rect, o))) continue;
        const center = { x: x + rect.w / 2, y: y + rect.h / 2 };
        const dist = Math.hypot(center.x - cursor.p.x, center.y - cursor.p.y);
        if (!best || dist < best.dist) best = { rect, center, wide, dist };
      }
    }
  }
  if (!best) return { ...fallback, detached: true };
  // pedra comum segue o comprimento do espaço; bucha fica atravessada nele
  const lineAxis = best.wide !== double ? 'horizontal' : 'vertical';
  const d =
    lineAxis === 'horizontal'
      ? best.center.x >= cursor.p.x ? 'E' : 'W'
      : best.center.y >= cursor.p.y ? 'S' : 'N';
  const { center } = best;
  return {
    rect: best.rect,
    core: best.rect,
    lineAxis,
    inner: double ? center : add(center, d, -0.5),
    outer: double ? center : add(center, d, 0.5),
    next: { p: add(center, d, double ? 0.5 : 1), d, prevHalf: double ? 1 : 0.5 },
    detached: true,
  };
}

/** O primeiro candidato bom da lista, nível por nível (ou null). */
function pickFrom(list, ctx, levels) {
  for (const level of levels) {
    const valid = list.filter((cand) => isValid(cand, ctx, level));
    if (!valid.length) continue;
    if (!level.look) return valid[0];
    const safe = valid.find((cand) => hasWayOut(cand, ctx, level, LOOKAHEAD));
    if (safe) return safe;
  }
  return null;
}

/**
 * Versão 1.5, a serpente: nenhuma subida passa de 3 pedras; na 4ª a corrente deita (para
 * dentro ou para fora, para onde houver espaço). Correndo deitada, a dobra que SOBE vem antes
 * da que desce: a corrente sobe em zigue-zague pela metade dela em vez de fazer coluna alta.
 * Só dentro da metade do ramo; sem espaço ali, vale a regra antiga (choosePlacement segue).
 */
function serpentPlacement(cursor, double, ctx) {
  const both = () => [...candidates(cursor, double, ctx.turnMap), ...candidates(cursor, double, ctx.counterMap).slice(1)];
  if (cursor.d === 'N') {
    if (ctx.vertRun < MAX_VERTICAL_CHAIN) return null;
    return pickFrom(both().filter((cand) => cand.next.d !== 'N' && cand.next.d !== 'S'), ctx, HALF_LEVELS);
  }
  if (cursor.d === 'W' || cursor.d === 'E') {
    const list = both();
    const straight = list.filter((cand) => cand.next.d === cursor.d);
    const up = list.filter((cand) => cand.next.d === 'N');
    return pickFrom([...straight, ...up], ctx, HALF_LEVELS);
  }
  return null;
}

/** Melhor posição para a pedra, do nível mais confortável ao último recurso. */
function choosePlacement(cursor, double, ctx) {
  const serpent = serpentPlacement(cursor, double, ctx);
  if (serpent) return serpent;
  const list = candidates(cursor, double, ctx.turnMap);
  for (const level of LEVELS) {
    const valid = list.filter((cand) => isValid(cand, ctx, level));
    if (!valid.length) continue;
    if (!level.look) return valid[0];
    const safe = valid.find((cand) => hasWayOut(cand, ctx, level, LOOKAHEAD));
    if (safe) return safe;
  }
  // beco: tenta encostar na ponta virando para o outro lado, ainda conectada
  const lastLevel = LEVELS[LEVELS.length - 1];
  const counter = candidates(cursor, double, ctx.counterMap).slice(1);
  const escape = counter.find((cand) => isValid(cand, ctx, lastLevel));
  if (escape) return escape;
  return emergencyPlacement(cursor, double, ctx);
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

/** Ordem de jogada; mesas sem `seq` (montadas à mão) alternam as pontas. */
function playOrder(board) {
  const entries = [];
  for (const branch of ['left', 'right']) {
    board[branch].forEach((tile, index) => {
      entries.push({ tile, branch, index, order: tile.seq ?? index * 2 + (branch === 'left' ? 1 : 2) });
    });
  }
  return entries.sort((a, b) => a.order - b.order || (a.branch === 'left' ? -1 : 1));
}

/**
 * Calcula a mesa inteira.
 *
 * Retorna (tudo em unidades):
 *   tiles: [{ id, x, y, w, h, lineAxis, orientation, values, isDouble, branch, isOpenEnd }]
 *   slots: { root } com a mesa vazia, ou { left, right }:
 *          { x, y, w, h, lineAxis, orientation, isDouble, badge: {x, y} | null, value }
 *   world: { cols, rows }
 *
 * `previewDouble`: a vaga mostra o espaço de uma bucha (pedra selecionada é bucha).
 */
export function computeBoardLayout(board, cols = WORLD_COLS, rows = 12, { previewDouble = false } = {}) {
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
      world: { cols, rows },
    };
  }

  const ends = getOpenEnds(board);
  const bottom = geo.laneY + 0.5;
  const rootHalf = geo.double ? 1 : 0.5;
  const world = { x0: 0, x1: cols, y0: 0, y1: bottom };
  const halves = {
    left: { x0: 0, x1: geo.left, y0: 0, y1: bottom },
    right: { x0: geo.right, x1: cols, y0: 0, y1: bottom },
  };
  const cursors = {
    left: { p: { x: geo.left, y: geo.laneY }, d: 'W', prevHalf: rootHalf, prevRect: geo.rect },
    right: { p: { x: geo.right, y: geo.laneY }, d: 'E', prevHalf: rootHalf, prevRect: geo.rect },
  };

  const rootTile = {
    id: board.root.id,
    ...geo.rect,
    lineAxis: 'horizontal',
    orientation: tileOrientationOnBoard(geo.double, 'horizontal'),
    values: [board.root.left, board.root.right],
    isDouble: geo.double,
    branch: 'root',
    isOpenEnd: board.left.length === 0 || board.right.length === 0,
  };
  const placed = [geo.rect];
  const byBranch = { left: [], right: [] };
  /** Quantas pedras seguidas, do fim do ramo para trás, correm na vertical. */
  const vertRunOf = (branch) => {
    const list = byBranch[branch];
    let n = 0;
    for (let i = list.length - 1; i >= 0 && list[i].lineAxis === 'vertical'; i -= 1) n += 1;
    return n;
  };
  const ctxFor = (branch) => ({
    branch,
    turnMap: TURNS[branch],
    counterMap: COUNTER_TURNS[branch],
    vertRun: vertRunOf(branch),
    half: halves[branch],
    world,
    placed,
    prev: cursors[branch].prevRect,
  });

  for (const { tile, branch, index } of playOrder(board)) {
    const double = tile.inner === tile.outer;
    const cand = choosePlacement(cursors[branch], double, ctxFor(branch));
    const orientation = tileOrientationOnBoard(double, cand.lineAxis);
    byBranch[branch].push({
      id: tile.id,
      ...cand.rect,
      lineAxis: cand.lineAxis,
      orientation,
      values: valuesFor(cand, tile.inner, tile.outer, orientation),
      isDouble: double,
      branch,
      isOpenEnd: index === board[branch].length - 1,
      detached: Boolean(cand.detached),
    });
    placed.push(cand.rect);
    cursors[branch] = { ...cand.next, prevRect: cand.rect };
  }

  const slots = {};
  for (const branch of ['left', 'right']) {
    const ctx = ctxFor(branch);
    const normal = choosePlacement(cursors[branch], false, ctx);
    const preview = previewDouble ? choosePlacement(cursors[branch], true, ctx) : normal;
    slots[branch] = {
      ...preview.rect,
      lineAxis: preview.lineAxis,
      orientation: tileOrientationOnBoard(previewDouble, preview.lineAxis),
      isDouble: previewDouble,
      // badge no centro do quadrado onde a próxima pedra encosta: dentro da vaga
      badge: { x: normal.inner.x, y: normal.inner.y },
      value: ends[branch],
    };
  }

  return { tiles: [rootTile, ...byBranch.left, ...byBranch.right], slots, world: { cols, rows } };
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
 * Zoom máximo = BASE_UNIT_PX; se tudo só caberia pequeno demais, enquadra as
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
