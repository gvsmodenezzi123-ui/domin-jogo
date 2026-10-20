import { useLayoutEffect, useRef, useState } from 'react';
import DominoTile from './DominoTile.jsx';
import { CoinCount } from './OpponentHeader.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import PixelSprite from './PixelSprite.jsx';
import { COIN, COIN_PALETTE } from './sprites.js';

const TILE_AREA_HEIGHT = 132;
const GAP = 6;
const PAD_X = 10;
const LIFT = 10;

/** Tamanho das pedras na mão: uma fileira grande ou duas menores, sem rolagem. */
function computeRackLayout(count, width, height = TILE_AREA_HEIGHT) {
  if (!count || !width) return { rows: 1, unit: 40, perRow: count };
  const usable = width - PAD_X * 2;
  const single = Math.floor(Math.min(46, (usable - (count - 1) * GAP) / count, (height - LIFT - 4) / 2));
  if (single >= 32 || count <= 4) return { rows: 1, unit: Math.max(18, single), perRow: count };
  const perRow = Math.ceil(count / 2);
  const double = Math.floor(Math.min(34, (usable - (perRow - 1) * GAP) / perRow, (height - LIFT - GAP - 4) / 4));
  return { rows: 2, unit: Math.max(16, double), perRow };
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function DrawCost({ draw }) {
  if (draw.reason === 'empty') return <span>DORME VAZIO</span>;
  if (draw.reason === 'limit' || !draw.cost) return <span>LIMITE</span>;
  const { cost } = draw;
  let price;
  if (cost.type === 'free') price = <span className="text-[#9fe08a]">GRÁTIS</span>;
  else if (cost.type === 'coins') {
    price = (
      <span className="inline-flex items-center gap-1 text-brass-300">
        <PixelSprite rows={COIN} palette={COIN_PALETTE} pixel={1} />
        {cost.amount}
      </span>
    );
  } else {
    price = (
      <span className="inline-flex items-center gap-1 text-blood-400">
        <PixelHeart pixel={1} />
        {cost.amount}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {price}
      {draw.reason === 'coins' && <span className="text-bone-400">· SEM $</span>}
      {draw.reason === 'hearts' && <span className="text-bone-400">· SEM ♥</span>}
    </span>
  );
}

const SIDE_BUTTON = {
  left: '< ESQ',
  right: 'DIR >',
  root: 'ABRIR',
};

/**
 * Suporte de madeira com a mão do jogador, HUD (corações, moedas) e as ações:
 * comprar (escada grátis → $3 → 1 coração), jogar e passar a vez.
 */
export default function PlayerRack({
  hand,
  selectedId,
  playableIds,
  isTurn,
  onSelectTile,
  selectedSides,
  onPlay,
  draw,
  drawsThisTurn,
  canDraw,
  onDraw,
  canPass,
  onPass,
  hearts,
  maxHearts,
  coins,
  ends,
  hint,
}) {
  const [areaRef, width] = useWidth();
  const { rows, unit, perRow } = computeRackLayout(hand.length, width);
  const rowsOfTiles = rows === 1 ? [hand] : [hand.slice(0, perRow), hand.slice(perRow)];
  const sum = ends ? ends.left + ends.right : null;
  const sumIsFive = sum !== null && sum > 0 && sum % 5 === 0;

  return (
    <section
      className={`player-rack relative z-20 shrink-0 ${isTurn ? 'player-rack-active' : ''}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      aria-label="Sua mão"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-bone-50 text-shadow-pixel">VOCÊ</span>
          <HeartsBar current={hearts} max={maxHearts} pixel={2} label={`Você: ${hearts} de ${maxHearts} corações`} />
        </div>
        <div className="flex items-center gap-3">
          {sum !== null && (
            <span
              className={`font-pixel text-[9px] ${sumIsFive ? 'text-brass-300' : 'text-bone-300'}`}
              aria-label={`Soma das pontas: ${sum}`}
            >
              Σ{sum}
            </span>
          )}
          <CoinCount value={coins} />
        </div>
      </div>

      <div ref={areaRef} className="rack-shelf relative mx-2 mt-1.5" style={{ height: TILE_AREA_HEIGHT }}>
        <div className="flex h-full flex-col items-center justify-end gap-1.5 pb-2">
          {rowsOfTiles.map((rowTiles, r) => (
            <div key={r} className="flex items-end justify-center" style={{ gap: GAP }}>
              {rowTiles.map((tile, i) => {
                const index = r * perRow + i;
                const selected = tile.id === selectedId;
                const playable = isTurn && playableIds.has(tile.id);
                return (
                  <div
                    key={tile.id}
                    className="animate-tile-in transition-transform duration-150"
                    style={{
                      animationDelay: `${Math.min(index, 7) * 45}ms`,
                      // `translate` (e não `transform`) para o levantar não brigar com a animação de entrada
                      translate: selected ? `0 -${LIFT}px` : undefined,
                    }}
                  >
                    <DominoTile
                      values={[tile.a, tile.b]}
                      orientation="vertical"
                      unit={unit}
                      depth={3}
                      selected={selected}
                      playable={playable && !selected}
                      dimmed={isTurn && !playable}
                      disabled={!isTurn || !playable}
                      onClick={() => onSelectTile(tile)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {hand.length === 0 && <p className="font-term text-lg text-bone-300">Sem pedras.</p>}
        </div>
      </div>

      <p className="min-h-[20px] px-3 pt-1.5 text-center font-term text-[17px] leading-tight text-bone-200" aria-live="polite">
        {hint}
      </p>

      <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-2 px-3 pt-1.5">
        <button type="button" className="btn-pixel flex flex-col items-center justify-center gap-1" disabled={!canDraw} onClick={onDraw}>
          <span>COMPRAR</span>
          <span className="text-[8px] text-bone-200">
            <DrawCost draw={draw} />
          </span>
          <span className="sr-only">{`Compra ${drawsThisTurn + 1} de 3 neste turno`}</span>
        </button>

        <div className="flex gap-2">
          {selectedSides.length > 0 ? (
            selectedSides.map((side) => (
              <button
                key={side}
                type="button"
                data-tone="brass"
                className="btn-pixel flex-1"
                onClick={() => onPlay(side)}
              >
                {selectedSides.length === 1 ? (side === 'root' ? 'ABRIR MESA' : 'JOGAR') : SIDE_BUTTON[side]}
              </button>
            ))
          ) : (
            <div className="btn-placeholder flex flex-1 items-center justify-center text-center font-pixel text-[8px] leading-relaxed text-bone-400">
              {isTurn ? 'TOQUE NUMA PEDRA' : 'AGUARDE'}
            </div>
          )}
        </div>

        <button type="button" data-tone="blood" className="btn-pixel" disabled={!canPass} onClick={onPass}>
          PASSAR
          <br />A VEZ
        </button>
      </div>

      <div className="flex justify-center gap-1.5 pt-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`draw-step ${isTurn && i < drawsThisTurn ? 'draw-step-used' : ''}`} />
        ))}
      </div>
    </section>
  );
}
