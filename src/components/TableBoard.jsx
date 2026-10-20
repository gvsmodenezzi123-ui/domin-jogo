import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { computeBoardLayout, computeGridSize } from '../engine/boardLayout.js';
import DominoTile from './DominoTile.jsx';
import PixelSprite from './PixelSprite.jsx';
import { LAMP, LAMP_PALETTE } from './sprites.js';

const TILE_GAP = 2;
const BOARD_PADDING = 10;

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

/**
 * Mesa em feltro verde-musgo. As pedras são posicionadas numa grade em "U"
 * (ver engine/boardLayout.js); não há zoom: a grade sempre cabe na tela.
 */
export default function TableBoard({ board, playableSides = [], onPlaySide, banner, dimmed = false }) {
  const [areaRef, size] = useElementSize();
  const { cols, rows, cell } = computeGridSize(size.width, size.height);
  const layout = useMemo(() => computeBoardLayout(board, cols, rows), [board, cols, rows]);

  const offsetX = Math.floor((size.width - cols * cell) / 2);
  const offsetY = Math.floor((size.height - rows * cell) / 2);
  const unit = Math.max(8, cell - TILE_GAP);

  const place = (x, y, w, h, tileW, tileH) => ({
    left: offsetX + x * cell + (w * cell - tileW) / 2,
    top: offsetY + y * cell + (h * cell - tileH) / 2,
  });

  const slotEntries = Object.entries(layout.slots);

  return (
    <section className="felt-table relative min-h-0 flex-1 overflow-hidden" aria-label="Mesa">
      <div className="lamp-light pointer-events-none absolute inset-0" />
      <div className="felt-vignette pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
        <span className="block h-2 w-[2px] bg-black/80" />
        <PixelSprite rows={LAMP} palette={LAMP_PALETTE} pixel={3} className="lamp-sprite" />
      </div>

      <div ref={areaRef} className="absolute" style={{ inset: BOARD_PADDING }}>
        {cell > 0 && (
          <>
            {layout.tiles.map((tile) => {
              const tileW = tile.orientation === 'horizontal' ? unit * 2 : unit;
              const tileH = tile.orientation === 'horizontal' ? unit : unit * 2;
              const pos = place(tile.x, tile.y, tile.w, tile.h, tileW, tileH);
              return (
                <div
                  key={tile.id}
                  className={`absolute ${tile.isOpenEnd ? 'z-10 scale-110' : 'z-0'} transition-transform duration-200`}
                  style={{ left: pos.left, top: pos.top, width: tileW, height: tileH }}
                >
                  <div className="animate-tile-drop">
                    <DominoTile
                      values={tile.values}
                      orientation={tile.orientation}
                      unit={unit}
                      openEnd={tile.isOpenEnd}
                      depth={Math.max(1, Math.round(unit * 0.08))}
                    />
                  </div>
                </div>
              );
            })}

            {slotEntries.map(([side, slot]) => {
              const active = playableSides.includes(side);
              const slotW = slot.w * cell - TILE_GAP;
              const slotH = slot.h * cell - TILE_GAP;
              const pos = place(slot.x, slot.y, slot.w, slot.h, slotW, slotH);
              return (
                <div key={side}>
                  {active && (
                    <button
                      type="button"
                      onClick={() => onPlaySide?.(side)}
                      aria-label={`Jogar na ponta ${SIDE_LABEL[side]}`}
                      className="slot-ghost absolute z-20"
                      style={{ left: pos.left, top: pos.top, width: slotW, height: slotH }}
                    />
                  )}
                  {!active && side === 'root' && (
                    <div
                      className="slot-empty pointer-events-none absolute"
                      style={{ left: pos.left, top: pos.top, width: slotW, height: slotH }}
                    />
                  )}
                  {slot.badge && (
                    <button
                      type="button"
                      tabIndex={active ? 0 : -1}
                      disabled={!active}
                      onClick={() => onPlaySide?.(side)}
                      aria-label={`Ponta ${SIDE_LABEL[side]} livre: ${slot.value}`}
                      className={`end-badge absolute z-30 ${active ? 'end-badge-active' : ''}`}
                      style={{
                        left: offsetX + slot.badge.x * cell,
                        top: offsetY + slot.badge.y * cell,
                        width: Math.max(16, Math.round(cell * 0.78)),
                        height: Math.max(16, Math.round(cell * 0.78)),
                        fontSize: Math.max(7, Math.round(cell * 0.36)),
                      }}
                    >
                      {slot.value}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {dimmed && <div className="pointer-events-none absolute inset-0 bg-black/45" />}

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
