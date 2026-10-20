import { ART_EMBER, RIVAL_ART } from './artRegistry.js';
import PixelSprite from './PixelSprite.jsx';

/** Atraso de cada baforada (s): três defasadas fazem a fumaça subir sem parar. */
const PUFF_DELAYS = [0, 0.7, 1.4];

/** De onde sai a fumaça agora (px dentro do retrato), ou null se o cigarro não está aceso. */
function emberSpot(rival, mood, rows, size) {
  const hd = rival.art && ART_EMBER[rival.art];
  if (hd) return hd.moods.includes(mood) ? { x: (hd.x / hd.grid) * size, y: (hd.y / hd.grid) * size } : null;
  const { smoke } = rival;
  if (!smoke || rows[smoke.y]?.[smoke.x] !== smoke.ember) return null; // no "ferido" o cigarro cai da boca
  const pixel = size / rows.length;
  return { x: (smoke.x + 0.5) * pixel, y: (smoke.y - 0.5) * pixel };
}

/**
 * Retrato do rival no humor do momento, com `size` px (ou `pixel` × 16). Quem
 * tem arte de alta densidade (Tio Zé) usa o desenho 40x40, que mexe a boca
 * enquanto ele fala (`speaking`); os outros usam o pixel art 16x16. A key troca
 * a cada dano para a animação de impacto rodar de novo. Quem fuma solta fumaça
 * da brasa do cigarro.
 */
export default function RivalAvatar({ rival, mood = 'idle', pixel = 4, size, hurtKey, smoke = true, speaking = false }) {
  const px = size ?? pixel * 16;
  const rows = rival.faces[mood] ?? rival.faces.idle;
  const Art = rival.art ? RIVAL_ART[rival.art] : null;
  const ember = smoke ? emberSpot(rival, mood, rows, px) : null;
  return (
    <span
      key={hurtKey}
      role="img"
      aria-label={rival.name}
      className={`relative block ${mood === 'hurt' ? 'animate-avatar-hit' : ''}`}
      style={{ width: px, height: px }}
    >
      {Art ? (
        <Art className="block h-full w-full" mood={mood} isSpeaking={speaking} />
      ) : (
        <PixelSprite rows={rows} palette={rival.palette} pixel={px / rows.length} title={rival.name} />
      )}
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
