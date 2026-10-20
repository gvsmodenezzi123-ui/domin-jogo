import { DAMAGE } from '../engine/dominoLogic.js';
import { TioZeAvatar } from './OpponentHeader.jsx';
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

/** Tela inicial. O toque em "Sentar à mesa" também destrava o áudio no iOS. */
export default function TitleScreen({ onStart }) {
  const showInstallHint = isIOS() && !isStandalone();
  return (
    <main
      className="title-screen relative flex h-full flex-col items-center justify-between overflow-hidden px-5 text-center"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      <div className="lamp-light pointer-events-none absolute inset-0" />
      <div className="flex flex-col items-center">
        <span className="block h-6 w-[2px] bg-black" />
        <PixelSprite rows={LAMP} palette={LAMP_PALETTE} pixel={5} className="lamp-sprite" />
      </div>

      <div className="relative flex flex-col items-center">
        <TioZeAvatar mood="smug" pixel={7} />
        <h1 className="title-logo mt-5 font-pixel text-[34px] leading-none">BUXARIA</h1>
        <p className="mt-3 font-pixel text-[9px] tracking-widest text-bone-300">DUELO DE DOMINÓ · PATCH 0.1.2</p>
        <p className="mt-4 max-w-[300px] font-term text-xl leading-tight text-bone-200">
          O Tio Zé te espera debaixo da lâmpada. Cada batida custa sangue.
        </p>
      </div>

      <div className="relative w-full max-w-[340px]">
        <ul className="rules-card mb-4 grid grid-cols-2 gap-x-3 gap-y-1 px-4 py-3 text-left font-term text-[17px] leading-tight text-bone-100">
          <li>Batida</li>
          <li className="text-right text-blood-400">−{DAMAGE.normal}♥</li>
          <li>Bucha</li>
          <li className="text-right text-blood-400">−{DAMAGE.bucha}♥</li>
          <li>Cruzada</li>
          <li className="text-right text-blood-400">−{DAMAGE.cruzada}♥</li>
          <li>Tranca (menor soma)</li>
          <li className="text-right text-blood-400">−{DAMAGE.tranca}♥</li>
          <li className="col-span-2 mt-1 text-bone-300">Pontas somando múltiplo de 5: +$3. Compra: 1ª grátis, 2ª $3, 3ª 1♥.</li>
        </ul>
        <button type="button" data-tone="brass" className="btn-pixel w-full text-[12px]" onClick={onStart}>
          SENTAR À MESA
        </button>
        {showInstallHint && (
          <p className="mt-3 font-term text-base text-bone-400">
            Tela cheia: Compartilhar → Adicionar à Tela de Início.
          </p>
        )}
      </div>
    </main>
  );
}
