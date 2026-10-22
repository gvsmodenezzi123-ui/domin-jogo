import { sound } from '../engine/audioSynth.js';
import { useCopyFeedback } from './useCopyFeedback.js';

/**
 * A semente da run num cantinho (Patch 0.9.2), com o botão COPIAR SEMENTE: copia para colar
 * no Balcão (SEMENTE (OPCIONAL)) e repetir a mesma run. Responde "COPIADA!" por um instante.
 */
export default function SeedChip({ code, className = '' }) {
  const [status, copy] = useCopyFeedback();
  if (!code) return null;
  const label = status === 'ok' ? 'COPIADA!' : status === 'fail' ? 'NÃO DEU' : 'COPIAR SEMENTE';
  return (
    <div className={`seed-chip ${className}`}>
      <span className="seed-chip-text">
        SEMENTE: <span className="seed-chip-code">{code}</span>
      </span>
      <button
        type="button"
        className={`seed-chip-btn ${status === 'ok' ? 'is-ok' : status === 'fail' ? 'is-fail' : ''}`}
        onClick={() => {
          sound.playClick();
          copy(code);
        }}
        aria-label={`Copiar semente ${code}`}
      >
        {label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'ok' ? 'Semente copiada' : status === 'fail' ? 'Não foi possível copiar' : ''}
      </span>
    </div>
  );
}
