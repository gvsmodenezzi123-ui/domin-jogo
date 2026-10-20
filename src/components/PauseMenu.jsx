/** Pausa: o Tio Zé espera enquanto o menu está aberto. */
export default function PauseMenu({ muted, onToggleMute, onResume, onQuit }) {
  return (
    <div className="overlay-backdrop fixed inset-0 z-[70] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="overlay-card w-full max-w-[300px] px-5 py-6 text-center">
        <h2 id="pause-title" className="font-pixel text-[16px] text-bone-50 text-shadow-pixel">
          PAUSA
        </h2>
        <p className="mt-2 font-term text-lg text-bone-300">O Tio Zé acende outro cigarro e espera.</p>
        <div className="mt-5 grid gap-2">
          <button type="button" data-tone="brass" className="btn-pixel" onClick={onResume}>
            CONTINUAR
          </button>
          <button type="button" className="btn-pixel" onClick={onToggleMute} aria-pressed={muted}>
            {muted ? 'SOM: DESLIGADO' : 'SOM: LIGADO'}
          </button>
          <button type="button" data-tone="blood" className="btn-pixel" onClick={onQuit}>
            SAIR DO DUELO
          </button>
        </div>
      </div>
    </div>
  );
}
