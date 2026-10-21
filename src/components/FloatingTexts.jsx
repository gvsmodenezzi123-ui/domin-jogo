import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion.js';

const RISE_MS = 1100;
const FLY_MS = 820;
const LABEL_MS = 800;
/** Balão de golpe (Patch 0.6.2, "Nas duas pontas!"): estoura, segura e some. */
const CALLOUT_MS = 1300;

function Float({ item, onDone }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // não deixa o aviso sair pela borda da tela
    const box = el.getBoundingClientRect();
    const margin = 6;
    const shift = box.left < margin ? margin - box.left : box.right > window.innerWidth - margin ? window.innerWidth - margin - box.right : 0;
    if (shift) el.style.left = `${item.from.x + shift}px`;
    const duration = item.to ? FLY_MS : item.kind === 'label' ? LABEL_MS : item.kind === 'callout' ? CALLOUT_MS : RISE_MS;
    const timer = setTimeout(() => onDone(item.id), duration + 40);
    if (!el.animate || prefersReducedMotion()) return () => clearTimeout(timer);
    const dx = item.to ? item.to.x - item.from.x : 0;
    const dy = item.to ? item.to.y - item.from.y : item.kind === 'label' ? -26 : -38;
    const callout = [
      { transform: 'translate(-50%, -50%) scale(0.3) rotate(-8deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.18) rotate(3deg)', opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(-2deg)', opacity: 1, offset: 0.24 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(-2deg)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%, calc(-50% - 14px)) scale(0.94) rotate(-2deg)', opacity: 0 },
    ];
    const frames = item.kind === 'callout'
      ? callout
      : item.to
      ? [
          { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
          { transform: 'translate(-50%, calc(-50% - 16px)) scale(1.15)', opacity: 1, offset: 0.22 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.75)`, opacity: 0.9, offset: 0.9 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`, opacity: 0 },
        ]
      : [
          { transform: 'translate(-50%, -50%) scale(0.7)', opacity: 0 },
          { transform: 'translate(-50%, calc(-50% - 6px)) scale(1.08)', opacity: 1, offset: 0.18 },
          { transform: `translate(-50%, calc(-50% + ${dy * 0.7}px)) scale(1)`, opacity: 1, offset: 0.7 },
          { transform: `translate(-50%, calc(-50% + ${dy}px)) scale(0.96)`, opacity: 0 },
        ];
    const anim = el.animate(frames, { duration, easing: item.to ? 'cubic-bezier(0.3, 0.6, 0.35, 1)' : 'ease-out', fill: 'forwards' });
    return () => {
      clearTimeout(timer);
      anim.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cada item anima uma vez
  }, []);
  return (
    <span ref={ref} className={`float-text float-${item.kind ?? 'text'}`} data-tone={item.tone} style={{ left: item.from.x, top: item.from.y }}>
      {item.text}
    </span>
  );
}

/** Camada (fixa, sem toque) dos textos que sobem da mesa. */
export default function FloatingTexts({ items, onDone }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[58] overflow-hidden" aria-hidden="true">
      {items.map((item) => (
        <Float key={item.id} item={item} onDone={onDone} />
      ))}
    </div>
  );
}
