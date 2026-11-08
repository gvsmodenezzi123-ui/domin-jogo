import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { DEAL_STEP_MS, arrangeHand, computeFan, dropIndex, spreadOffset } from './handFan.js';
import Hotbar from './Hotbar.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import { TentoCap, TentosBar } from './TentoCap.jsx';
import { CoinGlyph, EyeGlyph, MenuGlyph } from './UiGlyphs.jsx';
import { prefersReducedMotion } from './motion.js';
import PixelCanvas from './PixelCanvas.jsx';
import { paintPlank, paintRoundButton } from './art/hudPixels.js';

/** Altura da área do leque (px). */
const FAN_HEIGHT = 150;
/** Distância da base do leque até o rodapé (as pedras das pontas descem até aqui). */
const FAN_BASE = 26;
/** Quanto a pedra selecionada sobe para fora do leque (-translate-y-6). */
/** Versão 2.8: a pedra tocada sobe 16 px e cresce 8% (inclinando um tico para o lado dela). */
const SELECT_LIFT = 16;

/**
 * Versão 2.9, a mesa deitada: o leque acompanha a altura da tela (as pedras da mão têm ~10%
 * dela), fica no meio entre as colunas dos lados e desce até quase o pé da tela.
 */
const landFan = (h) => {
  const unit = Math.max(28, Math.min(46, Math.round((h || 390) * 0.088)));
  return { unit, height: unit * 2 + 30, base: 8 };
};
/** A tábua dos botões táticos (pixels da pintura, ampliada 3×). */
const PLANK_PX = { w: 42, h: 15 };

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
const RelicRow = memo(function RelicRow({ relics, relicSlots, relicFlashes, spentRelics, canUndo, onUndo, canCanivete = false, onCanivete, canGrampo = false, onGrampo, press, vertical = false }) {
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
      {vertical ? (
        <Hotbar
          relics={relics}
          slots={relicSlots}
          cols={1}
          size={36}
          flashes={relicFlashes}
          spent={spentRelics}
          ready={ready}
          press={press}
          onTap={abilities ? tapRelic : undefined}
          niche
          label="Seus talismãs"
        />
      ) : (
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
      )}
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
 * Versão 2.12.1: o leque é vivo. A pedra tocada (ou com o mouse em cima) sobe um tico e as
 * vizinhas abrem espaço; arrastando para o lado, a pedra segue o dedo, balança com o embalo e
 * as outras deslizam para dar lugar (é só a arrumação da mão: a regra não muda).
 */
const HandSlot = memo(function HandSlot({
  tile,
  index,
  x,
  drop,
  angle,
  unit,
  base = FAN_BASE,
  selected,
  active,
  playable,
  discardMode,
  known,
  onSelectTile,
  press,
  rivalName,
  spread = 0,
  lifted = false,
  dragging = false,
  tilt = 0,
  onGrab,
  onHover,
}) {
  const power = selected && tile.a === tile.b && !discardMode;
  const handleClick = useCallback(() => onSelectTile(tile), [onSelectTile, tile]);
  const enterRef = useEnterFromDorme(x, angle);
  const pressProps = tile.enhancement && press ? press({ kind: 'tile', tile }) : null;
  const lift = dragging ? SELECT_LIFT + 6 : selected ? SELECT_LIFT : lifted ? 7 : 0;
  const px = x + spread;
  let transform = `translateX(${px}px) translateY(${drop}px) rotate(${angle}deg)`;
  if (dragging) transform = `translateX(${px}px) translateY(-${lift}px) rotate(${tilt.toFixed(2)}deg) scale(1.1)`;
  else if (selected) transform = `translateX(${px}px) translateY(-${lift}px) rotate(${(angle * 0.3).toFixed(2)}deg) scale(1.08)`;
  else if (lifted) transform = `translateX(${px}px) translateY(${drop - lift}px) rotate(${(angle * 0.6).toFixed(2)}deg) scale(1.03)`;
  return (
    <div
      data-hand-tile={tile.id}
      {...(pressProps ?? {})}
      onPointerDown={(event) => {
        pressProps?.onPointerDown?.(event);
        onGrab?.(event, tile.id, pressProps?.onPointerCancel);
      }}
      onPointerEnter={(event) => event.pointerType === 'mouse' && onHover?.(tile.id)}
      onPointerLeave={(event) => {
        pressProps?.onPointerLeave?.(event);
        if (event.pointerType === 'mouse') onHover?.(null);
      }}
      className={`hand-slot absolute ${dragging ? 'is-dragging' : ''}`}
      style={{
        // versão 2.8: a vaga anda por transform (não por `left`): quando uma pedra sai, as outras
        // deslizam até fechar o vão, na GPU
        left: `calc(50% - ${unit / 2}px)`,
        bottom: base,
        width: unit,
        height: unit * 2,
        zIndex: dragging ? 40 : selected ? 30 : lifted ? 25 : index + 1,
        transform,
      }}
    >
      <div className={`hand-float ${selected || dragging ? 'hand-float-lifted' : ''}`} style={{ animationDelay: `${-index * 0.45}s` }}>
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
              depth={4}
              selected={selected}
              power={power}
              enhancement={tile.enhancement}
              // reflexo e material animado só na pedra selecionada (Patch 0.5.4: GPU do iPhone)
              shimmer={selected}
              still={!selected && !dragging}
              playable={playable && !selected}
              dimmed={active && !playable && !dragging}
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

/** Quanto o dedo precisa andar para o lado (px) até virar arrasto (antes disso é toque). */
const DRAG_START = 9;

/**
 * Versão 2.12.1: arrastar uma pedra do leque para o lado muda a ordem dela na mão. A ordem fica
 * só na tela (por rodada); o motor do jogo não muda. Devolve o que o leque precisa desenhar.
 */
function useHandArrange({ hand, dealKey, areaRef }) {
  const [arranged, setArranged] = useState({ key: dealKey, ids: [] });
  const [drag, setDrag] = useState(null);
  const [touched, setTouched] = useState(null);
  const grab = useRef(null);
  const pref = arranged.key === dealKey ? arranged.ids : null;
  const ordered = useMemo(() => arrangeHand(hand, pref), [hand, pref]);
  // a ordem que a tela está mostrando durante o arrasto (o leque calcula; soltar grava)
  const dragOrder = useRef(null);
  useEffect(() => {
    if (drag?.order) dragOrder.current = drag.order;
  }, [drag]);

  const end = useCallback(() => {
    const g = grab.current;
    grab.current = null;
    setTouched(null);
    if (!g) return;
    window.removeEventListener('pointermove', g.move);
    window.removeEventListener('pointerup', g.up);
    window.removeEventListener('pointercancel', g.cancel);
    clearTimeout(g.settle);
  }, []);

  useEffect(() => end, [end]);

  const onGrab = useCallback(
    (event, id, cancelPress) => {
      if (event.button > 0 || grab.current) return;
      const area = areaRef.current;
      const scale = area && area.offsetWidth ? area.getBoundingClientRect().width / area.offsetWidth || 1 : 1;
      const g = { id, x0: event.clientX, y0: event.clientY, pointerId: event.pointerId, started: false, cancelPress, el: event.currentTarget, scale, lastX: event.clientX, lastT: performance.now(), tilt: 0 };
      grab.current = g;
      setTouched(id);
      g.move = (e) => {
        if (e.pointerId !== g.pointerId) return;
        const dx = (e.clientX - g.x0) / g.scale;
        const dy = (e.clientY - g.y0) / g.scale;
        if (!g.started) {
          if (Math.abs(dx) < DRAG_START || Math.abs(dx) < Math.abs(dy) * 1.1) return;
          g.started = true;
          g.cancelPress?.();
          try {
            g.el.setPointerCapture?.(g.pointerId);
          } catch {
            /* sem captura: o arrasto segue pelo window */
          }
          navigator.vibrate?.(6);
        }
        const now = performance.now();
        const vx = (e.clientX - g.lastX) / Math.max(8, now - g.lastT);
        g.lastX = e.clientX;
        g.lastT = now;
        // a pedra balança para o lado contrário do embalo (como pendurada pelo dedo)
        g.tilt = Math.max(-16, Math.min(16, g.tilt * 0.5 + vx * 9));
        setDrag({ id: g.id, dx, tilt: g.tilt });
        clearTimeout(g.settle);
        g.settle = setTimeout(() => {
          if (!grab.current?.started) return;
          g.tilt = 0;
          setDrag((d) => (d ? { ...d, tilt: 0 } : d));
        }, 90);
      };
      g.up = (e) => {
        if (e.pointerId !== g.pointerId) return;
        if (g.started) {
          // o clique que vem depois de soltar não seleciona a pedra
          const swallow = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
          };
          window.addEventListener('click', swallow, { capture: true, once: true });
          setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 320);
          if (dragOrder.current) setArranged({ key: dealKey, ids: dragOrder.current });
          dragOrder.current = null;
          setDrag(null);
        }
        end();
      };
      g.cancel = (e) => {
        if (e.pointerId !== g.pointerId) return;
        dragOrder.current = null;
        setDrag(null);
        end();
      };
      window.addEventListener('pointermove', g.move);
      window.addEventListener('pointerup', g.up);
      window.addEventListener('pointercancel', g.cancel);
    },
    [areaRef, dealKey, end],
  );

  return { ordered, drag, setDrag, touched, onGrab };
}

/** O leque da sua mão. Não depende de moedas, dica nem botões: muda só com a mão e a seleção. */
const HandFan = memo(function HandFan({ hand, selectedId, playableIds, isTurn, discardMode, knownIds, onSelectTile, press, rivalName, leaving = null, dealKey = '', fan = null }) {
  const [areaRef, width] = useWidth();
  const [hover, setHover] = useState(null);
  // o leque é desenhado na ordem em que você arrumou a mão (arrastando)
  const count = hand.length + (leaving && !hand.some((t) => t.id === leaving.id) ? 1 : 0);
  // (2.9: deitada, as pedras seguem a altura da tela e o arco é mais raso)
  const { unit, spots } = computeFan(count, width, fan ? { baseUnit: fan.unit, minUnit: Math.round(fan.unit * 0.74), angle: 16, drop: 14 } : undefined);
  const { ordered, drag, setDrag, touched, onGrab } = useHandArrange({ hand, dealKey, areaRef });
  // Versão 2.6: a pedra jogada continua na vaga dela (levantada, como estava) até a cópia do
  // voo levantar dali; só então o leque fecha o buraco. Antes ela sumia, piscava na mesa e
  // "voltava" para a mão no 1º quadro do voo.
  const [order, setOrder] = useState(() => ordered.map((t) => t.id));
  let shown = ordered;
  if (leaving && !hand.some((t) => t.id === leaving.id)) {
    const at = order.indexOf(leaving.id);
    shown = [...ordered];
    shown.splice(at >= 0 ? Math.min(at, ordered.length) : ordered.length, 0, leaving);
  }
  const shownKey = shown.map((t) => t.id).join(',');
  if (order.join(',') !== shownKey) setOrder(shown.map((t) => t.id));

  // arrastando: a pedra segue o dedo e a ordem da tela já mostra onde ela vai cair
  let display = shown;
  let dragX = 0;
  if (drag) {
    const from = shown.findIndex((t) => t.id === drag.id);
    if (from >= 0 && spots[from]) {
      const xs = spots.map((sp) => sp.x);
      dragX = Math.max(xs[0] - unit * 0.4, Math.min(xs[xs.length - 1] + unit * 0.4, spots[from].x + drag.dx));
      const target = dropIndex(xs, dragX);
      display = shown.filter((t) => t.id !== drag.id);
      display.splice(target, 0, shown[from]);
      const ids = display.map((t) => t.id);
      if (drag.order?.join(',') !== ids.join(',')) setDrag({ ...drag, order: ids });
    }
  }
  const focusId = drag ? drag.id : (touched ?? hover);
  const focus = display.findIndex((t) => t.id === focusId);
  const selectedAt = display.findIndex((t) => t.id === selectedId);
  const active = isTurn || discardMode;
  return (
    <div ref={areaRef} data-tut="hand" className="hand-fan relative mx-1" style={{ height: fan ? fan.height : FAN_HEIGHT }}>
      {display.map((tile, i) => {
        const spot = spots[i];
        if (!spot) return null;
        const going = leaving?.id === tile.id;
        const dragging = drag?.id === tile.id;
        // as vizinhas abrem espaço para a pedra tocada/arrastada (e um tico para a selecionada)
        const spread = dragging ? 0 : focus >= 0 ? spreadOffset(i, focus, unit, 0.26) : selectedAt >= 0 ? spreadOffset(i, selectedAt, unit, 0.14) : 0;
        return (
          <HandSlot
            key={`${dealKey}:${tile.id}`}
            tile={tile}
            index={i}
            x={dragging ? dragX : spot.x}
            drop={spot.drop}
            angle={spot.angle}
            unit={unit}
            base={fan ? fan.base : FAN_BASE}
            selected={going || tile.id === selectedId}
            active={active}
            playable={!going && active && playableIds.has(tile.id)}
            discardMode={discardMode}
            known={Boolean(knownIds?.has(tile.id))}
            onSelectTile={onSelectTile}
            press={press}
            rivalName={rivalName}
            spread={spread}
            lifted={!dragging && tile.id === focusId && tile.id !== selectedId}
            dragging={dragging}
            tilt={dragging ? drag.tilt : 0}
            onGrab={going ? undefined : onGrab}
            onHover={setHover}
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

/** A tábua pintada atrás do texto de um botão tático. */
function PlankArt({ tone }) {
  return (
    <PixelCanvas
      cacheKey={`tabua-${tone}`}
      paint={() => paintPlank(PLANK_PX.w, PLANK_PX.h, { tone, seed: tone === 'sangue' ? 23 : 11 })}
      w={PLANK_PX.w}
      h={PLANK_PX.h}
      scale={1}
      className="tac-plank-px"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

/**
 * Versão 2.9: os botões táticos da mesa deitada (o desenho de referência), com o MENU redondo
 * no canto de baixo à esquerda. Versão 2.11: as tábuas moram no canto de baixo à direita: a
 * COMPRAR (com o preço da compra) sempre no lugar, acendendo quando é o caminho, e a PASSAR VEZ
 * só aparece em cima dela depois da compra (as mesmas regras das fichas da mesa em pé). No modo
 * de escolha (Giz, Canivete, Grampo) viram PULAR (embaixo) e a confirmação (em cima); os poderes
 * prontos dos talismãs sobem em fichas em cima das tábuas.
 */
const TacticalPlanks = memo(function TacticalPlanks({
  discardMode,
  pickLabels = DISCARD_LABELS,
  hasSelection,
  onSkipDiscard,
  onDiscard,
  showDraw,
  canDraw,
  onDraw,
  draw,
  myTurn,
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
  onOpenMenu,
  devUnlocked = false,
  onOpenDev,
}) {
  const drawOn = discardMode || (showDraw && canDraw);
  const passOn = discardMode ? hasSelection : showPass && canPass;
  // versão 2.11: as duas tábuas no canto de baixo à direita: COMPRAR sempre no lugar e o PASSAR
  // VEZ só aparece (em cima dela) depois da compra, quando passar é o caminho
  const passShown = discardMode || passOn;
  return (
    <>
      <div className="tac-corner tac-left">
        {onOpenMenu && (
          <button type="button" onClick={onOpenMenu} className="tac-menu" aria-label="Menu">
            <PixelCanvas cacheKey="botao-menu" paint={() => paintRoundButton(15)} w={15} h={16} scale={1} className="tac-menu-px" style={{ width: '100%', height: '100%' }} />
            <MenuGlyph size={16} />
          </button>
        )}
        {devUnlocked && (
          <button type="button" className="dev-chip tac-dev" onClick={onOpenDev} aria-label="Abrir painel de testes">
            DEV
          </button>
        )}
      </div>
      <div className="tac-corner tac-right">
        {(canUndo || canCanivete || canGrampo) && !discardMode && (
          <div className="tac-abilities">
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
        )}
        {passShown && (
          <button
            type="button"
            data-tut={discardMode ? undefined : 'pass'}
            className={`tac-plank tac-plank-blood tac-pass-in ${passOn ? 'is-on' : ''}`}
            disabled={!passOn}
            onClick={discardMode ? onDiscard : onPass}
            aria-label={discardMode ? pickLabels.confirm : passButtonText(passRule)}
          >
            <PlankArt tone="sangue" />
            <span className="tac-title font-pixel">{discardMode ? pickLabels.confirm : 'PASSAR VEZ'}</span>
            {!discardMode && myTurn && passRule && (passRule.fiado || passRule.cost > 0) && (
              <span className="tac-cost font-pixel">{passRule.fiado ? 'FIADO' : `$${passRule.cost}`}</span>
            )}
          </button>
        )}
        <button
          type="button"
          data-tut={discardMode ? undefined : 'draw'}
          className={`tac-plank ${drawOn ? 'is-on' : ''}`}
          disabled={!drawOn}
          onClick={discardMode ? onSkipDiscard : onDraw}
        >
          <PlankArt tone="pinho" />
          <span className="tac-title font-pixel">{discardMode ? pickLabels.skip : 'COMPRAR'}</span>
          {!discardMode && myTurn && (
            <span className="tac-cost font-pixel">
              <DrawCost draw={draw} />
            </span>
          )}
        </button>
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
  // versão 2.9: a mesa deitada (o leque no meio de baixo, as tábuas nas pontas)
  landscape = false,
}) {
  // Versão 2.0: a faixa da mão fica deitada na mesa (por cima do feltro); a mesa precisa saber
  // a altura dela para as pedras do jogo não entrarem embaixo do leque
  // (2.9: deitada, a zona cobre a cena inteira; quem conta é só a faixa do leque)
  const zoneRef = useRef(null);
  useLayoutEffect(() => {
    const el = zoneRef.current;
    if (!el || !onZoneHeight) return undefined;
    onZoneHeight(Math.round(el.getBoundingClientRect().height));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => onZoneHeight(Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [onZoneHeight, landscape]);
  // deitada, a altura da cena decide o tamanho das pedras do leque
  const sceneRef = useRef(null);
  const [sceneH, setSceneH] = useState(0);
  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setSceneH(Math.round(entry.contentRect.height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [landscape]);
  const fan = landscape ? landFan(sceneH) : null;
  const noPlay = playableIds.size === 0;
  const myTurn = isTurn && !discardMode;
  // sem jogada: COMPRAR enquanto der; PASSAR só depois de comprar (ou sem compra possível).
  // No treino, o botão que a aula aponta aparece mesmo apagado (o anel da aula precisa dele).
  const showDraw = myTurn && ((canDraw && (noPlay || tutorialAction === 'draw')) || tutorialFocus === 'draw');
  const showPass =
    myTurn && ((canPass && (noPlay || tutorialAction === 'pass') && (drawsThisTurn > 0 || !canDraw || tutorialAction === 'pass')) || tutorialFocus === 'pass');
  const life = (
    <button
      type="button"
      className={`player-life ${!tentos && hearts <= 2 ? 'is-low' : ''} ${tentos ? 'is-tentos' : ''}`}
      onClick={onSecretTap}
      aria-label={tentos ? `Você: ${tentos.current} de ${tentos.max} tentos` : `Você: ${hearts} de ${maxHearts} corações`}
    >
      <span data-tut="hearts" className="life-hearts">
        {/* versão 2.7: na roda por tentos, as tampinhas amassadas no lugar dos corações */}
        {tentos ? (
          <TentosBar current={tentos.current} max={tentos.max} size={landscape ? 17 : tentos.max <= 5 ? 24 : 19} label={`Você: ${tentos.current} de ${tentos.max} tentos`} />
        ) : (
          <HeartsBar current={hearts} max={maxHearts} pixel={landscape || maxHearts > 6 ? 2 : 3} label={`Você: ${hearts} de ${maxHearts} corações`} />
        )}
      </span>
    </button>
  );
  const relicRow = (
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
      vertical={landscape}
    />
  );

  if (landscape) {
    return (
      <section
        ref={sceneRef}
        className={`player-zone is-landscape absolute inset-0 z-20 ${isTurn ? 'is-turn' : ''} ${frame ? `player-frame player-frame-${frame}` : ''}`}
        aria-label="Sua mão"
      >
        {/* a faixa do leque, no meio de baixo (a mesa mede só ela) */}
        <div ref={zoneRef} className="hand-band">
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
            fan={fan}
          />
        </div>
        <TacticalPlanks
          discardMode={discardMode}
          pickLabels={pickLabels}
          hasSelection={Boolean(selectedId)}
          onSkipDiscard={onSkipDiscard}
          onDiscard={onDiscard}
          showDraw={showDraw}
          canDraw={canDraw}
          onDraw={onDraw}
          draw={draw}
          myTurn={myTurn}
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
          onOpenMenu={onOpenMenu}
          devUnlocked={devUnlocked}
          onOpenDev={onOpenDev}
        />
        {/* versão 2.11: seus talismãs numa coluna de nichos na beirada da esquerda e, embaixo, a vida */}
        <div className="land-relics">{relicRow}</div>
        <div className="land-side land-left">
          <div className="player-life-row">{life}</div>
        </div>
        {/* o seu dinheiro: no alto à direita, embaixo do dorme */}
        <div className="player-coins-row land-coins">
          <span className="coins-led">
            <CoinCount value={coins} target="player" className="player-coins" />
          </span>
        </div>
      </section>
    );
  }

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
      <div className="player-life-row">{life}</div>
      <div className="player-coins-row">
        <span className="coins-led">
          <CoinCount value={coins} target="player" className="player-coins" />
        </span>
      </div>

      {relicRow}

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
