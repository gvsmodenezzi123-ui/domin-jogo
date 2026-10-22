import { Children, isValidElement, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { sound } from '../engine/audioSynth.js';
import { prefersReducedMotion } from './motion.js';
import { PAGER_HEIGHT, packPages, pageScale, samePages, stackHeight } from './pagePack.js';
import { ArrowGlyph } from './UiGlyphs.jsx';

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Conteúdo em páginas, sem scroll (Patch 0.9.3). Recebe blocos (os filhos, cada um inteiro
 * numa página) e os reparte pela altura que sobra na caixa: o que não cabe vai para a página
 * seguinte, com uma barra de setas e bolinhas embaixo (e arrastar para o lado também vira).
 * Se tudo cabe, não aparece barra nenhuma. Bloco maior que a página inteira encolhe para
 * caber. Um filho com `data-keep` (um título) não fica sozinho no pé da página.
 *
 * A altura da caixa vem de fora (flex com `min-h-0`, ou o teto do cartão): a lista ocupa a
 * altura natural de tudo (`stackHeight`) e encolhe até onde o pai deixar.
 *   theme: card | book | ledger | chalk (a cor da barra)
 *   slack: folga embaixo (px) para a sombra do último cartão não ser cortada
 *   squeeze: escala mínima aceita para não quebrar a página por pouco (1 = nunca aperta)
 *   role:  papel da lista (ex.: 'list' quando os blocos são itens)
 */
export default function PagedBlocks({ children, gap = 10, slack = 4, squeeze = 1, theme = 'card', className = '', label = 'Páginas', role, onTurn }) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const count = blocks.length;
  const viewRef = useRef(null);
  const trackRef = useRef(null);
  const blockRefs = useRef([]);
  const swipe = useRef(null);
  const [fit, setFit] = useState({ pages: null, natural: null, room: 0, heights: [] });
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const els = blockRefs.current.slice(0, count);
      const heights = els.map((el) => (el ? el.offsetHeight : 0));
      const keep = els.map((el) => Boolean(el?.querySelector(':scope > [data-keep]')));
      const natural = stackHeight(heights, gap);
      const room = view.clientHeight - slack;
      const pages = packPages(heights, room, { gap, keep, squeeze });
      setFit((prev) =>
        prev.pages && prev.natural === natural && prev.room === room && sameList(prev.heights, heights) && samePages(prev.pages, pages) ? prev : { pages, natural, room, heights },
      );
    };
    // medir antes de pintar: sem o quadro com tudo empilhado e cortado
    const ro = new ResizeObserver(() => flushSync(measure));
    ro.observe(view);
    for (const el of blockRefs.current.slice(0, count)) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [count, gap, slack, squeeze]);

  const pages = fit.pages ?? [blocks.map((_, i) => i)];
  const current = Math.min(page, pages.length - 1);
  const shown = new Set(pages[current] ?? []);
  const multi = pages.length > 1;
  const room = multi ? fit.room - PAGER_HEIGHT : fit.room;
  // página que passou da caixa (bloco grande sozinho, ou apertada pelo `squeeze`) encolhe inteira
  const scale = fit.pages ? pageScale(fit.heights, pages[current] ?? [], room, gap) : 1;

  const turn = (step) => {
    const next = Math.max(0, Math.min(pages.length - 1, current + step));
    if (next === current) return;
    sound.playPageTurn();
    flushSync(() => setPage(next));
    onTurn?.(next);
    if (!prefersReducedMotion() && trackRef.current?.animate) {
      trackRef.current.animate(
        [
          // `translate` (e não `transform`): não briga com o encolhimento da página
          { opacity: 0, translate: `${step > 0 ? 18 : -18}px 0` },
          { opacity: 1, translate: '0 0' },
        ],
        { duration: 200, easing: 'cubic-bezier(.2,.8,.3,1)' },
      );
    }
  };

  const onPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || !multi) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
  };

  return (
    <div ref={viewRef} className={`paged ${className}`} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
      <div
        ref={trackRef}
        className="paged-track"
        role={role}
        style={{
          height: fit.natural == null ? undefined : fit.natural + slack,
          gap,
          transform: scale < 1 ? `scale(${scale.toFixed(3)})` : undefined,
          transformOrigin: scale < 1 ? 'top center' : undefined,
        }}
      >
        {blocks.map((block, i) => {
          const on = shown.has(i);
          return (
            <div
              key={block.key ?? i}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              className={`paged-block ${on ? '' : 'is-off'}`}
              aria-hidden={on ? undefined : true}
              inert={!on}
            >
              {block}
            </div>
          );
        })}
      </div>
      {multi && (
        <nav className={`pager pager-${theme}`} aria-label={label}>
          <button type="button" className="pager-btn" onClick={() => turn(-1)} disabled={current === 0} aria-label="Página anterior">
            <ArrowGlyph dir="prev" className="pager-arrow" />
          </button>
          <span className="pager-middle">
            {pages.length <= 12 && (
              <span className="pager-dots" aria-hidden="true">
                {pages.map((_, i) => (
                  <i key={i} className={i === current ? 'is-on' : ''} />
                ))}
              </span>
            )}
            <span className="pager-count" aria-live="polite">
              {current + 1}/{pages.length}
            </span>
          </span>
          <button type="button" className="pager-btn" onClick={() => turn(1)} disabled={current === pages.length - 1} aria-label="Próxima página">
            <ArrowGlyph dir="next" className="pager-arrow" />
          </button>
        </nav>
      )}
    </div>
  );
}
