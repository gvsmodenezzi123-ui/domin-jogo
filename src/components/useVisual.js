import { useSyncExternalStore } from 'react';
import { currentVisual, subscribeVisual } from './motion.js';

/** Versão 2.20: true no visual novo (OPÇÕES → VISUAL), false no clássico. */
export const useNovo = () => useSyncExternalStore(subscribeVisual, currentVisual, () => 'novo') === 'novo';
