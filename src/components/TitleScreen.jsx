import { useState } from 'react';
import { TOTAL_NODES, nodeAt } from '../data/campaign.js';
import { getRival } from '../data/rivals.js';
import CollectionBook from './CollectionBook.jsx';
import MenuModal from './MenuModal.jsx';
import OptionsPanel from './OptionsPanel.jsx';
import PixelSprite from './PixelSprite.jsx';
import { LAMP, LAMP_PALETTE } from './sprites.js';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function PlayMenu({ save, onNewGame, onContinue }) {
  const [confirm, setConfirm] = useState(false);
  const next = save ? getRival(nodeAt(save.node).rivalId) : null;
  return (
    <div className="grid gap-2.5">
      <button
        type="button"
        data-tone="brass"
        className="btn-pixel flex flex-col items-center gap-1 py-3"
        disabled={!save}
        onClick={onContinue}
      >
        <span className="text-[11px]">CONTINUAR</span>
        <span className="font-term text-[16px] normal-case leading-none text-ink/80">
          {save ? `Nó ${save.node + 1}/${TOTAL_NODES} · ${next?.name} · ${save.hearts}♥ · $${save.coins}` : 'Nenhuma run salva'}
        </span>
      </button>
      {confirm ? (
        <div className="options-danger grid gap-2 px-3 py-2.5">
          <p className="font-term text-[17px] leading-tight text-bone-200">Começar do zero apaga a run salva. Certeza?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-pixel btn-mini" onClick={() => setConfirm(false)}>
              VOLTAR
            </button>
            <button type="button" data-tone="blood" className="btn-pixel btn-mini" onClick={onNewGame}>
              NOVO JOGO
            </button>
          </div>
        </div>
      ) : (
        <button type="button" data-tone="blood" className="btn-pixel py-3 text-[11px]" onClick={save ? () => setConfirm(true) : onNewGame}>
          NOVO JOGO
        </button>
      )}
    </div>
  );
}

function Credits() {
  return (
    <div className="grid gap-3 text-center font-term text-[18px] leading-tight text-bone-200">
      <p>
        <span className="block font-pixel text-[9px] text-brass-300">BUXARIA · PATCH 0.4</span>
        Dominó de boteco, um contra um, até alguém zerar os corações.
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">NA MESA</span>
        Tio Zé, Seu Arlindo, Beto Cigano, o Comendador e mais 14 figuras da noite.
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">SOM</span>
        Tudo sintetizado na hora (Web Audio): nenhuma gravação.
      </p>
      <p>
        <span className="block font-pixel text-[8px] text-bone-400">FEITO COM</span>
        React, Vite, Tailwind e muita pedra batida.
      </p>
      <p className="text-bone-400">Jogue com moderação. O boteco fecha às 2h.</p>
    </div>
  );
}

/**
 * Tela inicial: lâmpada, logo e o menu. O primeiro toque também destrava o
 * áudio no iOS. 3 toques no logo liberam o painel DEV.
 */
export default function TitleScreen({
  save,
  onNewGame,
  onContinue,
  settings,
  onSettings,
  onResetProgress,
  collection,
  onSecretTap,
  onTap,
  devUnlocked = false,
}) {
  const [modal, setModal] = useState(null);
  const showInstallHint = isIOS() && !isStandalone();
  const open = (id) => {
    onTap?.();
    setModal(id);
  };
  const close = () => {
    onTap?.();
    setModal(null);
  };

  return (
    <main
      className="title-screen relative flex h-full flex-col items-center overflow-hidden px-6 text-center"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      <div className="title-cone pointer-events-none absolute inset-0" />
      <div className="lamp-light pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-center">
        <span className="block h-10 w-[3px] bg-black" />
        <PixelSprite rows={LAMP} palette={LAMP_PALETTE} pixel={7} className="lamp-sprite title-lamp" />
      </div>

      <div className="relative mt-[9vh] flex flex-col items-center">
        <h1 className="title-logo font-pixel text-[40px] leading-none" onClick={onSecretTap}>
          BUXARIA
        </h1>
        <p className="mt-4 font-pixel text-[8px] tracking-widest text-bone-400">
          PATCH 0.4{devUnlocked && <span className="text-[#8fd6b4]"> · DEV</span>}
        </p>
      </div>

      <nav className="relative mt-auto grid w-full max-w-[280px] gap-2.5" aria-label="Menu principal">
        <button type="button" data-tone="brass" className="btn-pixel title-btn" onClick={() => open('play')}>
          JOGAR
        </button>
        <button type="button" className="btn-pixel title-btn" onClick={() => open('options')}>
          OPÇÕES
        </button>
        <button type="button" className="btn-pixel title-btn" onClick={() => open('book')}>
          COLEÇÕES
        </button>
        <button type="button" className="btn-pixel title-btn" onClick={() => open('credits')}>
          CRÉDITOS
        </button>
        {showInstallHint && (
          <p className="mt-1 font-term text-base text-bone-400">Tela cheia: Compartilhar → Adicionar à Tela de Início.</p>
        )}
      </nav>

      {modal === 'play' && (
        <MenuModal id="play-title" title="JOGAR" onClose={close}>
          <PlayMenu save={save} onNewGame={onNewGame} onContinue={onContinue} />
        </MenuModal>
      )}
      {modal === 'options' && (
        <MenuModal id="options-title" title="OPÇÕES" onClose={close}>
          <OptionsPanel settings={settings} onChange={onSettings} onResetProgress={onResetProgress} />
        </MenuModal>
      )}
      {modal === 'book' && (
        <MenuModal id="book-title" title="LIVRO DE BOTECO" onClose={close} wide>
          <CollectionBook collection={collection} />
        </MenuModal>
      )}
      {modal === 'credits' && (
        <MenuModal id="credits-title" title="CRÉDITOS DA MESA" onClose={close}>
          <Credits />
        </MenuModal>
      )}
    </main>
  );
}
