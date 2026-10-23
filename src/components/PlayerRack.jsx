import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { computeFan } from './handFan.js';
import Hotbar from './Hotbar.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import { CoinGlyph, EyeGlyph, MenuGlyph, SpeakerGlyph } from './UiGlyphs.jsx';

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

/**
 * Rótulo do PASSAR A VEZ (Patch 0.5.4): de graça depois de comprar; $3 podendo
 * jogar ($1 com a Moeda Furada); SALDO INSUFICIENTE sem saldo; apagado quando a
 * compra é obrigatória.
 */
function passButtonText(rule) {
  if (!rule) return 'PASSAR A VEZ';
  if (rule.reason === 'coins') return `SALDO INSUFICIENTE ($${rule.cost ?? 3})`;
  if (rule.reason === 'mustDraw') return 'PASSAR A VEZ: COMPRE ANTES';
  if (rule.fiado) return 'PASSAR A VEZ (FIADO: DE GRAÇA)';
  return rule.cost > 0 ? `PASSAR A VEZ ($${rule.cost})` : 'PASSAR A VEZ';
}

function PassLabel({ rule }) {
  if (rule?.reason === 'coins') {
    return (
      <>
        <span className="block text-[8px] leading-snug">SALDO INSUFICIENTE</span>
        <span className="pass-note block text-brass-300">(${rule.cost ?? 3})</span>
      </>
    );
  }
  return (
    <>
      <span className="block">PASSAR</span>
      <span className="block">A VEZ{rule?.cost > 0 ? ` ($${rule.cost})` : ''}</span>
      {rule?.fiado && <span className="pass-note block text-brass-300">FIADO</span>}
      {rule?.reason === 'mustDraw' && <span className="pass-note block text-bone-200">COMPRE ANTES</span>}
    </>
  );
}

const SIDE_BUTTON = {
  left: '< ESQ',
  right: 'DIR >',
  root: 'ABRIR',
};

/** Cabeçalho da sua mão: VOCÊ (3 toques abrem o DEV), corações, soma das pontas e moedas. */
const PlayerHud = memo(function PlayerHud({ onSecretTap, hearts, maxHearts, sum, coins }) {
  const sumIsFive = sum !== null && sum > 0 && sum % 5 === 0;
  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-2">
      <div className="flex items-center gap-2">
        {/* 3 toques seguidos aqui abrem o painel DEV */}
        <button type="button" onClick={onSecretTap} className="font-pixel text-[10px] text-bone-50 text-shadow-pixel" aria-label="Você">
          VOCÊ
        </button>
        <span data-tut="hearts">
          <HeartsBar current={hearts} max={maxHearts} pixel={2} label={`Você: ${hearts} de ${maxHearts} corações`} />
        </span>
      </div>
      <div className="flex items-center gap-3">
        {sum !== null && (
          <span data-tut="sum" className={`font-pixel text-[9px] ${sumIsFive ? 'text-brass-300' : 'text-bone-300'}`} aria-label={`Soma das pontas: ${sum}`}>
            Σ{sum}
          </span>
        )}
        <CoinCount value={coins} target="player" />
      </div>
    </div>
  );
});

/**
 * Sua hotbar de talismãs, o DESFAZER do Relógio, o atalho do DEV e (desde o 0.6.2) o som e
 * o menu da partida, que saíram de cima da mão do rival.
 */
const RelicRow = memo(function RelicRow({
  relics,
  relicSlots,
  relicFlashes,
  spentRelics,
  canUndo,
  onUndo,
  canCanivete = false,
  onCanivete,
  devUnlocked,
  onOpenDev,
  muted,
  onToggleMute,
  onOpenMenu,
  press,
}) {
  const ready = canUndo && canCanivete ? READY_BOTH : canUndo ? READY_RELOGIO : canCanivete ? READY_CANIVETE : NONE;
  return (
    <div className="flex h-[34px] items-center gap-2 px-3 pt-1">
      <Hotbar
        relics={relics}
        slots={relicSlots}
        size={30}
        flashes={relicFlashes}
        spent={spentRelics}
        ready={ready}
        press={press}
        bare
        label="Seus talismãs"
      />
      <div className="ml-auto flex items-center gap-2">
        {canUndo && (
          <button type="button" data-tone="brass" className="btn-pixel btn-mini" onClick={onUndo}>
            DESFAZER
          </button>
        )}
        {canCanivete && (
          <button type="button" data-tone="brass" className="btn-pixel btn-mini" onClick={onCanivete} aria-label="Canivete: virar uma pedra da mão em bucha">
            CANIVETE
          </button>
        )}
        {devUnlocked && (
          <button type="button" className="dev-chip" onClick={onOpenDev} aria-label="Abrir painel de testes">
            DEV
          </button>
        )}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className="icon-btn icon-btn-sm hud-icon"
            aria-label={muted ? 'Ligar som e música' : 'Desligar som e música'}
            aria-pressed={muted}
          >
            <SpeakerGlyph muted={muted} size={16} />
          </button>
        )}
        {onOpenMenu && (
          <button type="button" onClick={onOpenMenu} className="icon-btn icon-btn-sm hud-icon" aria-label="Menu">
            <MenuGlyph size={16} />
          </button>
        )}
      </div>
    </div>
  );
});

