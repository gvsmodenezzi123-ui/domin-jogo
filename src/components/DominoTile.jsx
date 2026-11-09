import { memo, useContext } from 'react';
import { getEnhancement } from '../data/enhancedTiles.js';
import { TileSkinContext } from './tileSkin.js';
import { pixelClip, tileGrid, tileSprite } from './art/tilePixels.js';
import { sameTileProps } from './tileMemo.js';

/**
 * Pedra de dominó em marfim (ou ébano, nas Peças Pretas: TileSkinContext).
 * Versão 2.8: todas as pedras (comuns e aprimoradas) usam a mesma malha (tileMaterials.js):
 * contorno escuro, chanfro, lateral de 3–4 px de espessura, o friso do meio com o pino de
 * latão e os pips cavados; o material só troca o "shader" da face.
 *
 * values:      [primeiro, segundo] — esquerda/direita (deitada) ou cima/baixo (em pé)
 * orientation: na mão, a orientação da pedra; na mesa (`onBoard`), a direção da LINHA
 * onBoard:     na mesa a bucha fica sempre atravessada: os eixos se invertem
 * power:       bucha selecionada na mão — moldura amarela pulsando
 * shimmer:     reflexo de luz passando pela pedra de tempos em tempos (`shimmerDelay` defasa)
 * still:       pedra em repouso (na mão sem seleção, no miolo da mesa): o material fica em
 *              gradiente estático, sem animação contínua nenhuma (economia de GPU no iPhone).
 *              Só a selecionada e as duas pontas abertas animam.
 * luz:         a lâmpada da mesa ilumina a pedra (brilho, sombra e escuro seguem a luz),
 *              pelas variáveis --lx/--ly/--lit que components/tileLighting.js põe na vaga
 * enhancement: 'ouro' | 'rubi' | 'cristal' | 'chumbo' | 'fantasma' — troca o material
 *              da pedra por um "shader" em CSS (.tile-enh-<id> em index.css)
 * unit:        lado de cada metade, em px
 */
