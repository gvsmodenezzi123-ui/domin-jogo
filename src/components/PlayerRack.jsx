import { useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { computeFan } from './handFan.js';
import Hotbar from './Hotbar.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import { CoinGlyph, EyeGlyph } from './UiGlyphs.jsx';

/** Altura da área do leque (px). */
const FAN_HEIGHT = 150;
/** Distância da base do leque até o rodapé (as pedras das pontas descem até aqui). */
const FAN_BASE = 26;
/** Quanto a pedra selecionada sobe para fora do leque (-translate-y-6). */
const SELECT_LIFT = 24;

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
        <CoinGlyph size={9} />
        {cost.amount}
      </span>
    );
  } else {
    price = (
      <span className="inline-flex items-center gap-1 text-blood-400">
        <PixelHeart size={9} />
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
 * Mão do jogador em leque flutuante sobre o feltro, HUD (corações, moedas) e as
 * ações: comprar (escada grátis → $3 → 1 coração), jogar e passar a vez.
 * No modo descarte (Giz de Sinuca) qualquer pedra pode ser tocada e os botões
 * viram PULAR / DESCARTAR. Logo acima do leque fica a SUA hotbar de talismãs.
 * Segurar uma pedra aprimorada (ou um talismã) mostra o balão com o efeito.
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
  discardMode = false,
  onDiscard,
  onSkipDiscard,
  onSecretTap,
  relics = [],
  relicFlashes,
  spentRelics,
  canUndo = false,
  onUndo,
  devUnlocked = false,
  onOpenDev,
  press,
  knownIds,
  rivalName = 'o rival',
}) {
  const [areaRef, width] = useWidth();
  const { unit, spots } = computeFan(hand.length, width);
  const sum = ends ? ends.left + ends.right : null;
  const sumIsFive = sum !== null && sum > 0 && sum % 5 === 0;

  return (
    <section
      className={`player-hand relative z-20 shrink-0 ${isTurn ? 'player-hand-active' : ''}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      aria-label="Sua mão"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="flex items-center gap-2">
          {/* 3 toques seguidos aqui abrem o painel DEV */}
          <button type="button" onClick={onSecretTap} className="font-pixel text-[10px] text-bone-50 text-shadow-pixel" aria-label="Você">
            VOCÊ
          </button>
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
          <CoinCount value={coins} target="player" />
        </div>
      </div>

      <div className="flex h-[34px] items-center gap-2 px-3 pt-1">
        <Hotbar
          relics={relics}
          size={30}
          flashes={relicFlashes}
          spent={spentRelics}
          ready={canUndo ? ['relogio'] : []}
          press={press}
          label="Seus talismãs"
        />
        <div className="ml-auto flex items-center gap-2">
          {canUndo && (
            <button type="button" data-tone="brass" className="btn-pixel btn-mini" onClick={onUndo}>
              DESFAZER
            </button>
          )}
          {devUnlocked && (
            <button type="button" className="dev-chip" onClick={onOpenDev} aria-label="Abrir painel de testes">
              DEV
            </button>
          )}
        </div>
      </div>

      <div ref={areaRef} className="relative mx-1" style={{ height: FAN_HEIGHT }}>
        {hand.map((tile, i) => {
          const spot = spots[i];
          if (!spot) return null;
          const selected = tile.id === selectedId;
          const active = isTurn || discardMode;
          const playable = active && playableIds.has(tile.id);
          const power = selected && tile.a === tile.b && !discardMode;
          const known = knownIds?.has(tile.id);
          return (
            <div
              key={tile.id}
              data-hand-tile={tile.id}
              {...(tile.enhancement && press ? press({ kind: 'tile', tile }) : {})}
              className="hand-slot absolute"
              style={{
                left: `calc(50% + ${spot.x - unit / 2}px)`,
                bottom: FAN_BASE,
                width: unit,
                height: unit * 2,
                zIndex: selected ? 30 : i + 1,
                // selecionada: sai do leque (-translate-y-6 scale-110), reta
                transform: selected
                  ? `translateY(-${SELECT_LIFT}px) rotate(0deg) scale(1.1)`
                  : `translateY(${spot.drop}px) rotate(${spot.angle}deg)`,
              }}
            >
              <div
                className={`hand-float ${selected ? 'hand-float-lifted' : ''}`}
                style={{ animationDelay: `${-i * 0.45}s` }}
              >
                <div className="animate-tile-in" style={{ animationDelay: `${Math.min(i, 7) * 45}ms` }}>
                  {/* a key troca ao selecionar bucha: a tremidinha roda de novo a cada toque */}
                  <div key={power ? 'power' : 'idle'} className={power ? 'animate-power-wiggle' : ''}>
                    <DominoTile
                      values={[tile.a, tile.b]}
                      orientation="vertical"
                      unit={unit}
                      depth={3}
                      selected={selected}
                      power={power}
                      enhancement={tile.enhancement}
                      shimmer
                      shimmerDelay={i * 0.12}
                      playable={playable && !selected}
                      dimmed={active && !playable}
                      disabled={!active || !playable}
                      // desabilitada não recebe toque: o toque longo cai no slot de baixo
                      className={!active || !playable ? 'pointer-events-none' : ''}
                      onClick={() => onSelectTile(tile)}
                    />
                    {known && (
                      <span className="tile-known-mark" aria-label={`${rivalName} está vendo esta pedra`} title={`${rivalName} está vendo esta pedra`}>
                        <EyeGlyph size={13} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {hand.length === 0 && (
          <p className="absolute inset-x-0 bottom-10 text-center font-term text-lg text-bone-300">Sem pedras.</p>
        )}
      </div>

      <p className="min-h-[20px] px-3 pt-1.5 text-center font-term text-[17px] leading-tight text-bone-200" aria-live="polite">
        {hint}
      </p>

      {discardMode ? (
        <div className="grid grid-cols-[1fr_1.4fr] gap-2 px-3 pt-1.5">
          <button type="button" className="btn-pixel" onClick={onSkipDiscard}>
            PULAR
          </button>
          <button type="button" data-tone="brass" className="btn-pixel" disabled={!selectedId} onClick={onDiscard}>
            DESCARTAR
          </button>
        </div>
      ) : (
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
      )}

      <div className="flex justify-center gap-1.5 pt-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`draw-step ${isTurn && i < drawsThisTurn ? 'draw-step-used' : ''}`} />
        ))}
      </div>
    </section>
  );
}
