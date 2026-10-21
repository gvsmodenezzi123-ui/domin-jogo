import { createContext } from 'react';

/**
 * Skin das pedras comuns da partida (Patch 0.6.3): 'bone' (osso amarelado, Maleta Branca)
 * ou 'onyx' (ébano preto com pips brancos, Maleta Preta). O App decide pelo modo da run;
 * as pedras de grife (Ouro, Rubi, Cristal, Chumbo, Fantasma) nunca mudam.
 */
export const TileSkinContext = createContext('bone');
