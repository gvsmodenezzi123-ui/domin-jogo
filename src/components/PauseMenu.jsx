import { useState } from 'react';
import OptionsPanel from './OptionsPanel.jsx';

/** Pausa: o rival espera enquanto o menu está aberto. */
export default function PauseMenu({ rivalName = 'O rival', muted, onToggleMute, onResume, onQuit, settings, onSettings }) {
  const [options, setOptions] = useState(false);
  return (
    <div className="overlay-backdrop fixed inset-0 z-[70] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="overlay-card max-h-[90%] w-full max-w-[300px] overflow-y-auto px-5 py-6 text-center">
        <h2 id="pause-title" className="font-pixel text-[16px] text-bone-50 text-shadow-pixel">
          {options ? 'OPÇÕES' : 'PAUSA'}
        </h2>
        {options ? (
          <div className="mt-4 text-left">
            <OptionsPanel settings={settings} onChange={onSettings} />
            <button type="button" className="btn-pixel mt-4 w-full" onClick={() => setOptions(false)}>
              VOLTAR
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 font-term text-lg text-bone-300">{rivalName} acende outro cigarro e espera.</p>
            <div className="mt-5 grid gap-2">
              <button type="button" data-tone="brass" className="btn-pixel" onClick={onResume}>
                CONTINUAR
              </button>
              <button type="button" className="btn-pixel" onClick={onToggleMute} aria-pressed={muted}>
                {muted ? 'SOM: DESLIGADO' : 'SOM: LIGADO'}
              </button>
              <button type="button" className="btn-pixel" onClick={() => setOptions(true)}>
                OPÇÕES
              </button>
              <button type="button" data-tone="blood" className="btn-pixel" onClick={onQuit}>
                SAIR PARA O MENU
              </button>
              <p className="font-term text-[15px] leading-tight text-bone-400">A run fica salva no mapa; esta mesa recomeça.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