function DominoTile({
  values = [0, 0],
  orientation = 'vertical',
  unit = 32,
  faceDown = false,
  selected = false,
  dimmed = false,
  playable = false,
  openEnd = false,
  onBoard = false,
  power = false,
  enhancement = null,
  shimmer = false,
  shimmerDelay = 0,
  still = false,
  depth = 2,
  onClick,
  disabled = false,
  className = '',
  style,
  label,
}) {
  // Peças Pretas (Patch 0.6.3): as pedras comuns viram ébano com pips brancos
  const skin = useContext(TileSkinContext);
  const isDouble = values[0] === values[1];
  // bucha na mesa: perpendicular à linha (em pé na horizontal, deitada na vertical)
  const crosswise = onBoard && isDouble && !faceDown;
  const actual = crosswise ? (orientation === 'horizontal' ? 'vertical' : 'horizontal') : orientation;
  const horizontal = actual === 'horizontal';
  const width = horizontal ? unit * 2 : unit;
  const height = horizontal ? unit : unit * 2;
  const Tag = onClick ? 'button' : 'div';
  // versão 2.15: a pedra em pixel art de verdade (a referência do jogador): pintada numa grade
  // baixa (art/tilePixels.js) e recortada com a quina em degraus
  const { hw, s, corner } = tileGrid(unit);
  const artW = horizontal ? hw * 2 : hw;
  const artH = horizontal ? hw : hw * 2;
  const clip = pixelClip(width, height, s, corner);
  const radius = Math.max(1, Math.round(corner[0] * s * 0.7));

  const shared = {
    width,
    height,
    borderRadius: radius,
    '--d': `${depth}px`,
    '--tile-clip': clip,
    boxShadow: 'var(--cast, 0 0 0 transparent)',
    ...style,
  };

  if (faceDown) {
    const sprite = tileSprite({ mat: 'back', back: true, w: artW, h: artH, horizontal, depth });
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        disabled={onClick ? disabled : undefined}
        aria-label={label ?? 'Pedra virada'}
        className={`domino-back relative shrink-0 ${className}`}
        style={{ ...shared, background: 'none' }}
      >
        <span aria-hidden="true" className="tile-body tile-px" style={{ clipPath: clip, backgroundImage: sprite ?? undefined }} />
      </Tag>
    );
  }

  const enh = getEnhancement(enhancement);
  const onyx = !enh && skin === 'onyx';
  const silver = !enh && skin === 'silver';
  // todas saem inteiras da pintura (marfim, ébano das Peças Pretas, prata das Prateadas e as
  // aprimoradas); nas aprimoradas, as camadas animadas do CSS (.tile-enh-<id>) ficam por cima
  const mat = enh ? enh.id : onyx ? 'onyx' : silver ? 'silver' : 'bone';
  const sprite = tileSprite({ mat, w: artW, h: artH, horizontal, depth, values });
  const enhClass = enh ? `tile-enh tile-enh-${enh.id} ${dimmed ? 'tile-enh-still' : ''} ${still ? 'tile-enh-rest' : ''}` : 'tile-px';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={label ?? `Pedra ${values[0]} e ${values[1]}${enh ? ` (${enh.name})` : ''}`}
      aria-pressed={onClick ? selected : undefined}
      className={`domino-face relative shrink-0 select-none ${dimmed ? 'tile-dimmed' : ''} ${crosswise ? 'tile-crosswise' : ''} ${onyx ? 'tile-onyx' : ''} ${silver ? 'tile-silver' : ''} ${className}`}
      style={shared}
    >
      <span className={`tile-body ${enhClass} ${horizontal ? 'flex-row' : 'flex-col'}`} style={{ clipPath: clip, backgroundImage: sprite ?? undefined }}>
        {enh && (
          <>
            <span aria-hidden="true" className="tile-enh-layer" />
            <span aria-hidden="true" className="tile-enh-glow" />
            {/* versão 2.13: os quatro cantos da pedra, para o shader (FxLayer.jsx) achar onde ela
                está de verdade na tela: girada no leque, deitada em perspectiva na mesa */}
            <span aria-hidden="true" className="fx-corner fx-c0" />
            <span aria-hidden="true" className="fx-corner fx-c1" />
            <span aria-hidden="true" className="fx-corner fx-c2" />
            <span aria-hidden="true" className="fx-corner fx-c3" />
            {/* Ouro: o feixe especular cruza a pedra (só na selecionada e nas pontas abertas) */}
            {enh.id === 'ouro' && !still && <span aria-hidden="true" className="shimmer-active pointer-events-none" style={{ position: 'absolute', inset: 0 }} />}
          </>
        )}
        {shimmer && <span aria-hidden="true" className="tile-shimmer-effect pointer-events-none" style={{ position: 'absolute', inset: 0, '--shimmer-delay': `${shimmerDelay}s` }} />}
        {/* luz da lâmpada na pedra: brilho do lado virado para ela, escuro longe dela */}
        <span aria-hidden="true" className="tile-lamp-light" />
      </span>
      {selected && (
        <span
          aria-hidden="true"
          className={`${power ? 'tile-ring-power' : 'tile-ring-selected'} pointer-events-none absolute -inset-[3px]`}
          style={{ borderRadius: radius + 2 }}
        />
      )}
      {!selected && playable && (
        <span aria-hidden="true" className="tile-ring-playable pointer-events-none absolute -inset-[2px]" style={{ borderRadius: radius + 1 }} />
      )}
      {openEnd && (
        <span aria-hidden="true" className="animate-end-pulse pointer-events-none absolute -inset-[2px] border-2 border-brass-300" style={{ borderRadius: radius + 1 }} />
      )}
    </Tag>
  );
}

export default memo(DominoTile, sameTileProps);
