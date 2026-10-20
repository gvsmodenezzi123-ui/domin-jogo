import PixelSprite from './PixelSprite.jsx';

/** Atraso de cada baforada (s): três defasadas fazem a fumaça subir sem parar. */
const PUFF_DELAYS = [0, 0.7, 1.4];

/** A brasa do cigarro está acesa nesse humor? (no "ferido" o cigarro cai da boca) */
function emberLit(rival, rows) {
  const { smoke } = rival;
  return Boolean(smoke && rows[smoke.y]?.[smoke.x] === smoke.ember);
}

/**
 * Retrato 16x16 do rival no humor do momento; a key troca a cada dano para a
 * animação rodar de novo. Quem fuma (Tio Zé) solta fumaça da brasa do cigarro.
 */
export default function RivalAvatar({ rival, mood = 'idle', pixel = 4, hurtKey, smoke = true }) {
  const rows = rival.faces[mood] ?? rival.faces.idle;
  const puffing = smoke && emberLit(rival, rows);
  return (
    <span key={hurtKey} className={`relative block ${mood === 'hurt' ? 'animate-avatar-hit' : ''}`}>
      <PixelSprite rows={rows} palette={rival.palette} pixel={pixel} title={rival.name} />
      {puffing &&
        PUFF_DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="smoke-puff pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-zinc-400 blur-[1px]"
            style={{
              left: (rival.smoke.x + 0.5) * pixel - 3,
              top: (rival.smoke.y - 0.5) * pixel - 3,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
    </span>
  );
}
