import { useState } from 'react';
import PagedBlocks from './PagedBlocks.jsx';

function Slider({ id, label, value, onChange }) {
  const pct = Math.round(value * 100);
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between font-pixel text-[8px] text-bone-200">
        <span>{label}</span>
        <span className="text-brass-300">{pct}%</span>
      </span>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        step="5"
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="pixel-range mt-1.5 w-full"
        style={{ '--fill': `${pct}%` }}
      />
    </label>
  );
}

/**
 * Patch 0.9.3: sem scroll; em tela baixa as opções se repartem em páginas (PagedBlocks).
 * OPÇÕES: volume dos efeitos e da música, vibração, animações e resetar o progresso
 * (apaga a run salva e o Livro de Boteco; pede confirmação).
 */
export default function OptionsPanel({ settings, onChange, onResetProgress, onTutorial }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const set = (patch) => onChange({ ...settings, ...patch });
  return (
    <PagedBlocks className="min-h-0 flex-1" gap={16} label="Páginas das opções">
      <Slider id="opt-sfx" label="EFEITOS (SFX)" value={settings.sfx} onChange={(sfx) => set({ sfx })} />
      <Slider id="opt-music" label="MÚSICA" value={settings.music} onChange={(music) => set({ music })} />
      <button
        type="button"
        className="btn-pixel w-full"
        data-tone={settings.haptics ? 'brass' : undefined}
        aria-pressed={settings.haptics}
        onClick={() => set({ haptics: !settings.haptics })}
      >
        VIBRAÇÃO: {settings.haptics ? 'LIGADA' : 'DESLIGADA'}
      </button>
      <button
        type="button"
        className="btn-pixel w-full"
        data-tone={settings.reducedMotion ? undefined : 'brass'}
        aria-pressed={!settings.reducedMotion}
        onClick={() => set({ reducedMotion: !settings.reducedMotion })}
      >
        ANIMAÇÕES: {settings.reducedMotion ? 'REDUZIDAS' : 'COMPLETAS'}
      </button>
      {/* Patch 0.9.5: rever a partida de treino (só na tela inicial) */}
      {onTutorial && (
        <button type="button" className="btn-pixel w-full" onClick={onTutorial}>
          REVER O TREINO (VÔ JUCA)
        </button>
      )}
      {onResetProgress && (
        <div className="options-danger px-3 py-2.5">
          <p className="font-pixel text-[8px] leading-relaxed text-bone-300">RESETAR PROGRESSO</p>
          <p className="mt-1 font-term text-[16px] leading-tight text-bone-400">Apaga a run salva e o Livro de Boteco. As opções ficam.</p>
          {done ? (
            <p className="mt-2 font-pixel text-[8px] text-[#9fe08a]" role="status">
              PROGRESSO APAGADO.
            </p>
          ) : confirming ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className="btn-pixel btn-mini" onClick={() => setConfirming(false)}>
                CANCELAR
              </button>
              <button
                type="button"
                data-tone="blood"
                className="btn-pixel btn-mini"
                onClick={() => {
                  onResetProgress();
                  setConfirming(false);
                  setDone(true);
                }}
              >
                APAGAR TUDO
              </button>
            </div>
          ) : (
            <button type="button" data-tone="blood" className="btn-pixel btn-mini mt-2 w-full" onClick={() => setConfirming(true)}>
              RESETAR
            </button>
          )}
        </div>
      )}
    </PagedBlocks>
  );
}
