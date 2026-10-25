import { useEffect, useRef, useState } from 'react';
import { BLACK_LOCKED_TEXT, MODES, SILVER_LOCKED_TEXT } from '../data/difficulty.js';
import { DEFAULT_MALETA, MALETAS, MALETA_IDS } from '../data/maletas.js';
import { challengeOf } from '../data/meta.js';
import { sound } from '../engine/audioSynth.js';
import { markMaletasSeen } from '../engine/meta.js';
import { SEED_MAX_LENGTH, normalizeSeed } from '../engine/seedEngine.js';
import { haptic } from '../engine/progress.js';
import DominoTile from './DominoTile.jsx';
import LampRig from './LampRig.jsx';
import { TileSkinContext } from './tileSkin.js';
import { ArrowGlyph } from './UiGlyphs.jsx';
import { useUnlockSequence } from './useUnlockSequence.js';
import { CadeadoSprite, CorrentesSprite, MaletaSprite } from './art/CaseArt.jsx';

/** Progresso das metas que somam (Borracharia: trancas vencidas). */
function progressOf(id, progress) {
  if (id === 'borracharia') return `Trancas vencidas: ${Math.min(progress.trancaWins ?? 0, 3)}/3`;
  return null;
}

/** Brasa subindo no Modo Inferno: posição (%), atraso e duração (s). */
const EMBERS = [
  [8, 0, 5.2],
  [19, 1.8, 6.1],
  [31, 0.9, 4.7],
  [44, 2.6, 5.8],
  [57, 0.4, 6.4],
  [68, 1.4, 5.1],
  [79, 3.1, 6],
  [91, 2.1, 4.9],
];

/** Faíscas que sobem da maleta quando ela abre (posição e atraso de cada uma). */
const SPARKS = [
  [22, 0],
  [38, 60],
  [52, 20],
  [64, 90],
  [78, 40],
  [46, 130],
];

/**
 * Uma maleta no balcão (Patch 0.8.2: todas começam fechadas). Trancada: corrente e cadeado.
 * Liberada: fechada também, até você tocar; aí os fechos estalam, a tampa sobe mostrando o
 * forro de veludo, sai um brilho e umas faíscas. Abrir outra fecha a anterior (`closing`).
 * Na primeira vez que aparece liberada, o cadeado abre e as correntes caem (`fresh`).
 */
function CaseSlot({ id, unlocked, fresh, open, closing, disabled, waiting = false, focused = true, shakeKey, onPick }) {
  const stage = useUnlockSequence(fresh, unlocked ? 'open' : 'locked');
  const maleta = MALETAS[id];
  const free = stage === 'open'; // sem corrente: dá para abrir
  const shown = free && open;
  const motion = shown ? 'case-opening' : closing ? 'case-closing' : fresh && free ? 'case-freed' : '';
  return (
    <button
      type="button"
      className={`scene-tap counter-case ${shown ? 'is-selected is-open' : ''} ${unlocked ? '' : 'is-locked'} ${disabled ? 'is-disabled' : ''} ${waiting ? 'is-waiting' : ''}`}
      onClick={() => onPick(id)}
      tabIndex={focused ? undefined : -1}
      aria-pressed={shown}
      aria-label={unlocked ? `${maleta.name}: ${shown ? maleta.buff : 'fechada, toque para abrir'}` : `${maleta.name}: trancada. ${maleta.goal}`}
    >
      <span className="case-art counter-art">
        {shown && <span aria-hidden="true" className="case-glow" />}
        <span key={`${shown}-${shakeKey}`} className={`case-body ${motion} ${shakeKey ? 'case-shake' : ''}`}>
          {shown ? (
            <>
              {/* a fechada estala os fechos e some; a aberta sobe no lugar */}
              <span className="case-layer case-layer-closed">
                <MaletaSprite id={id} className="case-sprite" />
              </span>
              <span className="case-layer case-layer-open">
                <MaletaSprite id={id} open className="case-sprite" />
              </span>
            </>
          ) : (
            <MaletaSprite id={id} className="case-sprite" />
          )}
        </span>
        {shown && (
          <span aria-hidden="true" className="case-sparks">
            {SPARKS.map(([x, delay]) => (
              <i key={x} style={{ left: `${x}%`, animationDelay: `${380 + delay}ms` }} />
            ))}
          </span>
        )}
        {!free && (
          <>
            <span aria-hidden="true" className={`case-chains ${stage === 'unlocking' ? 'is-falling' : ''}`}>
              <CorrentesSprite className="case-sprite" />
            </span>
            <span aria-hidden="true" className={`case-lock ${stage === 'unlocking' ? 'is-open' : ''}`}>
              <CadeadoSprite open={stage === 'unlocking'} className="case-sprite" />
            </span>
          </>
        )}
      </span>
      <span className="counter-name">{maleta.short}</span>
    </button>
  );
}

