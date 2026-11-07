import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { DEAL_STEP_MS, computeFan } from './handFan.js';
import Hotbar from './Hotbar.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import { TentoCap, TentosBar } from './TentoCap.jsx';
import { CoinGlyph, EyeGlyph, MenuGlyph } from './UiGlyphs.jsx';
import { prefersReducedMotion } from './motion.js';

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
  } else if (cost.type === 'tento') {
    // versão 2.7: na roda por tentos, a 3ª compra custa uma tampinha
    price = (
      <span className="inline-flex items-center gap-1 text-blood-400">
        <TentoCap size={10} />
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
      {draw.reason === 'tentos' && <span className="text-bone-400">· SEM TENTO</span>}
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
  // Sargento Brandão (versão 1.4): com pedra que encaixa, não passa
  if (rule.reason === 'mustPlay') return 'PASSAR A VEZ: TOQUE DE RECOLHER, JOGUE A PEDRA';
  if (rule.reason === 'mustDraw') return 'PASSAR A VEZ: COMPRE ANTES';
  if (rule.fiado) return 'PASSAR A VEZ (FIADO: DE GRAÇA)';
  return rule.cost > 0 ? `PASSAR A VEZ ($${rule.cost})` : 'PASSAR A VEZ';
}

/**
 * Seus talismãs, soltos no feltro no canto de baixo à esquerda (2 colunas), flutuando; quando
 * um dispara, ele treme. Os poderes prontos (Relógio, Canivete, Grampo) viram botões na fileira
 * das ações, e o toque no talismã que brilha também usa o poder.
 */
const RelicRow = memo(function RelicRow({ relics, relicSlots, relicFlashes, spentRelics, canUndo, onUndo, canCanivete = false, onCanivete, canGrampo = false, onGrampo, press }) {
  const ready = readyRelics(canUndo, canCanivete, canGrampo);
  const abilities = (canUndo ? 1 : 0) + (canCanivete ? 1 : 0) + (canGrampo ? 1 : 0);
  // o toque rápido no talismã que brilha também usa o poder (além do botão na fileira das ações)
  const tapRelic = useCallback(
    (id) => {
      if (id === 'relogio' && canUndo) onUndo();
      else if (id === 'canivete' && canCanivete) onCanivete();
      else if (id === 'grampo' && canGrampo) onGrampo();
    },
    [canUndo, canCanivete, canGrampo, onUndo, onCanivete, onGrampo],
  );
  return (
    <div className="relic-row player-relics">
      <Hotbar
        relics={relics}
        slots={relicSlots}
        cols={Math.min(2, Math.max(1, relicSlots))}
        size={26}
        flashes={relicFlashes}
        spent={spentRelics}
        ready={ready}
        press={press}
        onTap={abilities ? tapRelic : undefined}
        bare
        label="Seus talismãs"
      />
    </div>
  );
});

const NONE = [];
/** Talismãs com o poder pronto (o slot brilha): uma lista fixa para cada combinação (8). */
const READY = Object.freeze(
  Array.from({ length: 8 }, (_, i) => Object.freeze([i & 1 && 'relogio', i & 2 && 'canivete', i & 4 && 'grampo'].filter(Boolean))),
);
const readyRelics = (undo, canivete, grampo) => READY[(undo ? 1 : 0) + (canivete ? 2 : 0) + (grampo ? 4 : 0)];

/**
 * Versão 2.0: a pedra entra na mão saindo do dorme. As que montam juntas (a mão nova da rodada)
 * saem em cascata, uma a cada DEAL_STEP_MS; a que monta sozinha (a compra) sai na hora. O
 * caminho é medido no DOM antes de pintar (do centro da pilha até a vaga no leque) e vira as
 * variáveis da animação; sem dorme na tela, a pedra cai do alto como antes.
 */
const entryBatch = { at: 0, n: 0 };

function useEnterFromDorme(x, angle) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - entryBatch.at > 40) {
      entryBatch.at = now;
      entryBatch.n = 0;
    } else entryBatch.n += 1;
    const delay = Math.min(entryBatch.n, 9) * DEAL_STEP_MS;
    el.style.animationDelay = `${delay}ms`;
    const pile = document.querySelector('.boneyard-pile');
    if (!pile) {
      el.style.setProperty('--deal-x', `${-x}px`);
      el.style.setProperty('--deal-r', `${-angle}deg`);
      el.classList.add('animate-deal-fall');
      return;
    }
    const a = el.getBoundingClientRect();
    const b = pile.getBoundingClientRect();
    const dx = b.left + b.width * 0.35 - (a.left + a.width / 2);
    const dy = b.top + b.height * 0.45 - (a.top + a.height / 2);
    // a vaga está girada no leque: o caminho é desfeito da rotação dela
    const rad = (-angle * Math.PI) / 180;
    el.style.setProperty('--from-x', `${Math.round(dx * Math.cos(rad) - dy * Math.sin(rad))}px`);
    el.style.setProperty('--from-y', `${Math.round(dx * Math.sin(rad) + dy * Math.cos(rad))}px`);
    el.style.setProperty('--from-r', `${-angle + 90}deg`);
    el.classList.add('from-dorme');
    // a classe sai quando a animação acaba (se a pedra mudar de lugar no leque, não repete)
    const done = () => el.classList.remove('from-dorme');
    el.addEventListener('animationend', done, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na entrada da pedra
  }, []);
  return ref;
}

