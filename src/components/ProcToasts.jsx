import { getEnhancement } from '../data/enhancedTiles.js';
import { getRelic } from '../data/relics.js';
import PixelSprite from './PixelSprite.jsx';

/** Altura de cada aviso na pilha (px): o balão do Tio Zé desce isso por aviso visível. */
export const TOAST_ROW_PX = 31;

/** Avisos curtos no topo do feltro: "CINZEIRO +$2", "RUBI: −1♥ NO TIO ZÉ"... */
export default function ProcToasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2.5 z-40 flex flex-col items-center gap-1.5" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const relic = toast.source === 'relic' ? getRelic(toast.id) : null;
        const enhancement = toast.source === 'tile' ? getEnhancement(toast.id) : null;
        return (
          <div key={toast.seq} className="proc-toast" data-tone={toast.tone}>
            {relic && <PixelSprite rows={relic.icon} palette={relic.palette} pixel={1.5} className="shrink-0" />}
            {enhancement && (
              <span
                aria-hidden="true"
                className="block h-[14px] w-[8px] shrink-0 border border-black"
                style={{ background: enhancement.color }}
              />
            )}
            <span>{toast.text}</span>
          </div>
        );
      })}
    </div>
  );
}
