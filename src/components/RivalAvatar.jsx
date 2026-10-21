import { ART_EMBER, RIVAL_ART } from './artRegistry.js';

/** Atraso de cada baforada (s): três defasadas fazem a fumaça subir sem parar. */
const PUFF_DELAYS = [0, 0.7, 1.4];

/** De onde sai a fumaça agora (px dentro do retrato), ou null se ele não fuma / o cigarro caiu. */
function emberSpot(rival, mood, size) {
  const ember = ART_EMBER[rival.art];
  if (!ember || !ember.moods.includes(mood)) return null;
  return { x: (ember.x / ember.grid) * size, y: (ember.y / ember.grid) * size };
}

/**
 * Retrato 40x40 do rival (ArtSprites.jsx) no humor do momento, com `size` px
 * (ou `pixel` × 16, a medida antiga). A boca abre enquanto ele fala
 * (`speaking`); a key troca a cada dano para a animação de impacto rodar de
 * novo. Quem fuma (Tio Zé, Comendador) solta fumaça da brasa.
 */
export default function RivalAvatar({ rival, mood = 'idle', pixel = 4, size, hurtKey, smoke = true, speaking = false }) {
  const px = size ?? pixel * 16;
  const Art = RIVAL_ART[rival.art];
  const ember = smoke ? emberSpot(rival, mood, px) : null;
  return (
    <span
      key={hurtKey}
      role="img"
      aria-label={rival.name}
      className={`relative block ${mood === 'hurt' ? 'animate-avatar-hit' : ''}`}
      style={{ width: px, height: px }}
    >
      {Art && <Art className="block h-full w-full" mood={mood} isSpeaking={speaking} />}
      {ember &&
        PUFF_DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="smoke-puff pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-zinc-400 blur-[1px]"
            style={{ left: ember.x - 3, top: ember.y - 3, animationDelay: `${delay}s` }}
          />
        ))}
    </span>
  );
}
