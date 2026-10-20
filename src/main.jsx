import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/400.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installTouchGuards, registerServiceWorker } from './pwa.js';

installTouchGuards();
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
