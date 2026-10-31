import { memo } from 'react';
import { LETTERS, WIDTH, WORD_D } from './logoShape.js';

/** Passos da extrusão 3D. */
const DEPTH = 6;

/**
 * Logo BUXARIA em SVG vetorial (Patch 0.5.5).
 *
 * As letras são polígonos numa grade de 7x10 unidades com os cantos lapidados
 * (chanfro de 45°), no espírito arcade/neo-brutalista. Camadas, de trás para a frente:
 *   1. sombra sólida deslocada;
 *   2. extrusão 3D em seis passos, cor de sangue seco, cada um com o contorno preto;
 *   3. face em osso (degradê por letra) com contorno preto fino;
 *   4. chanfro duplo por dentro da borda: filete de osso claro + faixa de metal;
 *   5. rachaduras e desgaste;
 *   6. o feixe especular (o mesmo reflexo do .shimmer-active) cruzando a cada ~6 s.
 */

/** Rachaduras e lascas, à mão, em cima das letras (o recorte deixa só o que cai na face). */
const CRACKS = [
  'M1.1 1.2L1.9 2.4L1.5 3.4',
  'M6.3 6.4L5.6 7.2',
  'M9.7 3.6L10.3 5.6L9.9 7.4',
  'M18.9 7.6L19.9 8.7L19.6 9.6',
  'M26.4 7.8L27.2 8.7L26.8 9.7',
  'M30.9 1.1L31.6 1.8',
  'M39.3 6.9L40 8.4',
  'M45.1 2.9L45.6 4.8L45.2 6.3',
  'M54.6 1.2L55.4 2.5L55.1 3.2',
];
const CHIPS = [
  [3.4, 0.2, 0.6],
  [12.2, 9.4, 0.5],
  [23.4, 0.3, 0.5],
  [35.2, 9.4, 0.6],
  [47.6, 0.4, 0.5],
];

/** Versão 1.5: a pele de madeira da tela inicial (face em tábua com veio, extrusão em madeira escura). */
const SKINS = {
  bone: { face: ['#fff7e0', '#f1dfac', '#dcc07e', '#a77d3b'], edge: ['#fffdf2', '#c9a764'], ext: ['#9a3220', '#3a0d07'], back: '#2a0805', metal: ['#f3efe2', '#9d968a', '#3f372c'] },
  wood: { face: ['#f2b46a', '#c9803e', '#a8622a', '#6e3a14'], edge: ['#ffe0a8', '#b8743a'], ext: ['#5a3214', '#1e0e05'], back: '#140903', metal: ['#ffd9a0', '#8a5a2a', '#3a1e0a'] },
};

/** Veio da madeira atravessando as letras (só na pele de madeira). */
const GRAIN = [
  'M-1 1.6C8 1.2 16 2.2 24 1.7S44 1.1 62 1.9',
  'M-1 3.4C10 3.9 20 3.1 30 3.6S50 4.1 62 3.3',
  'M-1 5.3C6 5 14 5.8 26 5.4S46 4.9 62 5.6',
  'M-1 7.2C12 7.6 22 6.9 34 7.3S52 7.8 62 7.1',
  'M-1 8.9C9 8.6 19 9.3 29 9S49 8.7 62 9.2',
];

function BuxariaLogo({ className = '', onClick, skin = 'bone' }) {
  const pal = SKINS[skin] ?? SKINS.bone;
  const id = (n) => `bx-${skin}-${n}`;
  return (
    <svg
      viewBox={`-1.6 -1.6 ${WIDTH + 4.6} 15`}
      className={`buxaria-logo ${className}`}
      role="img"
      aria-label="Buxaria"
      onClick={onClick}
    >
      <defs>
        <linearGradient id={id('face')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.face[0]} />
          <stop offset="0.46" stopColor={pal.face[1]} />
          <stop offset="0.54" stopColor={pal.face[2]} />
          <stop offset="1" stopColor={pal.face[3]} />
        </linearGradient>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.metal[0]} />
          <stop offset="0.5" stopColor={pal.metal[1]} />
          <stop offset="1" stopColor={pal.metal[2]} />
        </linearGradient>
        <linearGradient id={id('edge')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.edge[0]} />
          <stop offset="1" stopColor={pal.edge[1]} />
        </linearGradient>
        <linearGradient id={id('ext')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={pal.ext[0]} />
          <stop offset="1" stopColor={pal.ext[1]} />
        </linearGradient>
        <linearGradient id={id('sweep')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('clip')}>
          <path d={WORD_D} fillRule="evenodd" />
        </clipPath>
      </defs>

      {/* 1. sombra sólida */}
      <path d={WORD_D} fillRule="evenodd" fill="#000" opacity="0.55" transform="translate(2.3 2.7)" />

      {/* 2. extrusão: do fundo para a frente; só a camada do fundo leva contorno (senão vira listra) */}
      {Array.from({ length: DEPTH }, (_, i) => DEPTH - i).map((k) => (
        <path
          key={k}
          d={WORD_D}
          fillRule="evenodd"
          fill={k === DEPTH ? pal.back : `url(#${id('ext')})`}
          stroke={k === DEPTH ? '#0b0705' : 'none'}
          strokeWidth="0.62"
          strokeLinejoin="miter"
          paintOrder="stroke"
          transform={`translate(${(k * 0.27).toFixed(2)} ${(k * 0.34).toFixed(2)})`}
        />
      ))}

      {/* 3. face de osso, uma letra por vez (o degradê acompanha cada letra) */}
      {LETTERS.map((l) => (
        <path key={l.key} d={l.d} fillRule="evenodd" fill={`url(#${id('face')})`} stroke="#0b0705" strokeWidth="0.62" strokeLinejoin="miter" paintOrder="stroke" />
      ))}

      {/* 4. chanfro duplo: faixa de metal e, na borda, o filete de osso claro */}
      <g clipPath={`url(#${id('clip')})`} fill="none" strokeLinejoin="miter">
        {LETTERS.map((l) => (
          <path key={`m${l.key}`} d={l.d} stroke={`url(#${id('metal')})`} strokeWidth="0.72" />
        ))}
        {LETTERS.map((l) => (
          <path key={`e${l.key}`} d={l.d} stroke={`url(#${id('edge')})`} strokeWidth="0.26" />
        ))}

        {skin === 'wood' && (
          <g stroke="#5a2e0e" strokeOpacity="0.55" strokeWidth="0.16">
            {GRAIN.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        )}

        {/* 5. desgaste */}
        <g stroke="#4a2e14" strokeOpacity="0.6" strokeWidth="0.14">
          {CRACKS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {CHIPS.map(([x, y, r]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={r} height={r * 0.7} fill="#3a230e" opacity="0.55" />
        ))}

        {/* 6. feixe especular cruzando o logo */}
        <g transform="skewX(-22)">
          <rect className="buxaria-sweep" x="-10" y="-2" width="5" height="16" fill={`url(#${id('sweep')})`} />
        </g>
      </g>
    </svg>
  );
}

export default memo(BuxariaLogo);
