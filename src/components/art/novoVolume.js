/**
 * Versão 2.48: o visual novo em volume. As peças (novoVolumePx.js) saem de
 * tools/volume/cena/novo/kit.mjs, no mesmo encanamento das salas e do HUD: as tábuas e os botões em
 * 9 fatias, as molduras e os fundinhos dos pontos do mapa, os objetos, a fita, o alfinete, a coroa,
 * a faixa do chefe, a pedra e a moeda. 1 pixel da arte = 1 px do palco de 896 × 414. Os fundos de
 * cada tela (o mapa e as que vierem) chegam à parte, quando precisam (novoBacks.js).
 */
import { NOVO_PX } from './novoVolumePx.js';
import { HUD_PX } from './hudVolumePx.js';

export { NOVO_PX };

/** As peças que viram variáveis do CSS (`--nv-<nome>`). */
export const NOVO_VARS = Object.freeze(['wood', 'dark', 'inset', 'gold', 'tag', 'tag-pick', 'ribbon', 'frame-wood', 'frame-gold', 'frame-grey', 'frame-boss', 'sc-combat', 'sc-combat2', 'sc-combat3', 'sc-shop', 'sc-black', 'sc-coins', 'sc-event', 'sc-lock', 'sc-boss', 'tape', 'pin', 'crown', 'banner', 'dom', 'coin', 'woodbrass', 'niche', 'cushion', 'showcase', 'wood-bm', 'inset-bm', 'woodred-bm', 'blood', 'niche-bm', 'showcase-bm', 'chain']);

/** O objeto de cada desvio do mapa (o engradado da loja, o beco, as moedas, a porta). */
export const NOVO_OBJ = Object.freeze({ shop: 'obj-crate', event: 'obj-alley', coins: 'obj-coins', black: 'obj-door' });

/** Deixa as peças no :root (`--nv-*`), para o CSS, e liga o visual novo em volume (.nv-vol). */
export function installNovoVolume() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const name of NOVO_VARS) root.style.setProperty(`--nv-${name}`, `url(${NOVO_PX[name].url})`);
  root.style.setProperty('--nv-heart', `url(${HUD_PX['heart-14'].url})`);
  root.style.setProperty('--nv-heartx', `url(${HUD_PX['heartx-14'].url})`);
  root.classList.add('nv-vol');
}
