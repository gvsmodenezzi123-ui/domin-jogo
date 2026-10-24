// Os personagens e peças do jogo, convertidos dos SVGs de pixel art em canvas para a abertura.
// Assim a cena usa exatamente os mesmos retratos da mesa (Tio Zé, Valtinho, Seu Tião, Corvo,
// Comendador e as fotos do Tonho, da Cida e do Beto), a lâmpada e o logo da tela inicial.
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import BuxariaLogo from '../components/BuxariaLogo.jsx';
import { TioZeAvatar } from '../components/ArtSprites.jsx';
import { CorvoSprite, TiaoMoedasSprite } from '../components/art/NecroticArt.jsx';
import { TonhoAvatar } from '../components/art/RivalsRegion1.jsx';
import { BetoAvatar, CidaAvatar } from '../components/art/RivalsRegion2.jsx';
import { ComendadorAvatar } from '../components/art/RivalsRegion3.jsx';
import { ValtinhoSprite } from '../components/art/SceneArt.jsx';
import { LampIcon } from '../components/art/UiIcons.jsx';
import { clearBackdrop, svgToCanvas } from './core.js';

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

/** O fundo escuro atrás da cabeça dos retratos (quase preto, frio). */
const isBackdrop = (r, g, b) => r < 22 && g < 22 && b < 30;

/** Carrega tudo de uma vez (dura uma fração dos 2 s de tela preta). */
export async function loadIntroSprites({ logoWidth = 1000 } = {}) {
  const cls = 'x';
  const [tioIdle, tioSmug, tioTalk, tioThink, valtinho, valtinhoBlink, corvo, corvoBlink, tiao, comendador, tonho, cida, beto, lamp] = await Promise.all([
    sprite(<TioZeAvatar className={cls} mood="idle" />, 40),
    sprite(<TioZeAvatar className={cls} mood="smug" />, 40),
    sprite(<TioZeAvatar className={cls} mood="smug" isSpeaking />, 40),
    sprite(<TioZeAvatar className={cls} mood="thinking" />, 40),
    sprite(<ValtinhoSprite className={cls} />, 48),
    sprite(<ValtinhoSprite className={cls} blink />, 48),
    sprite(<CorvoSprite className={cls} />, 48),
    sprite(<CorvoSprite className={cls} blink />, 48),
    sprite(<TiaoMoedasSprite className={cls} />, 48),
    sprite(<ComendadorAvatar className={cls} />, 40),
    sprite(<TonhoAvatar className={cls} />, 40),
    sprite(<CidaAvatar className={cls} />, 40),
    sprite(<BetoAvatar className={cls} />, 40),
    sprite(<LampIcon className={cls} />, 40),
  ]);
  // o logo vetorial, grande e liso (é o mesmo da tela inicial)
  const logoMarkup = markupOf(<BuxariaLogo className={cls} />, logoWidth, Math.round(logoWidth * (15 / 61)));
  const logo = await svgToCanvas(logoMarkup, logoWidth, Math.round(logoWidth * (15 / 61)));
  const cut = (c) => clearBackdrop(c, isBackdrop);
  return {
    tio: { idle: cut(tioIdle), smug: cut(tioSmug), talk: cut(tioTalk), think: cut(tioThink) },
    valtinho: { open: valtinho, blink: valtinhoBlink },
    corvo: { open: corvo, blink: corvoBlink },
    tiao,
    comendador,
    photos: [tonho, cida, beto],
    lamp,
    logo,
  };
}
