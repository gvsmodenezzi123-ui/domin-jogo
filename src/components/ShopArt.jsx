import { memo, useEffect, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { paintPortrait, PORTRAIT_PX } from './art/portraitPixels.js';
import { NPC_PORTRAITS } from './art/portraitSpecs.js';
import { PACK_PX, paintCoin, paintCushion, paintDiceCup, paintNiche, paintPack, paintPin, paintTiaoCrate } from './art/shopPixels.js';

/** Abaixo de 1,5× (em pixels do aparelho) o desenho fica suave em vez de perder pixels. */
function smoothStyle(cssW, w) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return (cssW * dpr) / w >= 1.5 || cssW % w === 0 ? undefined : { imageRendering: 'auto' };
}

const SPRITES = {
  almofada: { w: 44, h: 22, paint: () => paintCushion() },
  nicho: { w: 26, h: 24, paint: () => paintNiche() },
  alfinete: { w: 9, h: 12, paint: () => paintPin() },
  copo: { w: 40, h: 40, paint: () => paintDiceCup() },
  moeda: { w: 12, h: 12, paint: () => paintCoin() },
  caixote: { w: 76, h: 44, paint: () => paintTiaoCrate() },
};

/** Versão 2.2: um objeto pintado da loja/porão (almofada, nicho, alfinete, copo, moeda, caixote). */
export const ShopSprite = memo(function ShopSprite({ name, scale = 2, className = '', style }) {
  const s = SPRITES[name];
  return <PixelCanvas cacheKey={`loja-${name}`} paint={s.paint} w={s.w} h={s.h} scale={scale} className={className} style={{ ...smoothStyle(s.w * scale, s.w), ...style }} />;
});

/** Um dos pacotes lacrados (128×128) em `size` px. */
export const PackArt = memo(function PackArt({ id, size = 76, className = '', style }) {
  return (
    <PixelCanvas
      cacheKey={`pacote-${id}`}
      paint={() => paintPack(id)}
      w={PACK_PX}
      h={PACK_PX}
      scale={size / PACK_PX}
      className={className}
      style={{ ...smoothStyle(size, PACK_PX), ...style }}
    />
  );
});

/**
 * O atendente (Valtinho, Seu Tião, o Corvo) em 64×64 só a figura, `size` px. Pisca de vez em
 * quando sozinho e abre a boca enquanto fala (`speaking`).
 */
export const NpcPortrait = memo(function NpcPortrait({ who, size = 128, speaking = false, mood = null, className = '' }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let timer = 0;
    const loop = () => {
      timer = setTimeout(
        () => {
          setBlink(true);
          timer = setTimeout(() => {
            setBlink(false);
            loop();
          }, 150);
        },
        2200 + Math.random() * 3000,
      );
    };
    loop();
    return () => clearTimeout(timer);
  }, []);
  const spec = NPC_PORTRAITS[who];
  const m = blink ? 'blink' : (mood ?? spec.restMood ?? 'idle');
  const open = speaking && !blink;
  return (
    <PixelCanvas
      cacheKey={`npc-${who}-${m}-${open ? 1 : 0}`}
      paint={() => paintPortrait(spec, m, open, true)}
      w={PORTRAIT_PX}
      h={PORTRAIT_PX}
      scale={size / PORTRAIT_PX}
      className={className}
      style={smoothStyle(size, PORTRAIT_PX)}
    />
  );
});
