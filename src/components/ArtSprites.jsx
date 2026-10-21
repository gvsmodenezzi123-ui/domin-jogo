// src/components/ArtSprites.jsx
// Toda a arte vetorial do jogo (SVG 40x40, crispEdges), num lugar só:
//   - os 18 rivais da campanha (retratos com 4 humores e boca que fala);
//   - os 15 talismãs (volume 3D, sombra no chão, brilho especular);
//   - os ícones de interface (moeda, coração, som, menu, lâmpada, olho).
// Nenhuma imagem externa: tudo é <rect>/<path> desenhado em código.

/* eslint-disable react-refresh/only-export-components -- este arquivo só re-exporta componentes de arte */
export * from './HighDensitySprites.jsx';
export * from './art/RivalsRegion1.jsx';
export * from './art/RivalsRegion2.jsx';
export * from './art/RivalsRegion3.jsx';
export * from './art/RelicsA.jsx';
export * from './art/RelicsB.jsx';
export * from './art/UiIcons.jsx';
