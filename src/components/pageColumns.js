import { createContext } from 'react';

/**
 * Versão 2.11: em quantas colunas as páginas (PagedBlocks) se repartem. As janelas deitadas
 * (MenuModal, o fim da run) põem 2 ou 3: o que em pé virava 3 páginas cabe numa só, lado a lado.
 */
export const PageColumnsContext = createContext(1);
