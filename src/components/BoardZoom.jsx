import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DominoTile from './DominoTile.jsx';

/**
 * Versão 2.16: "ver a mesa". As pedras jogadas vistas de cima, sem a perspectiva, no maior
 * tamanho que cabe na tela (a serpente inteira enquadrada). Toque em qualquer lugar para fechar.
 * Só olha: não joga, não mexe em nada da partida.
 */
export default function BoardZoom({ tiles, enhancementOf, onClose }) {
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onSize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('resize', onSize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onSize);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  if (!tiles.length) return null;
  const x0 = Math.min(...tiles.map((t) => t.x));
  const y0 = Math.min(...tiles.map((t) => t.y));
  const x1 = Math.max(...tiles.map((t) => t.x + t.w));
  const y1 = Math.max(...tiles.map((t) => t.y + t.h));
  const cols = x1 - x0;
  const rows = y1 - y0;
  // a casa (meia pedra) em px inteiros: o maior que cabe, até 56
  const cell = Math.max(10, Math.min(56, Math.floor((view.w - 48) / cols), Math.floor((view.h - 76) / rows)));
  const unit = cell - 2;
  return createPortal(
    <div className="board-zoom" role="dialog" aria-modal="true" aria-label="A mesa vista de cima" onClick={onClose}>
      <p className="board-zoom-title font-pixel">A MESA</p>
      <div className="board-zoom-world" style={{ width: cols * cell, height: rows * cell }}>
        {tiles.map((tile) => {
          const horizontal = tile.orientation === 'horizontal';
          const w = horizontal ? unit * 2 : unit;
          const h = horizontal ? unit : unit * 2;
          return (
            <div key={tile.id} className="absolute" style={{ left: (tile.x - x0) * cell + (tile.w * cell - w) / 2, top: (tile.y - y0) * cell + (tile.h * cell - h) / 2 }}>
              <DominoTile values={tile.values} orientation={tile.lineAxis} onBoard unit={unit} enhancement={enhancementOf.get(tile.id)} openEnd={tile.isOpenEnd} still depth={4} />
            </div>
          );
        })}
      </div>
      <p className="board-zoom-hint font-pixel">TOQUE PARA VOLTAR</p>
    </div>,
    document.body,
  );
}
