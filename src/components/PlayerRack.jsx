import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { DEAL_STEP_MS, computeFan } from './handFan.js';
import Hotbar from './Hotbar.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
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
  // Sargento Brandão (versão 1.4): com pedra que encaixa, não passa
  if (rule.reason === 'mustPlay') return 'PASSAR A VEZ: TOQUE DE RECOLHER, JOGUE A PEDRA';
  if (rule.reason === 'mustDraw') return 'PASSAR A VEZ: COMPRE ANTES';
  if (rule.fiado) return 'PASSAR A VEZ (FIADO: DE GRAÇA)';
  return rule.cost > 0 ? `PASSAR A VEZ ($${rule.cost})` : 'PASSAR A VEZ';
}

/**
 * Versão 1.4: a linha de talismãs desce degraus até caber, direto no DOM e antes de pintar
 * (data-fit, estilos em index.css): 0 rótulos inteiros · 1 rótulos curtos e botões menores ·
 * 2 sem os botões dos poderes (o talismã que brilha vira o botão). Sem estado do React: medir
 * e trocar o degrau não re-renderiza nada.
 */
function fitRelicRow(row) {
  for (const step of ['0', '1', '2']) {
    row.dataset.fit = step;
    if (row.scrollWidth <= row.clientWidth + 1) return;
  }
}

/**
 * Sua hotbar de talismãs, o DESFAZER do Relógio e o atalho do DEV. Versão 2.0: os talismãs
 * ficam soltos no feltro, logo acima do leque; o menu desceu para o canto de baixo e o som
 * mora nas opções do menu.
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
  canGrampo = false,
  onGrampo,
  devUnlocked,
  onOpenDev,
  press,
}) {
  const ready = readyRelics(canUndo, canCanivete, canGrampo);
  const abilities = (canUndo ? 1 : 0) + (canCanivete ? 1 : 0) + (canGrampo ? 1 : 0);
  // Versão 1.4: os botões dos poderes tentam caber na linha (ver fitRelicRow). O toque rápido
  // no talismã que brilha também usa o poder, e é o caminho quando os botões não cabem.
  const rowRef = useRef(null);
  const fitKey = `${ready.join(',')}|${relics.length}|${relicSlots}|${devUnlocked ? 1 : 0}`;
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    fitRelicRow(row);
    if (typeof ResizeObserver === 'undefined') return undefined;
    let width = row.clientWidth;
    const observer = new ResizeObserver(() => {
      if (row.clientWidth === width) return;
      width = row.clientWidth;
      fitRelicRow(row);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [fitKey]);
  const tapRelic = useCallback(
    (id) => {
      if (id === 'relogio' && canUndo) onUndo();
      else if (id === 'canivete' && canCanivete) onCanivete();
      else if (id === 'grampo' && canGrampo) onGrampo();
    },
    [canUndo, canCanivete, canGrampo, onUndo, onCanivete, onGrampo],
  );
  return (
    <div ref={rowRef} className="relic-row flex h-[34px] items-center gap-2 px-3 pt-1">
      <Hotbar
        relics={relics}
        slots={relicSlots}
        size={30}
        flashes={relicFlashes}
        spent={spentRelics}
        ready={ready}
        press={press}
        onTap={abilities ? tapRelic : undefined}
        bare
        label="Seus talismãs"
      />
      <div className="relic-row-tools ml-auto flex items-center gap-2">
        {canUndo && (
          <button type="button" data-tone="brass" className="btn-pixel btn-mini relic-ability" onClick={onUndo}>
            <span className="lbl-full">DESFAZER</span>
            <span className="lbl-short">VOLTAR</span>
          </button>
        )}
        {canCanivete && (
          <button type="button" data-tone="brass" className="btn-pixel btn-mini relic-ability" onClick={onCanivete} aria-label="Canivete: virar uma pedra da mão em bucha">
            CANIVETE
          </button>
        )}
        {canGrampo && (
          <button type="button" data-tone="brass" className="btn-pixel btn-mini relic-ability" onClick={onGrampo} aria-label="Grampo: esconder uma bucha no fundo do dorme">
            GRAMPO
          </button>
        )}
        {devUnlocked && (
          <button type="button" className="dev-chip" onClick={onOpenDev} aria-label="Abrir painel de testes">
            DEV
          </button>
        )}
      </div>
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
 * Versão 2.0: sem barra de botões. Joga-se tocando na pedra e depois na ponta da mesa; comprar
 * é tocar no dorme. As fichas de COMPRAR e PASSAR só sobem (animadas) quando são o caminho:
 * sem pedra que encaixe, a de comprar; sem compra possível, a de passar. O passe estratégico
 * (dava para jogar e você prefere passar, pagando) fica num risco de giz discreto. No modo de
 * escolha (Giz, Canivete, Grampo) sobem as duas fichas da escolha.
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
  strategicPass,
  canPass,
  passRule,
  onPass,
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
      {strategicPass && passState === 'out' && drawState === 'out' && (
        <button type="button" data-tut="pass" className="pass-link font-term" disabled={!canPass} onClick={onPass} aria-label={passButtonText(passRule)}>
          passar · {passRule?.fiado ? 'fiado' : passRule?.cost > 0 ? `$${passRule.cost}` : 'grátis'}
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
  // no treino, a ficha que a aula aponta aparece mesmo apagada (o anel da aula precisa dela)
  const showDraw = myTurn && ((canDraw && (noPlay || tutorialAction === 'draw')) || tutorialFocus === 'draw');
  const showPass = myTurn && ((canPass && (noPlay || tutorialAction === 'pass')) || (tutorialFocus === 'pass' && noPlay));
  const strategicPass = myTurn && ((canPass && !noPlay && tutorialAction !== 'pass') || (tutorialFocus === 'pass' && !noPlay));
  return (
    <section
      ref={zoneRef}
      className={`player-zone absolute inset-x-0 bottom-0 z-20 ${isTurn ? 'is-turn' : ''} ${frame ? `player-frame player-frame-${frame}` : ''}`}
      aria-label="Sua mão"
    >
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
        devUnlocked={devUnlocked}
        onOpenDev={onOpenDev}
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

      <p className="player-hint font-term" aria-live="polite">
        {hint}
      </p>

      {/* o pé da mesa: corações e dinheiro à esquerda, as fichas que sobem no meio, o menu à direita */}
      <div className="player-bar">
        {/* Versão 2.0: a vida grande, solta no feltro (sem tábua atrás); com 1 ou 2 corações ela pulsa */}
        <button
          type="button"
          className={`player-life ${hearts <= 2 ? 'is-low' : ''}`}
          onClick={onSecretTap}
          aria-label={`Você: ${hearts} de ${maxHearts} corações`}
        >
          <span data-tut="hearts" className="life-hearts">
            <HeartsBar current={hearts} max={maxHearts} pixel={maxHearts <= 6 ? 3 : 2} label={`Você: ${hearts} de ${maxHearts} corações`} />
          </span>
        </button>
        <CoinCount value={coins} target="player" className="player-coins" />
        <div className="player-bar-mid">
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
            strategicPass={strategicPass}
            canPass={canPass}
            passRule={passRule}
            onPass={onPass}
          />
        </div>
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
