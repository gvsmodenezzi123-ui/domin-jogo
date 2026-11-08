import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/400.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import WideRoom from './components/WideRoom.jsx';
import { applyReducedMotion } from './components/motion.js';
import { loadSettings } from './engine/progress.js';
import { installTouchGuards, installViewportFit, registerServiceWorker } from './pwa.js';
import { installBoneGrain } from './components/art/boneTexture.js';
import { canForceLandscape, enterLandscape } from './components/landscapeLock.js';
import { installPixelSkins } from './components/art/uiPixels.js';

installTouchGuards();
installViewportFit();
installBoneGrain();
installPixelSkins();
registerServiceWorker();
// as animações reduzidas valem desde o 1º quadro (a abertura lê isso ao montar, antes dos efeitos do App)
applyReducedMotion(loadSettings().reducedMotion);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WideRoom />
    <App />
    {/* versão 2.10: o jogo é deitado; em pé no celular, o aviso pede para girar (2.12: onde o
        sistema deixa, o botão trava a tela deitada de novo, se alguém saiu da tela cheia) */}
    <div className="rotate-hint" role="alert" aria-live="polite">
      <span className="rotate-hint-phone" aria-hidden="true" />
      <p className="rotate-hint-title">GIRE O CELULAR</p>
      <p className="rotate-hint-text">O Buxaria é jogado com a tela deitada, como uma mesa de boteco.</p>
      {canForceLandscape() && (
        <button type="button" className="rotate-hint-go" onClick={enterLandscape}>
          DEITAR A TELA
        </button>
      )}
    </div>
  </StrictMode>,
);
