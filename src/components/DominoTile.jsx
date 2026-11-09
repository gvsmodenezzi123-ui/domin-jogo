import { memo, useContext } from 'react';
import { getEnhancement } from '../data/enhancedTiles.js';
import { TileSkinContext } from './tileSkin.js';
import { pixelClip, tileGrid, tileSprite } from './art/tilePixels.js';
import { HALO_M, TILE_FX, fxStrip } from './art/tileFx.js';

/** A tira de quadros andando de quadro em quadro (steps): cada passo é a largura da pedra. */
const stripStyle = (strip) => ({ backgroundImage: strip.url, width: `${strip.frames * 100}%`, animation: strip.frames > 1 ? `tileFxRun ${strip.ms}ms steps(${strip.frames}) infinite` : 'none' });
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
  // versão 2.15.2: os brilhos em pixel (o de dentro e o halo de fora), na mesma grade da pedra.
  // A de repouso (na mão sem seleção, no miolo da mesa) mostra o 1º quadro parado.
  const fx = enh ? TILE_FX[enh.id] : null;
  const kind = fx?.layer ?? (shimmer ? 'glint' : null);
  const animate = !still && !dimmed;
  const layer = kind && (animate || kind !== 'glint') ? fxStrip({ kind, mat: enh ? enh.id : null, w: artW, h: artH, horizontal, depth }) : null;
  const ringKind = selected ? (power ? 'power' : 'selected') : playable ? 'playable' : openEnd ? 'open' : null;
  const ring = ringKind ? fxStrip({ ring: ringKind, w: artW, h: artH, horizontal, depth }) : null;
  const halo = fx?.halo && !dimmed ? fxStrip({ halo: true, mat: enh.id, w: artW, h: artH, horizontal, depth }) : null;

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
      {halo && (
        <span aria-hidden="true" className={`tile-halo ${still ? 'is-still' : ''}`} style={{ left: -HALO_M * s, top: -HALO_M * s, width: width + HALO_M * 2 * s, height: height + HALO_M * 2 * s }}>
          <span className="tile-fx-strip" style={stripStyle(halo)} />
        </span>
      )}
      <span className={`tile-body ${enhClass} ${horizontal ? 'flex-row' : 'flex-col'}`} style={{ clipPath: clip, backgroundImage: sprite ?? undefined }}>
        {/* versão 2.15.2: o brilho de dentro, quadro a quadro na grade da pedra (art/tileFx.js) */}
        {layer && (
          <span aria-hidden="true" className={`tile-fx ${animate ? '' : 'is-still'}`}>
            <span className="tile-fx-strip" style={{ ...stripStyle(layer), animationDelay: shimmerDelay ? `${shimmerDelay}s` : undefined }} />
          </span>
        )}
        {/* luz da lâmpada na pedra: brilho do lado virado para ela, escuro longe dela */}
        <span aria-hidden="true" className="tile-lamp-light" />
      </span>
      {/* versão 2.15.2: as molduras de seleção em pixel, seguindo a quina em degraus */}
      {ring && (
        <span aria-hidden="true" className={`tile-ring-px is-${ringKind}`} style={{ left: -HALO_M * s, top: -HALO_M * s, width: width + HALO_M * 2 * s, height: height + HALO_M * 2 * s }}>
          <span className="tile-fx-strip" style={stripStyle(ring)} />
        </span>
      )}
    </Tag>
  );
}

export default memo(DominoTile, sameTileProps);
