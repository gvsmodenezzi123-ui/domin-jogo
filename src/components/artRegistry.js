// Liga o campo `art` de data/rivals.js e data/relics.js aos desenhos de alta
// densidade (HighDensitySprites.jsx). Fica separado dos componentes para o
// recarregamento rápido do Vite continuar funcionando.

import { CanecaChoppIcon, DadoViciadoIcon, OlhoVidroIcon, TioZeAvatar } from './HighDensitySprites.jsx';

/** `art` dos rivais → retrato em alta densidade. */
export const RIVAL_ART = Object.freeze({ tioZe: TioZeAvatar });

/** `art` dos talismãs → ícone em alta densidade. */
export const RELIC_ART = Object.freeze({
  canecaChopp: CanecaChoppIcon,
  dadoViciado: DadoViciadoIcon,
  olhoVidro: OlhoVidroIcon,
});

/** Ponta acesa do cigarro do Tio Zé, na grade de 40: a fumaça sobe daqui (não sai quando ele está ferido). */
const TIO_ZE_EMBER = Object.freeze({ x: 35.5, y: 26.5, grid: 40, moods: ['idle', 'thinking', 'smug'] });

/** Brasa de cada retrato de alta densidade (de onde a fumaça sobe). */
export const ART_EMBER = Object.freeze({ tioZe: TIO_ZE_EMBER });
