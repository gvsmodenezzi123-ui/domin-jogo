import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/400.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import WideRoom from './components/WideRoom.jsx';
import { applyReducedMotion } from './components/motion.js';
import { loadSettings } from './engine/progress.js';
import { installTouchGuards, registerServiceWorker } from './pwa.js';
import { installBoneGrain } from './components/art/boneTexture.js';
import { installPixelSkins } from './components/art/uiPixels.js';

installTouchGuards();
installBoneGrain();
installPixelSkins();
registerServiceWorker();
// as animações reduzidas valem desde o 1º quadro (a abertura lê isso ao montar, antes dos efeitos do App)
applyReducedMotion(loadSettings().reducedMotion);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WideRoom />
    <App />
  </StrictMode>,
);
