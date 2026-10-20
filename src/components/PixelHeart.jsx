import { HeartGlyph } from './UiGlyphs.jsx';

/**
 * Coração de vida (`size` em px; `pixel` é o tamanho antigo, 1 pixel = 9px de largura).
 * Quando vira "quebrado", o ícone é remontado (key muda) e a rachadura anima uma vez.
 */
export function PixelHeart({ broken = false, pixel = 2, size }) {
  const px = size ?? pixel * 9;
  return (
    <span className="relative inline-block leading-none" aria-hidden="true">
      <span key={broken ? 'broken' : 'full'} className={`inline-block ${broken ? 'animate-heart-crack' : 'heart-alive'}`}>
        <HeartGlyph broken={broken} size={px} className="block" />
      </span>
    </span>
  );
}

export function HeartsBar({ current, max, pixel = 2, size, label }) {
  const hearts = [];
  for (let i = 0; i < max; i += 1) hearts.push(<PixelHeart key={i} broken={i >= current} pixel={pixel} size={size} />);
  return (
    <span className="inline-flex items-center gap-[2px]" role="img" aria-label={label ?? `${current} de ${max} corações`}>
      {hearts}
    </span>
  );
}
