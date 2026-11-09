/**
 * Versão 2.14: a planta dos dois armarinhos da mesa deitada, em px de CSS (a pintura é 1:1). A
 * mesma conta dá os buracos que a pintura entalha (art/cabinetPixels.js) e as caixas onde o HTML
 * assenta por cima (talismãs, corações, dinheiro, lousa e teclas).
 *
 *   esquerda: os nichos dos talismãs (até 3 por fileira), o sulco de veludo da vida (5 corações
 *             por fileira) e, embaixo, a tecla-nicho do MENU e a plaquinha de latão do dinheiro
 *   direita:  a lousa do dorme e das pontas e as teclas-nicho de COMPRAR e PASSAR
 *
 * Os dois têm a mesma largura e ficam um de cada lado da mesa, como um par; o da esquerda é baixo
 * e não cresce com a 5ª e a 6ª vaga de talismã.
 */
export const CAB_W = 112;
const TOP = 12; // a cornija (8) e o respiro
const BOTTOM = 12; // o respiro e o rodapé (8)
const GAP = 5;
const IN_X = 10;
const IN_W = 92;
const KEY_H = 32;
const PLATE_H = 20;
const NICHE = { w: 28, h: 26, gap: 4 };
const ROW_H = 28;
const MENU_W = 32;
const HEART = 16;
const HEARTS_PER_ROW = 5;
const SLATE_H = 101;

/**
 * O armarinho da esquerda (o seu), baixinho: os nichos dos talismãs em cima (até 3 por fileira:
 * 4 vagas ficam 2 + 2, 5 ficam 3 + 2 e 6 ficam 3 + 3, sempre em 2 fileiras, cada uma centrada),
 * a vida no sulco de veludo e, embaixo, a tecla-nicho do MENU ao lado da plaquinha do dinheiro.
 */
export function leftCabinet({ slots = 4, hearts = 5, coins = true } = {}) {
  const holes = [];
  const boxes = {};
  let y = TOP;
  if (slots > 0) {
    const cols = slots <= 4 ? Math.min(2, slots) : 3;
    const rows = Math.ceil(slots / cols);
    const rowW = cols * NICHE.w + (cols - 1) * NICHE.gap;
    boxes.niches = { x: IN_X + (IN_W - rowW) / 2, y, w: rowW, h: rows * NICHE.h + (rows - 1) * NICHE.gap, size: NICHE.w, cols };
    for (let r = 0; r < rows; r += 1) {
      const n = Math.min(cols, slots - r * cols);
      const x0 = IN_X + (IN_W - (n * NICHE.w + (n - 1) * NICHE.gap)) / 2;
      for (let i = 0; i < n; i += 1) holes.push({ kind: 'niche', x: x0 + i * (NICHE.w + NICHE.gap), y: y + r * (NICHE.h + NICHE.gap), w: NICHE.w, h: NICHE.h });
    }
    y += boxes.niches.h + GAP + 1;
  }
  const heartRows = Math.max(1, Math.ceil(hearts / HEARTS_PER_ROW));
  const vh = 10 + heartRows * HEART + (heartRows - 1) * 2;
  boxes.hearts = { x: IN_X, y, w: IN_W, h: vh, rows: heartRows, size: HEART };
  holes.push({ kind: 'velvet', ...boxes.hearts });
  y += vh + GAP;
  // a última fileira: o MENU (só o ícone) e, ao lado, o dinheiro na plaquinha de latão
  const menuW = coins ? MENU_W : IN_W;
  boxes.menu = { x: IN_X, y, w: menuW, h: ROW_H };
  holes.push({ kind: 'key', ...boxes.menu });
  if (coins) {
    boxes.coins = { x: IN_X + menuW + 4, y: y + (ROW_H - PLATE_H) / 2, w: IN_W - menuW - 4, h: PLATE_H };
    holes.push({ kind: 'brass', ...boxes.coins });
  }
  y += ROW_H + BOTTOM;
  return { w: CAB_W, h: y, holes, boxes };
}

/** O armarinho da direita (a mesa): a lousa (quando tem dorme) e as duas teclas. */
export function rightCabinet({ dorme = true } = {}) {
  const holes = [];
  const boxes = {};
  let y = TOP;
  if (dorme) {
    boxes.slate = { x: IN_X, y, w: IN_W, h: SLATE_H, split: SLATE_H - 24 };
    holes.push({ kind: 'slate', ...boxes.slate });
    y += SLATE_H + GAP;
  }
  boxes.draw = { x: IN_X, y, w: IN_W, h: KEY_H };
  holes.push({ kind: 'key', ...boxes.draw });
  y += KEY_H + GAP;
  boxes.pass = { x: IN_X, y, w: IN_W, h: KEY_H };
  holes.push({ kind: 'key', ...boxes.pass });
  y += KEY_H + BOTTOM;
  return { w: CAB_W, h: y, holes, boxes };
}

/** Uma caixa da planta como estilo (px de CSS), encolhida `inset` de cada lado. */
export const cabBox = (b, inset = 0) => ({ left: b.x + inset, top: b.y + inset, width: b.w - inset * 2, height: b.h - inset * 2 });
