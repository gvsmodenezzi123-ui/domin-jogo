import { memo, useContext } from 'react';
import { getEnhancement } from '../data/enhancedTiles.js';
import { TileSkinContext } from './tileSkin.js';
import { tileMesh } from './tileMaterials.js';
import { sameTileProps } from './tileMemo.js';

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
  // versão 2.8: pips maiores e mais perto das bordas (o desenho de referência)
  const pad = Math.max(2, Math.round(unit * 0.13));
  const pip = Math.max(2, Math.round(unit * 0.23));
  const pips = (PIP_LAYOUT[value] ?? []).map(([r, c]) => (horizontal ? [c, r] : [r, c]));
  return (
    <div
      // versão 2.8: os pips ficam por cima da luz da lâmpada e dos brilhos (preto chapado nas
      // duas metades, como na referência)
      className="domino-half relative z-[1] grid grid-cols-3 grid-rows-3"
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
          '--d': `${depth}px`,
          boxShadow: tileMesh('back', depth),
        }}
      >
        <span className="domino-back-sigil" />
      </Tag>
    );
  }

  const stain = stainFor(values);
  const dividerThickness = Math.max(1, Math.round(unit * 0.07));
  const enh = getEnhancement(enhancement);
  const onyx = !enh && skin === 'onyx';
  const silver = !enh && skin === 'silver';
  // osso envelhecido (padrão), ébano (Peças Pretas), prata (Peças Prateadas, Patch 0.9.0) ou
  // material da peça aprimorada, que vem do CSS
  // a malha é a mesma para todo material (contorno, chanfro, lateral e sombra no pano);
  // só a face muda: a da aprimorada vem do CSS (.tile-enh-<id>)
  const surface = enh
    ? { '--d': `${depth}px`, boxShadow: tileMesh(enh.id, depth) }
    : silver
      ? {
          '--d': `${depth}px`,
          background: [
            `radial-gradient(circle at ${100 - stain.x}% ${100 - stain.y}%, rgba(255,255,255,.55), transparent 44%)`,
            'repeating-linear-gradient(100deg, rgba(255,255,255,.07) 0 1px, transparent 1px 3px)',
            'linear-gradient(150deg, #f4f6f8 0%, #cfd4da 38%, #9aa1a8 72%, #7d848b 100%)',
          ].join(','),
          boxShadow: tileMesh('silver', depth),
        }
      : onyx
        ? {
            '--d': `${depth}px`,
            background: [
              `radial-gradient(circle at ${100 - stain.x}% ${100 - stain.y}%, rgba(255,255,255,.07), transparent 46%)`,
              'linear-gradient(150deg, #2b2724 0%, #1c1917 45%, #0f0d0c 100%)',
            ].join(','),
            boxShadow: tileMesh('onyx', depth),
          }
        : {
            '--d': `${depth}px`,
            // versão 2.8: marfim limpo (o desenho de referência): a luz de cima, um tico de
            // encardido em cada pedra e o pé da face um pouco mais escuro
            background: [
              `radial-gradient(circle at ${stain.x}% ${stain.y}%, rgba(150,110,50,${(stain.alpha * 0.55).toFixed(3)}), transparent 42%)`,
              'linear-gradient(180deg, rgba(255,255,250,.35) 0%, transparent 18%)',
              'linear-gradient(172deg, #f8eecd 0%, #efe1b3 48%, #e1cd95 100%)',
            ].join(','),
            boxShadow: tileMesh('bone', depth),
          };
  const rivet = Math.max(3, Math.round(unit * 0.16));

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={label ?? `Pedra ${values[0]} e ${values[1]}${enh ? ` (${enh.name})` : ''}`}
      aria-pressed={onClick ? selected : undefined}
      className={`domino-face relative flex shrink-0 select-none ${horizontal ? 'flex-row' : 'flex-col'} ${dimmed ? 'tile-dimmed' : ''} ${
        crosswise ? 'tile-crosswise' : ''
      } ${enh ? `tile-enh tile-enh-${enh.id}` : ''} ${
        enh && dimmed ? 'tile-enh-still' : ''
      } ${enh && still ? 'tile-enh-rest' : ''} ${onyx ? 'tile-onyx' : ''} ${silver ? 'tile-silver' : ''} ${className}`}
      style={{ ...shared, ...surface }}
    >
      <Half value={values[0]} horizontal={horizontal} unit={unit} />
      <Half value={values[1]} horizontal={horizontal} unit={unit} />
      <span
        aria-hidden="true"
        className="domino-divider pointer-events-none absolute"
        style={
          horizontal
            ? { left: '50%', top: '10%', bottom: '10%', width: dividerThickness, transform: 'translateX(-50%)' }
            : { top: '50%', left: '10%', right: '10%', height: dividerThickness, transform: 'translateY(-50%)' }
        }
      />
      {/* o pino de latão no meio do friso */}
      <span aria-hidden="true" className="domino-rivet pointer-events-none absolute" style={{ width: rivet, height: rivet }} />
      {enh && (
        <>
          <span aria-hidden="true" className="tile-enh-layer" />
          <span aria-hidden="true" className="tile-enh-glow" />
          {/* Ouro: o feixe especular cruza a pedra (só na selecionada e nas pontas abertas) */}
          {enh.id === 'ouro' && !still && (
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
      {/* luz da lâmpada na pedra: brilho do lado virado para ela, escuro longe dela */}
      <span aria-hidden="true" className="tile-lamp-light" />
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
