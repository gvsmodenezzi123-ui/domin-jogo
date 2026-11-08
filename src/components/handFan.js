/**
 * Leque da mão: cada pedra recebe posição x, inclinação e descida em arco.
 * Com 7 pedras: 0°, ±8°, ±14°, ±20° (centro reto, pontas mais inclinadas e baixas).
 * O espaçamento já conta com a inclinação, para nenhuma ponta sair da tela;
 * mãos grandes encolhem as pedras e aproximam umas das outras.
 */
export function computeFan(count, width, { baseUnit = 44, minUnit = 32, angle = 20, drop = 20 } = {}) {
  if (!count || !width) return { unit: baseUnit, spots: [] };
  const shrink = baseUnit / 44;
  const unit = count <= 7 ? baseUnit : Math.max(minUnit, Math.round(baseUnit - (count - 7) * 1.5 * shrink));
  const center = (count - 1) / 2;
  const maxK = Math.max(1, center);
  const maxAngle = count <= 7 ? angle : Math.min(angle + 6, angle + (maxK - 3) * 1.5);
  const maxDrop = drop;
  const rad = (maxAngle * Math.PI) / 180;
  // canto de cima da pedra mais inclinada (gira em torno da base): até onde vai no x
  const reach = (unit / 2) * Math.cos(rad) + unit * 2 * Math.sin(rad);
  const room = width / 2 - 4 - reach;
  const spacing = count > 1 ? Math.max(8, Math.min(unit + 6, room / maxK)) : 0;
  const spots = Array.from({ length: count }, (_, i) => {
    const k = i - center;
    const t = Math.abs(k) / maxK;
    return {
      x: k * spacing,
      angle: k === 0 ? 0 : Math.sign(k) * (2 + (maxAngle - 2) * t),
      drop: maxDrop * t * t,
    };
  });
  return { unit, spots };
}

/** Versão 1.5: intervalo da cascata da mão (ms entre uma pedra e a seguinte). */
export const DEAL_STEP_MS = 60;
/** Versão 2.0: quanto a pedra leva do dorme até assentar no leque (o estalo sai aí). */
export const DEAL_LAND_MS = 520;

/**
 * Versão 2.12.1: a mão na ordem em que o jogador arrumou (arrastando no leque). `pref` são os
 * ids na ordem da tela; as pedras que chegaram depois (compradas) entram no fim, na ordem do
 * jogo. Sem arrumação, é a ordem do jogo mesmo.
 */
export function arrangeHand(hand, pref) {
  if (!pref?.length) return hand;
  const byId = new Map(hand.map((t) => [t.id, t]));
  const out = [];
  for (const id of pref) {
    const tile = byId.get(id);
    if (tile) {
      out.push(tile);
      byId.delete(id);
    }
  }
  for (const tile of hand) if (byId.has(tile.id)) out.push(tile);
  return out;
}

/** Em que vaga do leque a pedra arrastada cai (a vaga mais perto do x dela). */
export function dropIndex(xs, x) {
  let best = 0;
  for (let i = 1; i < xs.length; i += 1) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
  return best;
}

/** Quanto a pedra `i` se afasta da pedra em foco `focus` (as vizinhas abrem espaço). */
export function spreadOffset(i, focus, unit, amount = 0.26) {
  const d = i - focus;
  if (d === 0) return 0;
  const k = Math.max(0, 1 - (Math.abs(d) - 1) * 0.45);
  return Math.sign(d) * Math.round(unit * amount * k);
}
