import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BASE_UNIT_PX, WORLD_COLS, computeBoardLayout, computeCamera, computeWorldSize } from '../engine/boardLayout.js';
import { boardTilesInOrder } from '../engine/dominoLogic.js';
import DominoTile from './DominoTile.jsx';
import PixelSprite from './PixelSprite.jsx';
import { LAMP, LAMP_PALETTE } from './sprites.js';

/** Margem interna do feltro (a mesa usa quase toda a largura da tela). */
const BOARD_PADDING = 8;
/** Folga visual entre pedras vizinhas, em px do mundo (antes da câmera). */
const TILE_INSET = 1.5;
const B = BASE_UNIT_PX;

function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

const SIDE_LABEL = { left: 'esquerda', right: 'direita', root: 'centro' };

/** Marca da ponta: congelada pelo Chumbo (vale para o Tio Zé) ou curinga do Cristal (vale para você). */
const MARK_CLASS = { frozen: 'end-badge-frozen', wild: 'end-badge-wild', both: 'end-badge-wild' };
const MARK_LABEL = { frozen: ' (congelada para o Tio Zé)', wild: ' (curinga na sua jogada)', both: ' (curinga na sua jogada)' };

/** Caixa (px do mundo) de uma pedra de `unit` px centrada no retângulo r (em unidades). */
function tileBox(r, orientation, unit) {
  const w = orientation === 'horizontal' ? unit * 2 : unit;
  const h = orientation === 'horizontal' ? unit : unit * 2;
  return { left: r.x * B + (r.w * B - w) / 2, top: r.y * B + (r.h * B - h) / 2, width: w, height: h };
}

/**
 * Mesa em feltro verde-musgo. As pedras ficam num "mundo" em unidades
 * (engine/boardLayout.js), com posição fixa desde que são jogadas, e uma
 * câmera automática enquadra a jogada: bem perto no começo da rodada,
 * afastando conforme a trilha cresce.
 */
export default function TableBoard({
  board,
  roundKey,
  playableSides = [],
  onPlaySide,
  banner,
  dimmed = false,
  previewDouble = false,
  frameRef,
  endMarks = {},
  overlay = null,
}) {
  const [areaRef, size] = useElementSize();
  // O tamanho do mundo é congelado no começo da rodada: se a mesa mudar de
  // altura no meio (dica em duas linhas, barra do Safari), só a câmera ajusta;
  // nenhuma pedra muda de lugar.
  const [world, setWorld] = useState({ round: null, cols: WORLD_COLS, rows: 13 });
  if (size.width > 0 && world.round !== roundKey) {
    setWorld({ round: roundKey, ...computeWorldSize(size.width, size.height) });
  }
  const { cols, rows } = world;

  // A câmera usa o layout sem prévia, para não mexer quando o jogador seleciona uma pedra.
  const baseLayout = useMemo(() => computeBoardLayout(board, cols, rows), [board, cols, rows]);
  const layout = useMemo(
    () => (previewDouble ? computeBoardLayout(board, cols, rows, { previewDouble: true }) : baseLayout),
    [board, cols, rows, previewDouble, baseLayout],
  );
  const camera = computeCamera(baseLayout, size);
  const unit = B - TILE_INSET * 2;
  const enhancementOf = useMemo(
    () => new Map(boardTilesInOrder(board).filter((t) => t.enhancement).map((t) => [t.id, t.enhancement])),
    [board],
  );

  return (
    <section ref={frameRef} className="felt-table relative min-h-0 w-full flex-1 overflow-hidden" aria-label="Mesa">
      <div className="lamp-light pointer-events-none absolute inset-0" />
      <div className="felt-vignette pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
        <span className="block h-2 w-[2px] bg-black/80" />
        <PixelSprite rows={LAMP} palette={LAMP_PALETTE} pixel={3} className="lamp-sprite" />
      </div>

      <div ref={areaRef} className="absolute" style={{ inset: BOARD_PADDING }}>
        {size.width > 0 && (
          <div
            className="board-world absolute left-0 top-0"
            style={{
              width: cols * B,
              height: rows * B,
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            }}
          >
            {layout.tiles.map((tile) => {
              const box = tileBox(tile, tile.orientation, unit);
              return (
                <div
                  key={tile.id}
                  className={`board-tile absolute ${tile.isOpenEnd ? 'z-10 scale-110' : 'z-0'}`}
                  style={box}
                >
                  <div className={`relative ${tile.isDouble ? 'animate-tile-slam' : 'animate-tile-drop'}`}>
                    <DominoTile
                      values={tile.values}
                      orientation={tile.lineAxis}
                      onBoard
                      unit={unit}
                      enhancement={enhancementOf.get(tile.id)}
                      openEnd={tile.isOpenEnd}
                      depth={tile.isDouble ? 5 : 4}
                    />
                    {tile.isDouble && <span aria-hidden="true" className="impact-ring pointer-events-none absolute" />}
                  </div>
                </div>
              );
            })}

            {Object.entries(layout.slots).map(([side, slot]) => {
              const active = playableSides.includes(side);
              const box = tileBox(slot, slot.orientation, unit);
              // badge com tamanho fixo NA TELA (contraescala da câmera): número sempre legível
              const badgeScreen = Math.min(40, Math.max(22, camera.unitPx * 0.82));
              const badgeSize = badgeScreen / camera.scale;
              return (
                <div key={side}>
                  {active && (
                    <button
                      type="button"
                      onClick={() => onPlaySide?.(side)}
                      aria-label={`Jogar na ponta ${SIDE_LABEL[side]}`}
                      className="slot-ghost absolute z-20"
                      style={box}
                    />
                  )}
                  {!active && side === 'root' && <div className="slot-empty pointer-events-none absolute" style={box} />}
                  {slot.badge && (
                    <button
                      type="button"
                      tabIndex={active ? 0 : -1}
                      disabled={!active}
                      onClick={() => onPlaySide?.(side)}
                      aria-label={`Ponta ${SIDE_LABEL[side]} livre: ${slot.value}${MARK_LABEL[endMarks[side]] ?? ''}`}
                      className={`end-badge absolute z-30 ${active ? 'end-badge-active' : ''} ${MARK_CLASS[endMarks[side]] ?? ''}`}
                      style={{
                        left: slot.badge.x * B,
                        top: slot.badge.y * B,
                        width: badgeSize,
                        height: badgeSize,
                        fontSize: (badgeScreen * 0.46) / camera.scale,
                        borderWidth: 3 / camera.scale,
                      }}
                    >
                      {slot.value}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dimmed && <div className="pointer-events-none absolute inset-0 bg-black/45" />}

      {overlay}

      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] z-40 flex justify-center px-4">
          <div key={banner.key} className={`animate-banner banner-plate ${banner.tone === 'enemy' ? 'banner-enemy' : ''}`}>
            <span className="block whitespace-nowrap">{banner.text}</span>
            {banner.sub && <span className="banner-sub mt-1.5 block whitespace-nowrap">{banner.sub}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