const READY_RELOGIO = ['relogio'];
const READY_CANIVETE = ['canivete'];
const READY_BOTH = ['relogio', 'canivete'];
const NONE = [];

/**
 * Uma pedra do leque. Só ela re-renderiza quando muda (selecionar outra pedra não
 * redesenha a mão inteira). A selecionada brilha e anima o material; as em repouso
 * ficam em gradiente estático.
 */
const HandSlot = memo(function HandSlot({ tile, index, x, drop, angle, unit, selected, active, playable, discardMode, known, onSelectTile, press, rivalName }) {
  const power = selected && tile.a === tile.b && !discardMode;
  const handleClick = useCallback(() => onSelectTile(tile), [onSelectTile, tile]);
  return (
    <div
      data-hand-tile={tile.id}
      {...(tile.enhancement && press ? press({ kind: 'tile', tile }) : {})}
      className="hand-slot absolute"
      style={{
        left: `calc(50% + ${x - unit / 2}px)`,
        bottom: FAN_BASE,
        width: unit,
        height: unit * 2,
        zIndex: selected ? 30 : index + 1,
        // selecionada: sai do leque (-translate-y-6 scale-110), reta
        transform: selected ? `translateY(-${SELECT_LIFT}px) rotate(0deg) scale(1.1)` : `translateY(${drop}px) rotate(${angle}deg)`,
      }}
    >
      <div className={`hand-float ${selected ? 'hand-float-lifted' : ''}`} style={{ animationDelay: `${-index * 0.45}s` }}>
        <div className="animate-tile-in" style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}>
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
              // reflexo e material animado só na pedra selecionada (Patch 0.5.4: GPU do iPhone)
              shimmer={selected}
              still={!selected}
              playable={playable && !selected}
              dimmed={active && !playable}
              disabled={!active || !playable}
              // desabilitada não recebe toque: o toque longo cai no slot de baixo
              className={!active || !playable ? 'pointer-events-none' : ''}
              onClick={handleClick}
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
});

/** O leque da sua mão. Não depende de moedas, dica nem botões: muda só com a mão e a seleção. */
const HandFan = memo(function HandFan({ hand, selectedId, playableIds, isTurn, discardMode, knownIds, onSelectTile, press, rivalName }) {
  const [areaRef, width] = useWidth();
  const { unit, spots } = computeFan(hand.length, width);
  const active = isTurn || discardMode;
  return (
    <div ref={areaRef} data-tut="hand" className="relative mx-1" style={{ height: FAN_HEIGHT }}>
      {hand.map((tile, i) => {
        const spot = spots[i];
        if (!spot) return null;
        return (
          <HandSlot
            key={tile.id}
            tile={tile}
            index={i}
            x={spot.x}
            drop={spot.drop}
            angle={spot.angle}
            unit={unit}
            selected={tile.id === selectedId}
            active={active}
            playable={active && playableIds.has(tile.id)}
            discardMode={discardMode}
            known={Boolean(knownIds?.has(tile.id))}
            onSelectTile={onSelectTile}
            press={press}
            rivalName={rivalName}
          />
        );
      })}
      {hand.length === 0 && <p className="absolute inset-x-0 bottom-10 text-center font-term text-lg text-bone-300">Sem pedras.</p>}
    </div>
  );
});

const DISCARD_LABELS = { skip: 'PULAR', confirm: 'DESCARTAR' };

/**
 * COMPRAR · JOGAR · PASSAR A VEZ e a escada de compras. No modo de escolha de pedra os
 * botões viram PULAR · DESCARTAR (Giz) ou CANCELAR · VIRAR BUCHA (Canivete).
 */
