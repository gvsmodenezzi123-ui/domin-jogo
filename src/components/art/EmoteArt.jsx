/**
 * Versão 2.45: o joinha redesenhado pixel a pixel (os quatro dedos dobrados empilhados na frente
 * do punho, o polegar subindo do lado de fora), a mão espalmada no peito da risada e as formas
 * exportadas (gridOf) para os personagens fazerem os gestos com a própria mão (figGesture.js).
 *
 * Versão 2.41: os emotes da roda são GESTOS do personagem: a mão dele sobe ao lado do rosto, na
 * cor da pele e com o punho da roupa dele, e faz o gesto (o joinha, o joinha para baixo, o dedo do
 * meio, o aceno, as palmas); na risada ele ri. Antes eram carinhas amarelas soltas.
 *
 * Cada mão é pixel art feita por código: os blocos de pele e do punho numa grade, com o contorno
 * escuro em volta, a sombra do lado de baixo e da direita e o brilho em cima, tudo tirado da cor
 * da pele de cada um. Sai como retângulos SVG nítidos.
 */
import { memo } from 'react';

import { EMOTE_H as H, EMOTE_W as W, gridOf } from './emoteShapes.js';

/** Clareia (k > 0) ou escurece (k < 0) uma cor #rrggbb. */
function tone(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** A pele e a manga de quem não tem retrato (o seu próprio emote, os ícones do menu). */
export const DEFAULT_SKIN = '#d89a6a';
export const DEFAULT_SLEEVE = '#3a5a8a';

/** Uma mão fazendo o gesto, na pele e na manga pedidas. `flip`: espelhada. */
export const GestureHand = memo(function GestureHand({ id, skin = DEFAULT_SKIN, sleeve = DEFAULT_SLEEVE, size = 36, flip = false, className = '' }) {
  const pal = { s: skin, d: tone(skin, -0.2), h: tone(skin, 0.22), k: tone(skin, -0.68), c: sleeve, C: tone(sleeve, -0.28) };
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      className={`gesture-hand ${className}`}
      style={{ shapeRendering: 'crispEdges', transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      {gridOf(id).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={pal[r.c]} />
      ))}
    </svg>
  );
});

/** O ícone de um emote (o botão e o menu): a mão do gesto, ou o "HA" da risada. */
export const EmoteIcon = memo(function EmoteIcon({ id, size = 28, className = '' }) {
  if (id === 'risada')
    return (
      <span className={`emote-icon emote-icon-ha ${className}`} style={{ width: size, height: size, fontSize: Math.max(7, Math.round(size * 0.36)) }} aria-hidden="true">
        HA
        <br />
        HA
      </span>
    );
  // versão 2.45: o "calma aí": as duas mãos abertas
  if (id === 'calma')
    return (
      <span className={`emote-icon emote-icon-pair ${className}`} style={{ width: size, height: size }} aria-hidden="true">
        <GestureHand id="aceno" size={Math.round(size * 0.5)} flip />
        <GestureHand id="aceno" size={Math.round(size * 0.5)} />
      </span>
    );
  return (
    <span className={`emote-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <GestureHand id={id} size={Math.round(size * 0.86)} />
    </span>
  );
});
