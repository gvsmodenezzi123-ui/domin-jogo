import PixelSprite from './PixelSprite.jsx';

/** Retrato 16x16 do rival no humor do momento; a key troca a cada dano para a animação rodar de novo. */
export default function RivalAvatar({ rival, mood = 'idle', pixel = 4, hurtKey }) {
  const rows = rival.faces[mood] ?? rival.faces.idle;
  return (
    <span key={hurtKey} className={`block ${mood === 'hurt' ? 'animate-avatar-hit' : ''}`}>
      <PixelSprite rows={rows} palette={rival.palette} pixel={pixel} title={rival.name} />
    </span>
  );
}