/**
 * As dificuldades: Peças Brancas (normal), Peças Pretas (difícil, com cadeado até zerar o
 * normal) e Peças Prateadas (Modo Inferno, Patch 0.9.0, com cadeado até zerar o difícil).
 */
const SKIN_OF = { normal: 'bone', hard: 'onyx', inferno: 'silver' };

function DifficultyPick({ mode, unlocked, onChange }) {
  return (
    <div className="diff-pick" role="radiogroup" aria-label="Dificuldade">
      {['normal', 'hard', 'inferno'].map((id) => {
        const locked = !unlocked[id];
        const on = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={locked}
            className={`scene-tap diff-option diff-${id} ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="diff-box" aria-hidden="true">
              {on ? '■' : ''}
            </span>
            <TileSkinContext.Provider value={SKIN_OF[id]}>
              <DominoTile values={[5, 3]} unit={10} depth={2} orientation="horizontal" className="diff-tile" />
            </TileSkinContext.Provider>
            <span className="diff-text">
              <span className="diff-name">{MODES[id].name}</span>
              <span className="diff-tag">{locked ? 'TRANCADO' : MODES[id].tag}</span>
            </span>
            {locked && <CadeadoSprite className="diff-lock" />}
          </button>
        );
      })}
    </div>
  );
}

/** Distância (em px) entre a maleta do meio e a vizinha: a mesma conta do CSS (`--case-step`). */
const caseStep = () => (typeof window === 'undefined' ? 140 : Math.min(window.innerWidth * 0.36, 150));

/**
 * O carrossel das maletas (Patch 0.9.3): uma maleta grande no meio, as vizinhas menores e
 * apagadas dos lados. Arrastar para o lado (ou as setas e bolinhas logo abaixo) passa de uma
 * para a outra; a maleta acompanha o dedo e assenta na mais perto quando solta. Tocar na do meio abre
 * (ou mostra a meta, se trancada); tocar numa vizinha traz ela para o meio.
 */
function CaseCarousel({ ids, focus, onFocus, children }) {
  const [drag, setDrag] = useState(null); // { x, dx, moved } enquanto o dedo está no balcão
  const trackRef = useRef(null);
  const swallowClick = useRef(false);
  const last = ids.length - 1;
  const shift = drag?.moved ? drag.dx / caseStep() : 0;

  const onPointerDown = (e) => {
    swallowClick.current = false;
    setDrag({ x: e.clientX, dx: 0, moved: false, id: e.pointerId });
  };
  const onPointerMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 8) return;
    if (!drag.moved) trackRef.current?.setPointerCapture?.(e.pointerId); // só agarra quando vira arrasto (o toque simples vira clique)
    // nas pontas a fila resiste (borracha)
    const edge = (focus === 0 && dx > 0) || (focus === last && dx < 0);
    setDrag({ ...drag, dx: edge ? dx * 0.35 : dx, moved: true });
  };
  const onPointerUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      swallowClick.current = true;
      // arrastou um pouco mais de 1/5 do passo: já conta como uma maleta
      const moved = -drag.dx / caseStep();
      let steps = Math.round(moved);
      if (steps === 0 && Math.abs(drag.dx) > caseStep() * 0.2) steps = moved > 0 ? 1 : -1;
      const target = Math.max(0, Math.min(last, focus + steps));
      if (target !== focus) onFocus(target);
    }
    setDrag(null);
  };

  return (
    <div className="case-carousel">
      <div
        ref={trackRef}
        className={`case-track ${drag?.moved ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onClickCapture={(e) => {
          // o clique que vem no fim de um arrasto não abre maleta
          if (swallowClick.current) {
            e.stopPropagation();
            e.preventDefault();
            swallowClick.current = false;
          }
        }}
        role="group"
        aria-roledescription="carrossel"
        aria-label="Maletas do balcão"
      >
        {ids.map((id, i) => {
          const d = i - focus + shift;
          const far = Math.abs(d);
          const scale = 1 - Math.min(far, 1.5) * 0.3;
          return (
            <div
              key={id}
              className={`case-slot ${i === focus ? 'is-focus' : ''}`}
              style={{
                transform: `translateX(calc(-50% + ${d.toFixed(3)} * var(--case-step))) scale(${scale.toFixed(3)})`,
                opacity: far > 2.2 ? 0 : Math.max(0, 1 - Math.min(far, 2) * 0.38),
                zIndex: 10 - Math.round(far * 2),
                visibility: far > 2.4 ? 'hidden' : undefined,
              }}
              aria-hidden={i === focus ? undefined : true}
            >
              {children(id, i)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sons de cada dificuldade ao escolher (Peças Pretas e Prateadas anunciam o pesadelo). */
const MODE_SOUND = { normal: () => sound.playClick(), hard: () => sound.playDread(1), inferno: () => sound.playDread(2) };

/**
 * Balcão de Maletas (Patch 0.8.0), depois do NOVO JOGO: uma bancada de madeira vista de
 * cima, sob a lâmpada, com as 5 maletas de partida (data/maletas.js). Trancada: corrente e
 * cadeado; a meta aparece no cartão. Liberada: fechada até você tocar (Patch 0.8.2); tocar
 * abre a maleta e mostra logo abaixo o que ela muda, a escolha das peças (Brancas = normal,
 * Pretas = difícil, Prateadas = inferno) e o INICIAR. Uma aberta por vez.
 * Em desafio (`challenge`), o título mostra a regra; o Só no Osso só aceita a Clássica.
 * Patch 0.9.3: sem scroll. As maletas viram um carrossel (arraste para o lado para ver as
 * outras); com uma aberta (`is-picked`) a lâmpada sobe e tudo cabe na tela. Peças Pretas e
 * Prateadas mudam a cor do balcão (`mode-hard` / `mode-inferno`): a luz esfria, a sombra
 * fecha e, no inferno, o salão fica vermelho com brasa subindo.
 */
/**
 * `pvp` (Patch PvP): o balcão da mesa online — só a maleta (sem dificuldade, sem semente: a
 * teia vem do anfitrião) e o texto do botão; `{ title, note, start, back }`.
 */
export default function CaseCounter({ unlocked, seen, blackUnlocked, silverUnlocked = false, progress = {}, challenge = null, onStart, onBack, pvp = null }) {
  const rule = challengeOf(challenge);
  const allowed = (id) => !rule?.maleta || rule.maleta === id;
  const [focus, setFocus] = useState(() => Math.max(0, MALETA_IDS.indexOf(rule?.maleta ?? DEFAULT_MALETA)));
  const [selected, setSelected] = useState(null); // a maleta aberta (nenhuma até o primeiro toque)
  const [closing, setClosing] = useState(null); // a que acabou de fechar (anima a tampa descendo)
  const [shake, setShake] = useState({ id: null, n: 0 });
  const [mode, setMode] = useState('normal');
  const [warn, setWarn] = useState({ n: 0, text: '' });
  // Patch 0.9.2: semente opcional (em branco, o jogo sorteia uma nova ao iniciar)
  const [seed, setSeed] = useState('');
  const modesOpen = { normal: true, hard: blackUnlocked, inferno: silverUnlocked };
  // na primeira vez que uma maleta aparece liberada, as correntes caem
  // (no online todas vêm abertas: não mexe nas correntes do solo)
  const [fresh] = useState(() => (pvp ? [] : unlocked.filter((id) => id !== 'classica' && !seen.includes(id))));

  useEffect(() => {
    if (fresh.length) markMaletasSeen(fresh);
  }, [fresh]);

  const focusId = MALETA_IDS[focus];
  const focusOpen = unlocked.includes(focusId) && allowed(focusId);

  const focusTo = (index) => {
    const next = Math.max(0, Math.min(MALETA_IDS.length - 1, index));
    if (next === focus) return;
    setFocus(next);
    // passar para outra maleta fecha a que estava aberta
    if (selected) {
      setClosing(selected);
      setSelected(null);
      sound.playCaseClose();
    } else {
      sound.playCaseSlide();
    }
    haptic(8);
  };

  const pick = (id) => {
    const index = MALETA_IDS.indexOf(id);
    if (index !== focus) {
      focusTo(index);
      return;
    }
    if (!unlocked.includes(id) || !allowed(id)) {
      setShake((s) => ({ id, n: s.n + 1 }));
      sound.playChainRattle();
      haptic([30, 40, 30]);
      return;
    }
    if (id === selected) return;
    setClosing(null);
    setSelected(id);
    sound.playCaseOpen();
    haptic([12, 50, 12]);
  };

  const chooseMode = (id) => {
    if (!modesOpen[id]) {
      setWarn((w) => ({ n: w.n + 1, text: id === 'inferno' ? SILVER_LOCKED_TEXT : BLACK_LOCKED_TEXT }));
      sound.playChainRattle();
      haptic([30, 40, 30]);
      return;
    }
    if (id !== mode) MODE_SOUND[id]();
    setMode(id);
    if (id !== 'normal') haptic(id === 'inferno' ? [40, 60, 40, 60, 90] : [30, 50, 60]);
  };

  const maleta = selected ? MALETAS[selected] : null;
  const focused = MALETAS[focusId];

  return (
    <div
      className={`case-scene counter-scene mode-${mode} fixed inset-0 z-[70] ${maleta ? 'is-picked' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-title"
      onKeyDown={(e) => {
        if (e.target?.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') focusTo(focus + 1);
        if (e.key === 'ArrowLeft') focusTo(focus - 1);
      }}
    >
      {/* o pesadelo: a cor do balcão muda com a dificuldade */}
      <div aria-hidden="true" className="counter-dread">
        <span className="dread-hard" />
        <span className="dread-inferno" />
        <span className="dread-embers">
          {EMBERS.map(([x, delay, dur]) => (
            <i key={x} style={{ left: `${x}%`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
          ))}
        </span>
      </div>
      <div className="case-lamp" aria-hidden="true">
        <LampRig part="light" lamp={52} cord={24} beamWidth={420} />
        <LampRig part="body" lamp={52} cord={24} beamWidth={420} className="z-[6]" />
      </div>
      <div className="case-scroll">
        <h1 id="counter-title" className="case-title">
          {pvp ? pvp.title : rule ? `DESAFIO: ${rule.name.toUpperCase()}` : 'BALCÃO DE MALETAS'}
          <span>{pvp ? pvp.note : rule ? rule.rule : 'Arraste para o lado e escolha a sua maleta'}</span>
        </h1>

        <CaseCarousel ids={MALETA_IDS} focus={focus} onFocus={focusTo}>
          {(id, i) => (
            <CaseSlot
              id={id}
              unlocked={unlocked.includes(id)}
              fresh={fresh.includes(id)}
              open={id === selected}
              closing={id === closing}
              disabled={!allowed(id)}
              waiting={i === focus && !selected}
              focused={i === focus}
              shakeKey={shake.id === id ? shake.n : 0}
              onPick={pick}
            />
          )}
        </CaseCarousel>
        <div className="case-dots">
          <button type="button" className="case-nav" onClick={() => focusTo(focus - 1)} disabled={focus === 0} aria-label="Maleta anterior">
            <ArrowGlyph dir="prev" size={12} />
          </button>
          <div className="case-dot-row" role="tablist" aria-label="Escolher maleta">
            {MALETA_IDS.map((id, i) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={i === focus}
                aria-label={MALETAS[id].name}
                className={`case-dot ${i === focus ? 'is-on' : ''} ${unlocked.includes(id) ? '' : 'is-locked'}`}
                onClick={() => focusTo(i)}
              />
            ))}
          </div>
          <button type="button" className="case-nav" onClick={() => focusTo(focus + 1)} disabled={focus === MALETA_IDS.length - 1} aria-label="Próxima maleta">
            <ArrowGlyph dir="next" size={12} />
          </button>
        </div>

        {!focusOpen ? (
          <div key={`info-${focusId}-${shake.id === focusId ? shake.n : 0}`} className={`counter-card counter-card-locked ${shake.id === focusId ? 'animate-shop-alert' : ''}`} role="status">
            <p className="counter-card-title">{focused.name.toUpperCase()}</p>
            {!unlocked.includes(focusId) ? (
              <div className="book-unlock-goal mt-1.5">
                <p className="font-pixel text-[7px] leading-snug text-amber-300">[?] COMO DESBLOQUEAR:</p>
                <p className="mt-0.5 font-term text-[16px] leading-[1.05] text-amber-100">{focused.goal}</p>
                {progressOf(focusId, progress) && <p className="mt-0.5 font-pixel text-[7px] text-amber-400/80">{progressOf(focusId, progress)}</p>}
              </div>
            ) : (
              <p className="mt-1 font-term text-[17px] leading-tight text-bone-200">
                {rule?.name}: só a {MALETAS[rule?.maleta]?.name}.
              </p>
            )}
          </div>
        ) : !maleta ? (
          <div className="counter-card counter-card-hint" role="status">
            <p className="counter-card-title">{focused.name.toUpperCase()}</p>
            <p className="counter-hint-title mt-1.5">TOQUE NA MALETA PARA ABRIR</p>
            <p className="counter-hint-text">{focused.title}. Cada uma traz um começo diferente e uma regra da casa.</p>
          </div>
        ) : (
          <div key={selected} className="counter-card counter-card-open" role="group" aria-label={maleta.name}>
            <p className="counter-card-title">{maleta.name.toUpperCase()}</p>
            <p className="counter-card-sub">{maleta.title}</p>
            <p className="counter-buff">+ {maleta.buff}</p>
            {maleta.debuff && <p className="counter-debuff">− {pvp?.debuff?.[maleta.id] ?? maleta.debuff}</p>}
            {!pvp && <DifficultyPick mode={mode} unlocked={modesOpen} onChange={chooseMode} />}
            {warn.n > 0 && (
              <p key={warn.n} className="case-warn animate-shop-alert" role="alert">
                {warn.text}
              </p>
            )}
            {!pvp && (
            <label className="seed-field">
              <span className="seed-field-label">SEMENTE (OPCIONAL)</span>
              <input
                className="seed-field-input"
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value.toUpperCase().slice(0, SEED_MAX_LENGTH))}
                placeholder="BUX-9K2 · em branco: sorteia"
                maxLength={SEED_MAX_LENGTH}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-describedby="seed-field-hint"
              />
              <span id="seed-field-hint" className="seed-field-hint">
                {normalizeSeed(seed) ? `A run sai igual para quem usar ${normalizeSeed(seed)}.` : 'Cole uma semente para repetir uma run.'}
              </span>
            </label>
            )}
            <button
              type="button"
              data-tone={mode === 'normal' ? 'play' : 'blood'}
              className="btn-pixel counter-start"
              onClick={() => onStart({ maleta: selected, mode, challenge, seed })}
            >
              {pvp ? pvp.start : 'INICIAR'}
            </button>
          </div>
        )}

        <button type="button" className="text-action case-back" onClick={onBack}>
          {pvp?.back ?? 'VOLTAR'}
        </button>
      </div>
    </div>
  );
}
