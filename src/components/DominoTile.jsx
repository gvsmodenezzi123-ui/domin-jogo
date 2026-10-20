import { memo } from 'react';
import { getEnhancement } from '../data/enhancedTiles.js';

/**
 * Posições dos pips numa grade 3x3 [linha, coluna], pensadas para a metade de
 * uma pedra em pé. Na pedra deitada a grade é transposta (o 6 vira 2 linhas de 3).
 */
const PIP_LAYOUT = Object.freeze({
  0: [],
  1: [[1, 1]],
  2: [
    [0, 2],
    [2, 0],
  ],
  3: [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
});

/** Manchas de envelhecimento estáveis por pedra (sem aleatoriedade no render). */
function stainFor(values) {
  const seed = (values[0] * 7 + values[1] * 13 + 3) % 17;
  return { x: 18 + ((seed * 11) % 64), y: 20 + ((seed * 23) % 60), alpha: 0.1 + (seed % 5) * 0.025 };
}

function Half({ value, horizontal, unit }) {
  const pad = Math.max(2, Math.round(unit * 0.15));
  const pip = Math.max(2, Math.round(unit * 0.19));
  const pips = (PIP_LAYOUT[value] ?? []).map(([r, c]) => (horizontal ? [c, r] : [r, c]));
  return (
    <div
      className="grid grid-cols-3 grid-rows-3"
      style={{ width: unit, height: unit, padding: pad, boxSizing: 'border-box' }}
    >
      {pips.map(([r, c]) => (
        <span
          key={`${r}${c}`}
          className="domino-pip place-self-center"
          style={{ gridRow: r + 1, gridColumn: c + 1, width: pip, height: pip }}
        />
      ))}
    </div>
  );
}

/**
 * Pedra de dominó em osso amarelado envelhecido.
 *
 * values:      [primeiro, segundo] — esquerda/direita (deitada) ou cima/baixo (em pé)
 * orientation: na mão, a orientação da pedra; na mesa (`onBoard`), a direção da LINHA
 * onBoard:     na mesa a bucha fica sempre atravessada: os eixos se invertem
 * power:       bucha selecionada na mão — moldura amarela pulsando
 * shimmer:     reflexo de luz passando pela pedra de tempos em tempos (`shimmerDelay` defasa)
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
  depth = 2,
  onClick,
  disabled = false,
  className = '',
  style,
  label,
}) {
  const isDouble = values[0] === values[1];
  // bucha na mesa: perpendicular à linha (em pé na horizontal, deitada na vertical)
  const crosswise = onBoard && isDouble && !faceDown;
  const actual = crosswise ? (orientation === 'horizontal' ? 'vertical' : 'horizontal') : orientation;
  const horizontal = actual === 'horizontal';
  const width = horizontal ? unit * 2 : unit;
  const height = horizontal ? unit : unit * 2;
  const Tag = onClick ? 'button' : 'div';
  const radius = Math.max(2, Math.round(unit * 0.12));

  const shared = {
    width,
    height,
    borderRadius: radius,
    ...style,
  };

  if (faceDown) {
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        disabled={onClick ? disabled : undefined}
        aria-label={label ?? 'Pedra virada'}
        className={`domino-back relative shrink-0 ${className}`}
        style={{
          ...shared,
          boxShadow: `inset 1px 1px 0 rgba(255,220,170,.14), inset -1px -1px 0 rgba(0,0,0,.6), 0 ${depth}px 0 #120b06, 0 ${depth + 1}px ${depth + 2}px rgba(0,0,0,.6)`,
        }}
      >
        <span className="domino-back-sigil" />
      </Tag>
    );
  }

  const stain = stainFor(values);
  const dividerThickness = Math.max(1, Math.round(unit * 0.06));
  const enh = getEnhancement(enhancement);
  // osso envelhecido (padrão) ou material da peça aprimorada, que vem do CSS
  const surface = enh
    ? { '--d': `${depth}px` }
    : {
        background: [
          `radial-gradient(circle at ${stain.x}% ${stain.y}%, rgba(112,78,28,${stain.alpha}), transparent 42%)`,
          `radial-gradient(circle at ${100 - stain.x}% ${100 - stain.y}%, rgba(255,252,236,.22), transparent 48%)`,
          'linear-gradient(150deg, #f3e9c9 0%, #e2d1a2 42%, #c9b47c 100%)',
        ].join(','),
        boxShadow: [
          'inset 1px 1px 0 rgba(255,251,236,.9)',
          'inset -1px -1px 0 rgba(96,70,30,.6)',
          'inset 0 0 0 1px rgba(58,40,16,.28)',
          `0 ${depth}px 0 #6f5a33`,
          `0 ${depth + 1}px 0 #2a1f10`,
          `0 ${depth + 2}px ${depth + 4}px rgba(0,0,0,.55)`,
        ].join(','),
      };

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={label ?? `Pedra ${values[0]} e ${values[1]}${enh ? ` (${enh.name})` : ''}`}
      aria-pressed={onClick ? selected : undefined}
      className={`relative flex shrink-0 select-none ${horizontal ? 'flex-row' : 'flex-col'} ${
        dimmed ? 'brightness-[.6] sepia-[.35]' : ''
      } ${crosswise ? 'drop-shadow-[0_6px_5px_rgba(0,0,0,0.7)]' : ''} ${enh ? `tile-enh tile-enh-${enh.id}` : ''} ${
        enh && dimmed ? 'tile-enh-still' : ''
      } ${className}`}
      style={{ ...shared, ...surface }}
    >
      <Half value={values[0]} horizontal={horizontal} unit={unit} />
      <Half value={values[1]} horizontal={horizontal} unit={unit} />
      <span
        aria-hidden="true"
        className="domino-divider pointer-events-none absolute"
        style={
          horizontal
            ? { left: '50%', top: '16%', bottom: '16%', width: dividerThickness, transform: 'translateX(-50%)' }
            : { top: '50%', left: '16%', right: '16%', height: dividerThickness, transform: 'translateY(-50%)' }
        }
      />
      {enh && (
        <>
          <span aria-hidden="true" className="tile-enh-layer" />
          <span aria-hidden="true" className="tile-enh-glow" />
          {/* Ouro: o feixe especular cruza a pedra sem parar */}
          {enh.id === 'ouro' && (
            <span aria-hidden="true" className="shimmer-active pointer-events-none" style={{ position: 'absolute', inset: 0, borderRadius: radius }} />
          )}
        </>
      )}
      {shimmer && (
        <span
          aria-hidden="true"
          className="tile-shimmer-effect pointer-events-none"
          style={{ position: 'absolute', inset: 0, borderRadius: radius, '--shimmer-delay': `${shimmerDelay}s` }}
        />
      )}
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

export default memo(DominoTile);
