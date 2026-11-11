import PixelCanvas from './PixelCanvas.jsx';
import { PORTRAIT_PX, paintPortrait } from './art/portraitPixels.js';
import { PORTRAIT_EMBER, PORTRAIT_GLOW, PORTRAITS } from './art/portraitSpecs.js';

/** Atraso de cada baforada (s): três defasadas fazem a fumaça subir sem parar. */
const PUFF_DELAYS = [0, 0.7, 1.4];

/** De onde sai a fumaça agora (px dentro do retrato), ou null se ele não fuma / o cigarro caiu. */
function emberSpot(rival, mood, size) {
  const ember = PORTRAIT_EMBER[rival.art];
  if (!ember || !ember.moods.includes(mood)) return null;
  return { x: (ember.x / ember.grid) * size, y: (ember.y / ember.grid) * size };
}

/** Ampliado menos de 1,5× na tela (em pixels do aparelho), o retrato fica suave em vez de serrilhado. */
function crisp(px) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return px * dpr >= PORTRAIT_PX * 1.5 || px % PORTRAIT_PX === 0;
}

/**
 * Versão 2.1: o retrato do rival em 64×64 (art/portraitPixels.js), pintado com a parede de
 * cada um atrás, para encher a foto da polaroide inteira, com `size` px (ou `pixel` × 16, a
 * medida antiga). A boca abre enquanto ele fala (`speaking`); a key troca a cada dano para a
 * animação de impacto rodar de novo. Quem fuma (Tio Zé, Comendador) solta fumaça da brasa.
 * `bare` pinta só a figura, sem a parede (a silhueta de quem você ainda não conheceu).
 */
export default function RivalAvatar({ rival, mood = 'idle', pixel = 4, size, hurtKey, smoke = true, speaking = false, bare = false }) {
  const px = size ?? pixel * 16;
  const spec = PORTRAITS[rival.art] ?? PORTRAITS.tioZe;
  const ember = smoke ? emberSpot(rival, mood, px) : null;
  const open = Boolean(speaking) && mood !== 'hurt';
  const glow = bare || mood === 'blink' ? null : PORTRAIT_GLOW[rival.art];
  return (
    <span
      key={hurtKey}
      role="img"
      aria-label={rival.name}
      className={`relative block ${mood === 'hurt' ? 'animate-avatar-hit' : ''}`}
      style={{ width: px, height: px }}
    >
      <PixelCanvas
          cacheKey={`retrato-${rival.art}-${mood}-${open ? 1 : 0}${bare ? '-so' : ''}`}
          paint={() => paintPortrait(spec, mood, open, bare)}
          w={PORTRAIT_PX}
          h={PORTRAIT_PX}
          scale={px / PORTRAIT_PX}
          className="rival-portrait block"
          style={crisp(px) ? undefined : { imageRendering: 'auto' }}
        />
      {ember &&
        PUFF_DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="smoke-puff pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-zinc-400 blur-[1px]"
            style={{ left: ember.x - 3, top: ember.y - 3, animationDelay: `${delay}s` }}
          />
        ))}
      {glow &&
        glow.eyes.map((eye) => (
          <span
            key={eye.x}
            aria-hidden="true"
            className="eye-glow pointer-events-none absolute"
            style={{ left: (eye.x / glow.grid) * px, top: ((eye.y + (mood === 'hurt' ? 1 : 0)) / glow.grid) * px, width: (9 / glow.grid) * px, '--glow': glow.color }}
          />
        ))}
    </span>
  );
}
