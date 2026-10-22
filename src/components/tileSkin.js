import { createContext } from 'react';

/**
 * Skin das pedras comuns da partida (Patch 0.6.3): 'bone' (osso amarelado, Peças Brancas),
 * 'onyx' (ébano preto com pips brancos, Peças Pretas) ou 'silver' (prata escovada com pips
 * vermelho-sangue, Peças Prateadas, Patch 0.9.0). O App decide pelo modo da run;
 * as pedras de grife (Ouro, Rubi, Cristal, Chumbo, Fantasma) nunca mudam.
 */
export const TileSkinContext = createContext('bone');
