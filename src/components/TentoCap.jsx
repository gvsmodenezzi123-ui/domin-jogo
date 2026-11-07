import { PixelSvg } from './art/PixelSvg.jsx';
import { mapToRects } from './art/pixelCanvas.js';
import { TENTO_GRID, TENTO_PALETTE, drawTento } from './art/tentoArt.js';

const FULL = mapToRects(drawTento(false), TENTO_PALETTE, 'tf');
const EMPTY = mapToRects(drawTento(true), TENTO_PALETTE, 'te');

/**
 * Versão 2.7: o tento da roda contada por tentos, uma tampinha de garrafa amassada em pixel
 * art (art/tentoArt.js). `empty`: a vaga do tento que ainda falta. Quando a vaga enche, a
 * tampinha cai batendo na mesa (CSS .tento-cap.is-full).
 */
export function TentoCap({ size = 14, empty = false, className = '' }) {
  return (
    <span className={`tento-cap inline-flex shrink-0 ${empty ? 'is-empty' : 'is-full'} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <PixelSvg viewBox={`0 0 ${TENTO_GRID} ${TENTO_GRID}`} className="h-full w-full">
        {empty ? EMPTY : FULL}
      </PixelSvg>
    </span>
  );
}

/** A fileira de tentos no lugar dos corações: as tampinhas feitas e as vagas até a meta. */
export function TentosBar({ current, max, size = 14, label }) {
  const caps = [];
  // a chave muda quando a vaga enche: a tampinha nova entra com a animação
  for (let i = 0; i < max; i += 1) caps.push(<TentoCap key={`${i}:${i < current ? 'f' : 'e'}`} empty={i >= current} size={size} />);
  return (
    <span className="tentos-bar inline-flex items-center gap-[2px]" role="img" aria-label={label ?? `${current} de ${max} tentos`}>
      {caps}
    </span>
  );
}
