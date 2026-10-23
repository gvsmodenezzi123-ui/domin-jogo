import { useState } from 'react';
import OptionsPanel from './OptionsPanel.jsx';
import SeedChip from './SeedChip.jsx';

/**
 * Pausa: o rival espera enquanto o menu está aberto.
 * Patch 0.9.5: `tutorial` ('first' | 'replay' | null) troca os avisos na partida de treino.
 * Patch 0.9.3: sem scroll (as opções se repartem em páginas quando a tela é baixa).
 */
export default function PauseMenu({ rivalName = 'O rival', seedCode = null, muted, onToggleMute, onResume, onQuit, settings, onSettings, tutorial = null }) {
  const [options, setOptions] = useState(false);
  return (
    <div className="overlay-backdrop fixed inset-0 z-[70] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="overlay-card pause-card flex max-h-[92%] w-full max-w-[300px] flex-col overflow-hidden px-5 py-6 text-center">
        <h2 id="pause-title" className="shrink-0 font-pixel text-[16px] text-bone-50 text-shadow-pixel">
          {options ? 'OPÇÕES' : 'PAUSA'}
        </h2>
        {options ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col text-left">
            <OptionsPanel settings={settings} onChange={onSettings} />
            <button type="button" className="btn-pixel mt-4 w-full shrink-0" onClick={() => setOptions(false)}>
              VOLTAR
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 font-term text-lg text-bone-300">
              {/* Patch 0.9.5: no treino quem espera é o Vô Juca */}
              {tutorial ? `${rivalName} limpa os óculos e espera.` : `${rivalName} acende outro cigarro e espera.`}
            </p>
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
              <p className="font-term text-[15px] leading-tight text-bone-400">
                {tutorial === 'first'
                  ? 'Saindo agora, o treino recomeça no próximo NOVO JOGO.'
                  : tutorial === 'replay'
                    ? 'Saindo agora, o treino acaba aqui.'
                    : 'A run fica salva no mapa; esta mesa recomeça.'}
              </p>
            </div>
            {/* Patch 0.9.2: a semente da run no canto, para copiar e repetir */}
            <SeedChip code={seedCode} className="pause-seed mt-4" />
          </>
        )}
      </div>
    </div>
  );
}
