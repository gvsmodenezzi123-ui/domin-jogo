import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { SILENT_CHARS, sound } from '../engine/audioSynth.js';
import { prefersReducedMotion } from './motion.js';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';

/**
 * A aula do Vô Juca (Patch 0.9.5), por cima da mesa da partida de treino:
 *   - CoachBox: a caixa de fala presa no alto (no lugar do banco do rival), com o retrato
 *     dele, os corações e a fala digitada letra a letra com a voz; tocar completa a frase,
 *     vira a página ou, nos passos de "toque para seguir", passa adiante;
 *   - TutorialCard: o cartão do meio da tela na abertura e no fim do treino;
 *   - TutorialFocus: o anel dourado pulsando em volta do que ele está mostrando.
 * O roteiro mora em data/tutorial.js; o App decide o passo, a mesa e o anel.
 */

/** "[6|2]" dentro da fala vira uma pedrinha deitada. */
const TILE_TOKEN = /(\[\d\|\d\])/;

function RichText({ text }) {
  return text.split(TILE_TOKEN).map((part, i) => {
    const m = /^\[(\d)\|(\d)\]$/.exec(part);
    if (!m) return part;
    return (
      <span key={i} className="tut-tile" aria-label={`pedra ${m[1]} e ${m[2]}`}>
        <b>{m[1]}</b>
        <i aria-hidden="true" />
        <b>{m[2]}</b>
      </span>
    );
  });
}

/** Tamanhos de letra tentados (o maior que cabe na caixa vence). */
const FONT_STEPS = [20, 19, 18, 17, 16, 15, 14];

/**
 * A fala digitada com a voz dele. Reserva o tamanho da frase inteira (não pula enquanto
 * digita) e escolhe a maior letra que cabe na caixa. `skip`: mostra tudo de uma vez.
 */
function TypedText({ text, skip, onDone, onMouth, className = '', fit = true }) {
  const instant = skip || prefersReducedMotion();
  const [count, setCount] = useState(0);
  const shown = instant ? text.length : count;
  const done = shown >= text.length;
  const boxRef = useRef(null);
  const measureRef = useRef(null);
  const [font, setFont] = useState(null);

  useEffect(() => {
    if (instant) return undefined;
    const stop = sound.speakPhrase(text, 'voJuca', (typed) => {
      setCount(typed.length);
      const last = typed[typed.length - 1];
      onMouth?.(typed.length < text.length && !SILENT_CHARS.has(last) && typed.length % 2 === 1);
    });
    return () => {
      stop();
      onMouth?.(false);
    };
  }, [text, instant, onMouth]);

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  // a maior letra que cabe (mede a frase inteira escondida, antes de pintar)
  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!fit || !box || !measure || typeof ResizeObserver === 'undefined') return undefined;
    const pick = () => {
      const room = box.clientHeight;
      let best = FONT_STEPS[FONT_STEPS.length - 1];
      for (const size of FONT_STEPS) {
        measure.style.fontSize = `${size}px`;
        if (measure.offsetHeight <= room + 1) {
          best = size;
          break;
        }
      }
      measure.style.fontSize = '';
      // antes de pintar: sem o quadro com a letra grande cortada
      flushSync(() => setFont((prev) => (prev === best ? prev : best)));
    };
    const ro = new ResizeObserver(pick);
    ro.observe(box);
    return () => ro.disconnect();
  }, [text, fit]);

  return (
    <span ref={boxRef} className={`tut-typed ${fit ? 'is-fit' : 'is-natural'} ${className}`} style={font ? { fontSize: font } : undefined} aria-label={text}>
      {fit ? (
        <span ref={measureRef} className="tut-typed-measure" aria-hidden="true">
          <RichText text={text} />
        </span>
      ) : (
        <span className="tut-typed-full" aria-hidden="true">
          <RichText text={text} />
        </span>
      )}
      <span className="tut-typed-shown" aria-hidden="true">
        <RichText text={text.slice(0, shown)} />
      </span>
    </span>
  );
}

/** Página atual da fala (tocar completa, vira a página ou chama `onAdvance` na última). */
function usePages(pages, { textKey, onAdvance, canAdvance }) {
  const [turned, setPage] = useState(0);
  const page = Math.min(turned, pages.length - 1);
  const [doneKey, setDoneKey] = useState(null);
  const [skipKey, setSkipKey] = useState(null);
  const key = `${textKey}:${page}`;
  const done = doneKey === key;
  const last = page >= pages.length - 1;
  const markDone = useCallback(() => setDoneKey(key), [key]);
  const tap = () => {
    if (!done) {
      setSkipKey(key);
      return;
    }
    if (!last) {
      sound.playPageTurn();
      setPage((p) => p + 1);
      return;
    }
    if (canAdvance) onAdvance?.();
  };
  return { page, key, done, last, skip: skipKey === key, markDone, tap };
}

