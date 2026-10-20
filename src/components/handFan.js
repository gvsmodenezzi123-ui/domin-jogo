/**
 * Leque da mão: cada pedra recebe posição x, inclinação e descida em arco.
 * Com 7 pedras: 0°, ±8°, ±14°, ±20° (centro reto, pontas mais inclinadas e baixas).
 * O espaçamento já conta com a inclinação, para nenhuma ponta sair da tela;
 * mãos grandes encolhem as pedras e aproximam umas das outras.
 */
export function computeFan(count, width) {
  if (!count || !width) return { unit: 44, spots: [] };
  const unit = count <= 7 ? 44 : Math.max(32, Math.round(44 - (count - 7) * 1.5));
  const center = (count - 1) / 2;
  const maxK = Math.max(1, center);
  const maxAngle = count <= 7 ? 20 : Math.min(26, 20 + (maxK - 3) * 1.5);
  const maxDrop = 20;
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