/** Mantém um elemento montado por `ms` depois de sumir, para ele sair animado. */
function usePresence(show, ms = 220) {
  const [state, setState] = useState(show ? 'in' : 'out');
  if (show && state !== 'in') setState('in');
  if (!show && state === 'in') setState('leaving');
  useEffect(() => {
    if (state !== 'leaving') return undefined;
    const timer = setTimeout(() => setState('out'), ms);
    return () => clearTimeout(timer);
  }, [state, ms]);
  return state;
}

/**
 * Uma pedra do leque. Só ela re-renderiza quando muda (selecionar outra pedra não
 * redesenha a mão inteira). A selecionada brilha e anima o material; as em repouso
 * ficam em gradiente estático.
 */
const HandSlot = memo(function HandSlot({ tile, index, x, drop, angle, unit, selected, active, playable, discardMode, known, onSelectTile, press, rivalName }) {
  const power = selected && tile.a === tile.b && !discardMode;
  const handleClick = useCallback(() => onSelectTile(tile), [onSelectTile, tile]);
  const enterRef = useEnterFromDorme(x, angle);
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
        {/* Versão 2.0: a pedra sai do dorme, virada, voa até o leque e desvira ao assentar (na
            mão nova, uma a cada 60 ms; na compra, só a comprada). Ver useEnterFromDorme. */}
        <div ref={enterRef} className="hand-enter">
          <span aria-hidden="true" className="deal-back" />
          {/* a key troca ao selecionar bucha: a tremidinha roda de novo a cada toque */}
          <div key={power ? 'power' : 'idle'} className={power ? 'animate-power-wiggle' : ''}>
            <DominoTile
              values={[tile.a, tile.b]}
              orientation="vertical"
              unit={unit}
              depth={6}
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
const HandFan = memo(function HandFan({ hand, selectedId, playableIds, isTurn, discardMode, knownIds, onSelectTile, press, rivalName, leaving = null, dealKey = '' }) {
  const [areaRef, width] = useWidth();
  // Versão 2.6: a pedra jogada continua na vaga dela (levantada, como estava) até a cópia do
  // voo levantar dali; só então o leque fecha o buraco. Antes ela sumia, piscava na mesa e
  // "voltava" para a mão no 1º quadro do voo.
  const [order, setOrder] = useState(() => hand.map((t) => t.id));
  let shown = hand;
  if (leaving && !hand.some((t) => t.id === leaving.id)) {
    const at = order.indexOf(leaving.id);
    shown = [...hand];
    shown.splice(at >= 0 ? Math.min(at, hand.length) : hand.length, 0, leaving);
  }
  const shownKey = shown.map((t) => t.id).join(',');
  if (order.join(',') !== shownKey) setOrder(shown.map((t) => t.id));
  const { unit, spots } = computeFan(shown.length, width);
  const active = isTurn || discardMode;
  return (
    <div ref={areaRef} data-tut="hand" className="relative mx-1" style={{ height: FAN_HEIGHT }}>
      {shown.map((tile, i) => {
        const spot = spots[i];
        if (!spot) return null;
        const going = leaving?.id === tile.id;
        return (
          <HandSlot
            key={`${dealKey}:${tile.id}`}
            tile={tile}
            index={i}
            x={spot.x}
            drop={spot.drop}
            angle={spot.angle}
            unit={unit}
            selected={going || tile.id === selectedId}
            active={active}
            playable={!going && active && playableIds.has(tile.id)}
            discardMode={discardMode}
            known={Boolean(knownIds?.has(tile.id))}
            onSelectTile={onSelectTile}
            press={press}
            rivalName={rivalName}
          />
        );
      })}
      {shown.length === 0 && <p className="absolute inset-x-0 bottom-10 text-center font-term text-lg text-bone-300">Sem pedras.</p>}
    </div>
  );
});

const DISCARD_LABELS = { skip: 'PULAR', confirm: 'DESCARTAR' };

/**
 * Versão 2.0: sem barra de botões. Joga-se tocando na pedra e depois na ponta da mesa; comprar
 * é tocar no dorme. Versão 2.1: os botões só sobem (animados) quando você não tem jogada:
 * COMPRAR enquanto der para comprar, PASSAR só depois da 1ª compra (ou se o dorme não deixar
 * comprar). No modo de escolha (Giz, Canivete, Grampo) sobem as duas fichas da escolha; os
 * poderes prontos dos talismãs aparecem aqui também.
 */
const ActionChips = memo(function ActionChips({
  discardMode,
  pickLabels = DISCARD_LABELS,
  hasSelection,
  onSkipDiscard,
  onDiscard,
  showDraw,
  canDraw,
  onDraw,
  draw,
  drawsThisTurn,
  showPass,
  canPass,
  passRule,
  onPass,
  canUndo = false,
  onUndo,
  canCanivete = false,
  onCanivete,
  canGrampo = false,
  onGrampo,
}) {
  const drawState = usePresence(showDraw);
  const passState = usePresence(showPass);
  if (discardMode) {
    return (
      <div className="action-chips">
        <button type="button" className="btn-pixel btn-chip chip-in" onClick={onSkipDiscard}>
          {pickLabels.skip}
        </button>
        <button type="button" data-tone="brass" className="btn-pixel btn-chip chip-in" disabled={!hasSelection} onClick={onDiscard}>
          {pickLabels.confirm}
        </button>
      </div>
    );
  }
  return (
    <div className="action-chips">
      {drawState !== 'out' && (
        <button
          type="button"
          data-tut="draw"
          className={`btn-pixel btn-chip btn-urge chip-${drawState}`}
          disabled={!canDraw || drawState === 'leaving'}
          onClick={onDraw}
        >
          <span className="chip-title">COMPRAR</span>
          <span className="chip-cost">
            <DrawCost draw={draw} />
          </span>
          <span className="sr-only">{`Compra ${drawsThisTurn + 1} de 3 neste turno`}</span>
        </button>
      )}
      {passState !== 'out' && (
        <button
          type="button"
          data-tone="blood"
          data-tut="pass"
          className={`btn-pixel btn-chip chip-${passState} ${showDraw ? '' : 'btn-urge'}`}
          disabled={!canPass || passState === 'leaving'}
          onClick={onPass}
          aria-label={passButtonText(passRule)}
        >
          <span className="chip-title">PASSAR</span>
          <span className="chip-cost">{passRule?.fiado ? 'FIADO' : passRule?.cost > 0 ? `$${passRule.cost}` : 'A VEZ'}</span>
        </button>
      )}
      {canUndo && (
        <button type="button" data-tone="brass" className="btn-pixel btn-chip btn-chip-mini chip-in relic-ability" onClick={onUndo}>
          DESFAZER
        </button>
      )}
      {canCanivete && (
        <button type="button" data-tone="brass" className="btn-pixel btn-chip btn-chip-mini chip-in relic-ability" onClick={onCanivete} aria-label="Canivete: virar uma pedra da mão em bucha">
          CANIVETE
        </button>
      )}
      {canGrampo && (
        <button type="button" data-tone="brass" className="btn-pixel btn-chip btn-chip-mini chip-in relic-ability" onClick={onGrampo} aria-label="Grampo: esconder uma bucha no fundo do dorme">
          GRAMPO
        </button>
      )}
    </div>
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
  canGrampo = false,
  onGrampo,
  devUnlocked = false,
  onOpenDev,
  onOpenMenu,
  press,
  knownIds,
  rivalName = 'o rival',
  onZoneHeight,
  tutorialAction = null,
  tutorialFocus = null,
  leaving = null,
  dealKey = '',
  tentos = null,
}) {
  // Versão 2.0: a faixa da mão fica deitada na mesa (por cima do feltro); a mesa precisa saber
  // a altura dela para as pedras do jogo não entrarem embaixo do leque
  const zoneRef = useRef(null);
  useLayoutEffect(() => {
    const el = zoneRef.current;
    if (!el || !onZoneHeight) return undefined;
    onZoneHeight(Math.round(el.getBoundingClientRect().height));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => onZoneHeight(Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [onZoneHeight]);
  const noPlay = playableIds.size === 0;
  const myTurn = isTurn && !discardMode;
  // sem jogada: COMPRAR enquanto der; PASSAR só depois de comprar (ou sem compra possível).
  // No treino, o botão que a aula aponta aparece mesmo apagado (o anel da aula precisa dele).
  const showDraw = myTurn && ((canDraw && (noPlay || tutorialAction === 'draw')) || tutorialFocus === 'draw');
  const showPass =
    myTurn && ((canPass && (noPlay || tutorialAction === 'pass') && (drawsThisTurn > 0 || !canDraw || tutorialAction === 'pass')) || tutorialFocus === 'pass');
  return (
    <section
      ref={zoneRef}
      className={`player-zone absolute inset-x-0 bottom-0 z-20 ${isTurn ? 'is-turn' : ''} ${frame ? `player-frame player-frame-${frame}` : ''}`}
      aria-label="Sua mão"
    >
      <p className="player-hint font-term" aria-live="polite">
        {hint}
      </p>

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
        leaving={leaving}
        dealKey={dealKey}
      />

      {/* a fileira das ações: os botões só sobem quando são o caminho */}
      <div className="player-actions">
        <ActionChips
          discardMode={discardMode}
          pickLabels={pickLabels}
          hasSelection={Boolean(selectedId)}
          onSkipDiscard={onSkipDiscard}
          onDiscard={onDiscard}
          showDraw={showDraw}
          canDraw={canDraw}
          onDraw={onDraw}
          draw={draw}
          drawsThisTurn={drawsThisTurn}
          showPass={showPass}
          canPass={canPass}
          passRule={passRule}
          onPass={onPass}
          canUndo={canUndo}
          onUndo={onUndo}
          canCanivete={canCanivete}
          onCanivete={onCanivete}
          canGrampo={canGrampo}
          onGrampo={onGrampo}
        />
      </div>

      {/* a vida no meio, grande e solta no feltro, pulsando como LED; o dinheiro logo embaixo */}
      <div className="player-life-row">
        <button
          type="button"
          className={`player-life ${!tentos && hearts <= 2 ? 'is-low' : ''} ${tentos ? 'is-tentos' : ''}`}
          onClick={onSecretTap}
          aria-label={tentos ? `Você: ${tentos.current} de ${tentos.max} tentos` : `Você: ${hearts} de ${maxHearts} corações`}
        >
          <span data-tut="hearts" className="life-hearts">
            {/* versão 2.7: na roda por tentos, as tampinhas amassadas no lugar dos corações */}
            {tentos ? (
              <TentosBar current={tentos.current} max={tentos.max} size={tentos.max <= 5 ? 24 : 19} label={`Você: ${tentos.current} de ${tentos.max} tentos`} />
            ) : (
              <HeartsBar current={hearts} max={maxHearts} pixel={maxHearts <= 6 ? 3 : 2} label={`Você: ${hearts} de ${maxHearts} corações`} />
            )}
          </span>
        </button>
      </div>
      <div className="player-coins-row">
        <span className="coins-led">
          <CoinCount value={coins} target="player" className="player-coins" />
        </span>
      </div>

      <RelicRow
        relics={relics}
        relicSlots={relicSlots}
        relicFlashes={relicFlashes}
        spentRelics={spentRelics}
        canUndo={canUndo}
        onUndo={onUndo}
        canCanivete={canCanivete}
        onCanivete={onCanivete}
        canGrampo={canGrampo}
        onGrampo={onGrampo}
        press={press}
      />

      {/* o canto: o menu (e o atalho do DEV em cima dele) */}
      <div className="player-corner">
        {devUnlocked && (
          <button type="button" className="dev-chip" onClick={onOpenDev} aria-label="Abrir painel de testes">
            DEV
          </button>
        )}
        {onOpenMenu && (
          <button type="button" onClick={onOpenMenu} className="icon-btn hud-icon player-menu" aria-label="Menu">
            <MenuGlyph size={18} />
          </button>
        )}
      </div>
    </section>
  );
}

export default memo(PlayerRack);