const ActionBar = memo(function ActionBar({
  discardMode,
  pickLabels = DISCARD_LABELS,
  hasSelection,
  onSkipDiscard,
  onDiscard,
  canDraw,
  onDraw,
  draw,
  drawsThisTurn,
  selectedSides,
  onPlay,
  isTurn,
  canPass,
  passRule,
  onPass,
}) {
  return (
    <>
      {discardMode ? (
        <div className="grid grid-cols-[1fr_1.4fr] gap-2 px-3 pt-1.5">
          <button type="button" className="btn-pixel" onClick={onSkipDiscard}>
            {pickLabels.skip}
          </button>
          <button type="button" data-tone="brass" className="btn-pixel" disabled={!hasSelection} onClick={onDiscard}>
            {pickLabels.confirm}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-2 px-3 pt-1.5">
          <button type="button" data-tut="draw" className="btn-pixel flex flex-col items-center justify-center gap-1" disabled={!canDraw} onClick={onDraw}>
            <span>COMPRAR</span>
            <span className="text-[8px] text-bone-200">
              <DrawCost draw={draw} />
            </span>
            <span className="sr-only">{`Compra ${drawsThisTurn + 1} de 3 neste turno`}</span>
          </button>

          <div className="flex gap-2">
            {selectedSides.length > 0 ? (
              selectedSides.map((side) => (
                <button key={side} type="button" data-tone="play" data-tut-side={side} className="btn-pixel flex-1" onClick={() => onPlay(side)}>
                  {selectedSides.length === 1 ? (side === 'root' ? 'ABRIR MESA' : 'JOGAR') : SIDE_BUTTON[side]}
                </button>
              ))
            ) : (
              <div className="btn-placeholder flex flex-1 items-center justify-center text-center font-pixel text-[8px] leading-relaxed text-bone-400">
                {isTurn ? 'TOQUE NUMA PEDRA' : 'AGUARDE'}
              </div>
            )}
          </div>

          <button
            type="button"
            data-tone="blood"
            data-tut="pass"
            className="btn-pixel flex flex-col items-center justify-center"
            disabled={!canPass}
            onClick={onPass}
            aria-label={passButtonText(isTurn ? passRule : null)}
          >
            <PassLabel rule={isTurn ? passRule : null} />
          </button>
        </div>
      )}

      <div className="flex justify-center gap-1.5 pt-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`draw-step ${isTurn && i < drawsThisTurn ? 'draw-step-used' : ''}`} />
        ))}
      </div>
    </>
  );
});

/**
 * Mão do jogador em leque flutuante sobre o feltro, HUD (corações, moedas) e as
 * ações: comprar (escada grátis → $3 → 1 coração), jogar e passar a vez.
 * No modo descarte (Giz de Sinuca) qualquer pedra pode ser tocada e os botões
 * viram PULAR / DESCARTAR. Logo acima do leque fica a SUA hotbar de talismãs.
 * Segurar uma pedra aprimorada (ou um talismã) mostra o balão com o efeito.
 *
 * Patch 0.5.4: tudo em pedaços com React.memo (cabeçalho, hotbar, leque, cada pedra,
 * botões): mudar as moedas ou a dica não redesenha o leque.
 */
function PlayerRack({
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
  passRule = null,
  onPass,
  hearts,
  maxHearts,
  coins,
  endsSum = null,
  hint,
  discardMode = false,
  pickLabels = DISCARD_LABELS,
  onDiscard,
  onSkipDiscard,
  onSecretTap,
  relics = NONE,
  relicSlots,
  frame = null,
  relicFlashes,
  spentRelics,
  canUndo = false,
  onUndo,
  canCanivete = false,
  onCanivete,
  devUnlocked = false,
  onOpenDev,
  muted = false,
  onToggleMute,
  onOpenMenu,
  press,
  knownIds,
  rivalName = 'o rival',
}) {
  return (
    <section
      className={`player-hand relative z-20 shrink-0 ${isTurn ? 'player-hand-active' : ''} ${frame ? `player-frame player-frame-${frame}` : ''}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      aria-label="Sua mão"
    >
      <PlayerHud onSecretTap={onSecretTap} hearts={hearts} maxHearts={maxHearts} sum={endsSum} coins={coins} />

      <RelicRow
        relics={relics}
        relicSlots={relicSlots}
        relicFlashes={relicFlashes}
        spentRelics={spentRelics}
        canUndo={canUndo}
        onUndo={onUndo}
        canCanivete={canCanivete}
        onCanivete={onCanivete}
        devUnlocked={devUnlocked}
        onOpenDev={onOpenDev}
        muted={muted}
        onToggleMute={onToggleMute}
        onOpenMenu={onOpenMenu}
        press={press}
      />

      <HandFan
        hand={hand}
        selectedId={selectedId}
        playableIds={playableIds}
        isTurn={isTurn}
        discardMode={discardMode}
        knownIds={knownIds}
        onSelectTile={onSelectTile}
        press={press}
        rivalName={rivalName}
      />

      <p className="min-h-[20px] px-3 pt-1.5 text-center font-term text-[17px] leading-tight text-bone-200" aria-live="polite">
        {hint}
      </p>

      <ActionBar
        discardMode={discardMode}
        pickLabels={pickLabels}
        hasSelection={Boolean(selectedId)}
        onSkipDiscard={onSkipDiscard}
        onDiscard={onDiscard}
        canDraw={canDraw}
        onDraw={onDraw}
        draw={draw}
        drawsThisTurn={drawsThisTurn}
        selectedSides={selectedSides}
        onPlay={onPlay}
        isTurn={isTurn}
        canPass={canPass}
        passRule={passRule}
        onPass={onPass}
      />
    </section>
  );
}

export default memo(PlayerRack);
