import { useState } from 'react';
import OptionsPanel from './OptionsPanel.jsx';
import SeedChip from './SeedChip.jsx';
import DominoKey from './DominoKey.jsx';
import LandStage from './LandStage.jsx';
import { useLandscape } from './useLandscape.js';

/**
 * Pausa: o rival espera enquanto o menu está aberto.
 * Patch 0.9.5: `tutorial` ('first' | 'replay' | null) troca os avisos na partida de treino.
 * Patch 0.9.3: sem scroll (as opções se repartem em páginas quando a tela é baixa).
 */
export default function PauseMenu({ rivalName = 'O rival', seedCode = null, muted, onToggleMute, onResume, onQuit, settings, onSettings, tutorial = null }) {
  const [options, setOptions] = useState(false);
  const landscape = useLandscape();
  const waitLine = tutorial ? `${rivalName} limpa os óculos e espera.` : `${rivalName} acende outro cigarro e espera.`;
  const quitNote =
    tutorial === 'first' ? 'Saindo agora, o treino recomeça no próximo NOVO JOGO.' : tutorial === 'replay' ? 'Saindo agora, o treino acaba aqui.' : 'A run fica salva no mapa; esta mesa recomeça.';
  // versão 2.11, deitado: o quadro de giz no meio da mesa escurecida, com as pedras de dominó
  if (landscape) {
    return (
      <div className="pause-land overlay-backdrop fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <LandStage bleed="transparent" label={options ? 'Opções' : 'Pausa'} role="presentation">
          <div className="pl-board">
            {options ? (
              <div className="pl-options">
                <h2 id="pause-title" className="pl-title">
                  OPÇÕES
                </h2>
                <div className="pl-options-body">
                  <OptionsPanel settings={settings} onChange={onSettings} />
                </div>
                <DominoKey label="VOLTAR" pips={1} w={200} h={46} onClick={() => setOptions(false)} />
              </div>
            ) : (
              <>
                <div className="pl-left">
                  <h2 id="pause-title" className="pl-title">
                    PAUSA
                  </h2>
                  <p className="pl-line">{waitLine}</p>
                  <SeedChip code={seedCode} className="pause-seed pl-seed" />
                </div>
                <div className="pl-keys">
                  <DominoKey label="CONTINUAR" pips={6} tone="ivory" w={300} h={56} className="is-main" onClick={onResume} />
                  <DominoKey label={muted ? 'SOM: DESLIGADO' : 'SOM: LIGADO'} pips={muted ? 0 : 3} w={300} h={46} onClick={onToggleMute} aria-pressed={muted} />
                  <DominoKey label="OPÇÕES" pips={4} w={300} h={46} onClick={() => setOptions(true)} />
                  <DominoKey label="SAIR PARA O MENU" pips={1} tone="blood" w={300} h={46} onClick={onQuit} />
                  <p className="pl-note">{quitNote}</p>
                </div>
              </>
            )}
          </div>
        </LandStage>
      </div>
    );
  }
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
            {/* Patch 0.9.5: no treino quem espera é o Vô Juca */}
            <p className="mt-2 font-term text-lg text-bone-300">{waitLine}</p>
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
              <p className="font-term text-[15px] leading-tight text-bone-400">{quitNote}</p>
            </div>
            {/* Patch 0.9.2: a semente da run no canto, para copiar e repetir */}
            <SeedChip code={seedCode} className="pause-seed mt-4" />
          </>
        )}
      </div>
    </div>
  );
}
