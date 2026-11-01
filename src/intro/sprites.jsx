// Versão 2.3: os personagens e peças da abertura saem dos mesmos pintores do jogo (os retratos
// 64×64 de art/portraitPixels.js, os atendentes, o caixote do Seu Tião, o dorme pintado), então
// a abertura fica no mesmo modelo da mesa. Só a lâmpada e o logo continuam vindo dos SVGs (são
// os mesmos da tela inicial, e o último quadro casa com eles).
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import BuxariaLogo from '../components/BuxariaLogo.jsx';
import { paintPortrait } from '../components/art/portraitPixels.js';
import { NPC_PORTRAITS, PORTRAITS } from '../components/art/portraitSpecs.js';
import { paintCoin, paintTiaoCrate } from '../components/art/shopPixels.js';
import { paintBoneyard } from '../components/art/tablePixels.js';
import { LampIcon } from '../components/art/UiIcons.jsx';
import { makeCanvas, svgToCanvas } from './core.js';

/** Monta o componente fora da tela e devolve o <svg> como texto. */
function markupOf(element, w, h) {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(element));
  const svg = host.querySelector('svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.removeAttribute('class');
  const markup = new XMLSerializer().serializeToString(svg);
  root.unmount();
  return markup;
}

const sprite = (element, grid) => svgToCanvas(markupOf(element, grid, grid), grid, grid);

/** Um buffer dos pintores (art/*) num <canvas>. */
function toCanvas(b) {
  const c = makeCanvas(b.w, b.h);
  c.getContext('2d').putImageData(new ImageData(b.data, b.w, b.h), 0, 0);
  return c;
}

/** Retrato do jogo (64×64): `bare` só a figura (sem a parede atrás). */
const portrait = (spec, mood, speaking = false, bare = true) => toCanvas(paintPortrait(spec, mood, speaking, bare));

/** Carrega tudo de uma vez (dura uma fração dos 2 s de tela preta). */
export async function loadIntroSprites({ logoWidth = 1000 } = {}) {
  const cls = 'x';
  const lamp = await sprite(<LampIcon className={cls} />, 40);
  // o logo vetorial, grande e liso (é o mesmo da tela inicial)
  const logoMarkup = markupOf(<BuxariaLogo className={cls} />, logoWidth, Math.round(logoWidth * (15 / 61)));
  const logo = await svgToCanvas(logoMarkup, logoWidth, Math.round(logoWidth * (15 / 61)));
  const tioZe = PORTRAITS.tioZe;
  return {
    tio: {
      idle: portrait(tioZe, 'idle'),
      smug: portrait(tioZe, 'smug'),
      talk: portrait(tioZe, 'smug', true),
      think: portrait(tioZe, 'thinking'),
      blink: portrait(tioZe, 'blink'),
    },
    valtinho: { open: portrait(NPC_PORTRAITS.valtinho, 'smug'), blink: portrait(NPC_PORTRAITS.valtinho, 'blink') },
    corvo: { open: portrait(NPC_PORTRAITS.corvo, 'smug'), blink: portrait(NPC_PORTRAITS.corvo, 'blink') },
    tiao: portrait(NPC_PORTRAITS.seuTiao, 'smug'),
    crate: toCanvas(paintTiaoCrate()),
    coin: toCanvas(paintCoin()),
    comendador: portrait(PORTRAITS.comendador, 'smug', false, false),
    photos: [portrait(PORTRAITS.tonho, 'idle', false, false), portrait(PORTRAITS.cida, 'smug', false, false), portrait(PORTRAITS.beto, 'idle', false, false)],
    boneyard: toCanvas(paintBoneyard(9)),
    lamp,
    logo,
  };
}
