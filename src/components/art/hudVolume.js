/**
 * Versão 2.47: o HUD em volume. As peças (hudVolumePx.js) saem de tools/volume/cena/ui.mjs, no
 * mesmo encanamento das salas: os corações, o nicho dos talismãs, a caixa de nogueira com as
 * cantoneiras de latão, as bandejas de veludo, a lousa, as teclas e a placa de tábua. 1 pixel da
 * arte = 1 px de CSS.
 */
import { HUD_PX } from './hudVolumePx.js';

export { HUD_PX };

const HEART_SIZES = [7, 8, 9, 11, 12, 13, 14, 16, 18, 20, 24, 27];
const NICHE_SIZES = [24, 26, 28, 30, 32];
const nearest = (list, v) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** O coração em volume mais perto do tamanho `px` (cheio ou apagado). */
export const heartSprite = (px, broken = false) => HUD_PX[`${broken ? 'heartx' : 'heart'}-${nearest(HEART_SIZES, px)}`];
/** O nicho de talismã em volume mais perto da largura `px`. */
export const nicheSprite = (px) => HUD_PX[`niche-${nearest(NICHE_SIZES, px)}`];

/** Deixa as peças das caixas no :root (`--hud-*`), para o CSS, e liga o HUD em volume (.hud-vol). */
export function installHudVolume() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const name of ['case', 'tray-red', 'tray-green', 'slate', 'key-gold-on', 'key-gold-off', 'key-dark-off', 'key-red-on', 'key-gold-down', 'plank']) root.style.setProperty(`--hud-${name}`, `url(${HUD_PX[name].url})`);
  root.classList.add('hud-vol');
}
