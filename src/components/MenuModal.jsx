import { useEffect } from 'react';

/** Janela por cima do menu/mesa, com título e botão FECHAR. Esc também fecha. */
export default function MenuModal({ id, title, onClose, children, wide = false, variant = 'card' }) {
  const leather = variant === 'leather';
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay-backdrop fixed inset-0 z-[75] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby={id}>
      <div
        className={`${leather ? 'book-leather' : 'overlay-card'} animate-modal-in flex max-h-[88%] w-full flex-col px-4 pb-4 pt-4 ${
          wide ? 'max-w-[420px]' : 'max-w-[320px]'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 id={id} className={`font-pixel text-[13px] leading-snug ${leather ? 'book-emboss' : 'text-bone-50 text-shadow-pixel'}`}>
            {title}
          </h2>
          {onClose && (
            <button type="button" className="btn-pixel btn-mini" onClick={onClose}>
              FECHAR
            </button>
          )}
        </div>
        <div className={`mt-3 min-h-0 flex-1 overflow-y-auto text-left ${leather ? 'book-page' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