/** Caixa de fala no alto da mesa. */
export function CoachBox({ step, stepIndex, total, tutor, hearts, maxHearts, nudge, onNext, onReady, onSkip }) {
  const [mouth, setMouth] = useState(false);
  const isTap = step.expect.type === 'tap';
  const pages = nudge ? [nudge.text] : step.pages;
  const { page, key, done, last, skip, markDone, tap } = usePages(pages, {
    textKey: `${stepIndex}:${nudge?.key ?? 0}`,
    canAdvance: isTap,
    onAdvance: onNext,
  });
  // a fala do passo terminou: a vez do rival (nos passos dele) pode sair
  useEffect(() => {
    if (done && last) onReady?.(stepIndex);
  }, [done, last, stepIndex, onReady]);
  const more = done && (!last || isTap);
  const waiting = done && last && !isTap;
  const theirs = step.expect.type === 'rival';
  return (
    <div className="tut-coach" role="region" aria-label="Aula do Vô Juca">
      <div
        className={`tut-coach-box ${nudge ? 'is-nudge' : ''}`}
        onClick={tap}
        role="button"
        tabIndex={0}
        aria-label={more ? 'Toque para continuar' : 'Fala do Vô Juca'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tap();
          }
        }}
      >
        <div className="tut-coach-side">
          <span className="tut-coach-portrait">
            <RivalAvatar rival={tutor} mood={step.mood} size={56} speaking={mouth} smoke={false} />
          </span>
          <span className="tut-coach-name font-pixel">VÔ JUCA</span>
          <HeartsBar current={hearts} max={maxHearts} size={8} label={`Vô Juca: ${hearts} de ${maxHearts} corações`} />
        </div>
        <div className="tut-coach-talk">
          <TypedText key={key} text={pages[page]} skip={skip} onDone={markDone} onMouth={setMouth} className="tut-coach-text" />
          <span className="tut-coach-foot font-pixel">
            <button
              type="button"
              className="tut-coach-skip text-action"
              onClick={(e) => {
                e.stopPropagation();
                onSkip?.();
              }}
            >
              PULAR TREINO ›
            </button>
            {more && <span className="tut-coach-more" aria-hidden="true">TOQUE ▼</span>}
            {waiting && <span className={`tut-coach-wait ${theirs ? 'is-theirs' : ''}`} aria-hidden="true">{theirs ? 'VEZ DELE...' : 'SUA VEZ'}</span>}
          </span>
        </div>
        <span className="tut-coach-progress" aria-hidden="true">
          <span style={{ width: `${Math.round(((stepIndex + 1) / total) * 100)}%` }} />
        </span>
      </div>
    </div>
  );
}

/** Cartão do meio da tela (abertura e fim do treino). */
export function TutorialCard({ step, stepIndex, tutor, replay, onNext, onFinish, onSkip }) {
  const [mouth, setMouth] = useState(false);
  const ending = step.card === 'end';
  const { page, key, done, last, skip, markDone, tap } = usePages(step.pages, {
    textKey: `${stepIndex}`,
    canAdvance: true,
    onAdvance: ending ? onFinish : onNext,
  });
  const label = !last ? 'CONTINUAR' : ending ? (replay ? 'VOLTAR AO MENU' : 'COMEÇAR A RUN') : 'BORA!';
  return (
    <div className="tut-card-backdrop overlay-backdrop fixed inset-0 z-[66] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-labelledby="tut-card-title">
      <div className={`tut-card ${ending ? 'is-end' : ''}`}>
        <span className="tut-card-portrait">
          <RivalAvatar rival={tutor} mood={step.mood} size={92} speaking={mouth} smoke={false} />
        </span>
        <p id="tut-card-title" className="tut-card-name font-pixel">
          {ending ? 'TREINO CONCLUÍDO' : 'VÔ JUCA'}
        </p>
        <p className="tut-card-title font-pixel">{ending ? 'AGORA É COM VOCÊ' : 'O PROFESSOR DO BOTECO'}</p>
        <button type="button" className="tut-card-talk text-action" onClick={tap} aria-label={done ? 'Fala do Vô Juca' : 'Mostrar a fala inteira'}>
          <TypedText key={key} text={step.pages[page]} skip={skip} onDone={markDone} onMouth={setMouth} className="tut-card-text" fit={false} />
        </button>
        <button type="button" data-tone={ending ? 'play' : 'brass'} className="btn-pixel tut-card-go" onClick={tap}>
          {label}
        </button>
        {!ending && (
          <button type="button" className="tut-card-skip text-action font-pixel" onClick={onSkip}>
            PULAR O TREINO
          </button>
        )}
      </div>
    </div>
  );
}

/** Anel dourado pulsando em volta do elemento `selector` (segue ele se mexer). */
export function TutorialFocus({ selector }) {
  const [spot, setSpot] = useState({ selector: null, rect: null });
  useEffect(() => {
    if (!selector) return undefined;
    let timer = null;
    let last = '';
    const tick = () => {
      const el = document.querySelector(selector);
      const r = el?.getBoundingClientRect();
      const visible = r && r.width > 0 && r.height > 0;
      const sig = visible ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : '';
      if (sig !== last) {
        last = sig;
        setSpot({ selector, rect: visible ? { x: r.left, y: r.top, w: r.width, h: r.height } : null });
      }
      timer = setTimeout(tick, 140);
    };
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [selector]);
  const rect = spot.selector === selector ? spot.rect : null;
  if (!selector || !rect) return null;
  const pad = 6;
  // a setinha fica em cima do anel (ou embaixo, se ele estiver no alto da tela)
  const below = rect.y < 150;
  return (
    <div className="pointer-events-none fixed inset-0 z-[57]" aria-hidden="true">
      <span
        className="tut-focus"
        style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }}
      />
      <span
        className={`tut-focus-arrow ${below ? 'is-below' : ''}`}
        style={{ left: rect.x + rect.w / 2, top: below ? rect.y + rect.h + pad + 4 : rect.y - pad - 4 }}
      >
        {below ? '▲' : '▼'}
      </span>
    </div>
  );
}
