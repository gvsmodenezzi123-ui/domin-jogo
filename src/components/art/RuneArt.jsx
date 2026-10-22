// src/components/art/RuneArt.jsx
// Patch 0.8.2: o círculo de runas da entrada do Dono da Noite. Traço reto e cantos duros
// (crispEdges), no mesmo giz rubro da mesa dele. Os anéis e o triângulo têm pathLength=1
// para o CSS "desenhar" cada traço (stroke-dashoffset 1 → 0); cada runa acende no seu
// tempo (--i); os olhos dourados ficam no meio, fechados até a cena abrir eles.

/** As 8 runas inventadas da casa (caixa 20x20, traço). */
const GLYPHS = [
  'M4 17 L10 3 L16 17 M7 11 L13 11',
  'M10 2 L10 18 M4 6 L16 14 M16 6 L4 14',
  'M4 4 L16 4 L4 16 L16 16',
  'M7 2 L7 18 M7 3 L15 8 M7 9 L15 14',
  'M5 2 L5 18 M5 10 L16 3 M5 10 L16 17',
  'M3 10 L10 3 L17 10 L10 17 Z M10 7 L10 13',
  'M5 3 L15 17 M15 3 L5 17 M3 10 L17 10',
  'M10 3 L10 17 M5 8 L10 3 L15 8 M6 17 L14 17',
];

/** Uma runa solta (as que sobem pelo escuro como brasa). */
export function RuneGlyph({ index = 0, className = '' }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true" style={{ shapeRendering: 'crispEdges' }}>
      <path d={GLYPHS[index % GLYPHS.length]} />
    </svg>
  );
}

const CENTER = 100;
const GLYPH_RING = 84;

/**
 * Olho em pixel, centrado em (x, 100), 1 unidade por pixel: a pálpebra de cima cai em direção
 * ao nariz (olhar bravo) e a pupila é uma fenda. `flip` espelha (olho direito).
 */
function Eye({ x, flip = false }) {
  const rows = [
    [-7, -2],
    [-8, 3],
    [-8, 7],
    [-7, 8],
    [-5, 7],
  ];
  const span = ([a, b]) => (flip ? [-b, -a] : [a, b]);
  return (
    <g className="rc-eye" style={{ transformOrigin: `${x}px ${CENTER}px` }}>
      {rows.map((row, i) => {
        const [a, b] = span(row);
        return <rect key={i} x={x + a} y={CENTER - 5 + i * 2} width={b - a} height="2" fill="#ffd24a" />;
      })}
      <rect x={x - 1} y={CENTER - 3} width="2" height="8" fill="#1a0306" />
      <rect x={x + (flip ? 2 : -4)} y={CENTER - 1} width="2" height="2" fill="#fff6c8" />
    </g>
  );
}

/** O círculo inteiro: dois anéis, o pontilhado, o triângulo invertido, 8 runas e os olhos. */
export function RuneCircle({ className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true" style={{ shapeRendering: 'crispEdges' }}>
      <g className="rc-spin">
        <circle className="rc-line" cx={CENTER} cy={CENTER} r="96" pathLength="1" strokeWidth="3" />
        <circle className="rc-line rc-late" cx={CENTER} cy={CENTER} r="72" pathLength="1" strokeWidth="2" />
        <circle className="rc-dots" cx={CENTER} cy={CENTER} r="64" strokeWidth="2" strokeDasharray="2 7" />
        <path className="rc-line rc-later" d="M37.65 64 L162.35 64 L100 172 Z" pathLength="1" strokeWidth="2" strokeLinejoin="miter" />
        <circle className="rc-line rc-latest" cx={CENTER} cy={CENTER} r="36" pathLength="1" strokeWidth="2" />
        {GLYPHS.map((d, i) => {
          const angle = (i / GLYPHS.length) * Math.PI * 2 - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * GLYPH_RING - 8;
          const y = CENTER + Math.sin(angle) * GLYPH_RING - 8;
          return (
            <g key={d} className="rc-glyph" style={{ '--i': i }} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(0.8)`}>
              <path d={d} strokeWidth="2.5" strokeLinecap="square" />
            </g>
          );
        })}
      </g>
      {/* olhos em 1,6x, cabendo no círculo de dentro (o inscrito no triângulo) */}
      <g className="rc-eyes" transform={`translate(${CENTER} ${CENTER}) scale(1.6) translate(${-CENTER} ${-CENTER})`}>
        <Eye x={CENTER - 12} />
        <Eye x={CENTER + 12} flip />
      </g>
    </svg>
  );
}
