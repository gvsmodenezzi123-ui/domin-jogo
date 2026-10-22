import { useEffect } from 'react';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import { TrophyIcon } from './ArtSprites.jsx';

/** Descida, tempo parado no topo e subida do aviso (ms). */
export const TOAST_SLIDE_MS = 420;
export const TOAST_HOLD_MS = 3800;
const TOTAL_MS = TOAST_SLIDE_MS * 2 + TOAST_HOLD_MS;

/**
 * Aviso de conquista (Patch 0.7.0) no alto da tela, por cima de tudo (mapa, loja, mesa,
 * menus e o corte de cena). O App guarda a fila e passa um aviso por vez: o cartão desce
 * do topo com a fanfarra metálica, fica 3,8 s e sobe de volta; aí `onDone` tira ele da fila.
 * A descida/subida é uma animação de CSS só (`achievement-toast-card`), sem estado aqui.
 */
export default function AchievementToast({ toast, onDone }) {
  const key = toast?.key ?? null;
  useEffect(() => {
    if (!key) return undefined;
    sound.playAchievement();
    haptic([18, 40, 18, 40, 60]);
    const timer = setTimeout(() => onDone(key), TOTAL_MS);
    return () => clearTimeout(timer);
  }, [key, onDone]);

  if (!toast) return null;
  return (
    <div className="achievement-toast fixed top-3 left-1/2 -translate-x-1/2 z-[210] pointer-events-none" role="status" aria-live="polite">
      <div
        key={key}
        className="achievement-toast-card border-2 border-amber-400 bg-zinc-950/95 shadow-[0_4px_0_#78350f] p-2.5 flex items-center gap-3 min-w-[280px] max-w-[90vw]"
        style={{ '--toast-total': `${TOTAL_MS}ms` }}
      >
        <span className="achievement-trophy shimmer-active block h-10 w-10 shrink-0">
          <TrophyIcon className="h-10 w-10" />
        </span>
        {/* a fonte de pixel do jogo (Press Start 2P) é a monoespaçada; a VT323 em 16px
            tem o corpo de um texto de 11px nas outras fontes */}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="achievement-kicker font-pixel text-[10px] font-bold leading-none text-yellow-400">CONQUISTA DESBLOQUEADA!</span>
          <span className="font-term text-[16px] leading-[0.95] text-[#f4ecd2]">
            <span className="block truncate text-amber-200">{toast.title}</span>
            <span className="block">
              Talismã liberado: <span className="text-amber-300">{toast.relicName}</span>
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
