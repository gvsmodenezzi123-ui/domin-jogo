import { HeartGlyph } from './UiGlyphs.jsx';
import { heartSprite } from './art/hudVolume.js';

/**
 * Coração de vida (`size` em px; `pixel` é o tamanho antigo, 1 pixel = 9px de largura).
 * Quando vira "quebrado", o ícone é remontado (key muda) e a rachadura anima uma vez.
 */
export function PixelHeart({ broken = false, pixel = 2, size, beat = true }) {
  const px = size ?? pixel * 9;
  return (
    <span className="relative inline-block leading-none" aria-hidden="true">
      <span key={broken ? 'broken' : 'full'} className={`inline-block ${broken ? 'animate-heart-crack' : beat ? 'heart-alive' : ''}`}>
        {/* versão 2.47: o coração em volume (art/hudVolume.js, a arte pronta no tamanho mais perto) */}
        {heartSprite(px, broken) ? (
          <img src={heartSprite(px, broken).url} width={px} height={px} alt="" draggable={false} className="block hud-px" />
        ) : (
          <HeartGlyph broken={broken} size={px} className="block" />
        )}
      </span>
    </span>
  );
}

export function HeartsBar({ current, max, pixel = 2, size, label }) {
  const hearts = [];
  // versão 2.45.1: só o último coração vivo bate (cada coração batendo era uma camada na placa
  // de vídeo; na roda de 5, eram 25)
  for (let i = 0; i < max; i += 1) hearts.push(<PixelHeart key={i} broken={i >= current} pixel={pixel} size={size} beat={i === current - 1} />);
  return (
    <span className="inline-flex items-center gap-[2px]" role="img" aria-label={label ?? `${current} de ${max} corações`}>
      {hearts}
    </span>
  );
}
