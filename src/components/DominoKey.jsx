import PixelCanvas from './PixelCanvas.jsx';
import { paintDominoKey } from './art/hudPixels.js';

/**
 * Versão 2.11: a tecla das telas deitadas, uma pedra de dominó deitada (pintada) com o texto
 * por cima. A principal é de marfim (`ivory`); as outras, pretas (`ebony`); a de apagar,
 * vermelha (`blood`). `w`/`h` em unidades do palco (a pintura tem a metade).
 */
export default function DominoKey({ label, note, pips, tone = 'ebony', w = 320, h = 50, onClick, className = '', disabled = false, type = 'button', ...rest }) {
  const pw = Math.round(w / 2);
  const ph = Math.round(h / 2);
  return (
    <button type={type} className={`tl-key is-${tone} ${className}`} style={{ width: w, height: h }} onClick={onClick} disabled={disabled} {...rest}>
      <PixelCanvas cacheKey={`tecla-${tone}-${pips}-${pw}x${ph}`} paint={() => paintDominoKey(pw, ph, { tone, pips })} w={pw} h={ph} scale={2} className="tl-key-art" />
      <span className="tl-key-text" style={{ left: ph * 2 + 4 }}>
        <span className="tl-key-label">{label}</span>
        {note && <span className="tl-key-note">{note}</span>}
      </span>
    </button>
  );
}
