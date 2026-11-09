import { memo, useEffect, useRef } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { TableModIcon } from './art/TableModArt.jsx';
import { BONEYARD_SIZE, paintBoneyard } from './art/tablePixels.js';

/**
 * Dorme no canto da mesa (Patch 0.7.0): a pilha de pedras viradas e quantas ainda
 * restam, grande, no alto à direita do feltro (o balão do rival fala à esquerda e a
 * lâmpada fica no meio). Com 3 ou menos o número fica âmbar; vazio, vermelho. Cada
 * compra dá um pulinho no número.
 * Versão 2.6.1: a pilha e o número viram um bloco só (uma placa com moldura), encostado à
 * direita com 12 px de respiro da madeira (`right`), e o bloco é sempre o mesmo botão: antes
 * ele trocava de <div> para <button> a cada vez de jogar e remontava a pintura da pilha.
 * Versão 2.14: saiu do TableBoard. Deitado, ele mora na lousa do armarinho da direita (`cab`):
 * a pilha em cima, o número a giz embaixo, sem placa própria (a lousa é do armarinho) e sem o
 * preço (quem mostra o preço é a tecla COMPRAR).
 */
export const BoneyardPile = memo(function BoneyardPile({ count, hidden = null, canDraw = false, urge = false, onDraw, drawsUsed = 0, cost = null, right = null, cab = false }) {
  // Fumaça Densa (Patch 0.9.4): o dorme some na fumaça (nem a pilha nem o número aparecem);
  // versão 1.4, Geraldo Coveiro ('cova'): as pedras ficam enterradas, viradas, sem o número
  // Versão 2.0: a pilha é pixel art (art/tablePixels.js) e baixa uma pedra a cada compra
  const tone = hidden === 'smoke' ? 'is-smoke' : hidden === 'cova' ? 'is-cova' : count === 0 ? 'is-empty' : count <= 3 ? 'is-low' : '';
  const shown = hidden === 'cova' ? 7 : count;
  // a pilha dá um pulinho quando muda (sem remontar a pintura: só uma animação em transform)
  const stackRef = useRef(null);
  useEffect(() => {
    stackRef.current?.animate?.([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
  }, [shown]);
  const smoke = hidden === 'smoke';
  const label = smoke
    ? 'Dorme escondido pela fumaça'
    : hidden === 'cova'
      ? 'Dorme enterrado: a quantidade não aparece'
      : count === 0
        ? 'Dorme vazio'
        : `Dorme: ${count} ${count === 1 ? 'pedra restante' : 'pedras restantes'}`;
  // Versão 2.0: tocar no dorme compra (a pedra voa da pilha para a sua mão)
  return (
    <button
      type="button"
      onClick={canDraw ? onDraw : undefined}
      tabIndex={canDraw ? 0 : -1}
      aria-disabled={!canDraw}
      className={`boneyard-pile ${cab ? 'is-cab' : 'absolute z-[7]'} ${canDraw ? 'is-callable' : 'pointer-events-none'} ${urge ? 'is-urge' : ''} ${tone}`}
      style={right === null ? undefined : { right }}
      aria-label={canDraw ? `Comprar do dorme (${smoke ? 'escondido pela fumaça' : label})` : label}
    >
      {smoke ? (
        <span className="boneyard-smoke" aria-hidden="true">
          <TableModIcon icon="smoke" className="h-9 w-9" />
        </span>
      ) : (
        <span ref={stackRef} className="boneyard-stack-px" aria-hidden="true">
          <PixelCanvas cacheKey={`dorme-${Math.min(14, shown)}`} paint={() => paintBoneyard(shown)} w={BONEYARD_SIZE.w} h={BONEYARD_SIZE.h} scale={1} />
        </span>
      )}
      <span className="boneyard-info" aria-hidden="true">
        <span key={count} className="boneyard-count font-pixel text-shadow-pixel">
          {smoke || hidden === 'cova' ? '?' : count}
        </span>
        <span className="boneyard-side">
          <span className="boneyard-label font-pixel">{smoke ? 'FUMAÇA' : hidden === 'cova' ? 'COVA' : count === 0 ? 'VAZIO' : 'DORME'}</span>
          {/* na sua vez, quanto custa a próxima compra (no armarinho, quem mostra é a tecla) */}
          {cost && !smoke && !cab && <span className={`boneyard-cost font-pixel ${cost === 'GRÁTIS' ? 'is-free' : ''}`}>{cost}</span>}
          {/* as 3 compras do turno, a giz */}
          {!smoke && (
            <span className="boneyard-steps" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < drawsUsed ? 'is-used' : ''} />
              ))}
            </span>
          )}
        </span>
      </span>
    </button>
  );
});

/** Versão 2.0: a soma das pontas a giz, numa lousinha no canto da mesa (embaixo do dorme). */
export const EndsSum = memo(function EndsSum({ sum, right = null, cab = false }) {
  if (sum === null || sum === undefined) {
    // no armarinho a linha fica no lugar, apagada, até a primeira pedra
    return cab ? (
      <span className="ends-sum is-cab is-blank font-pixel" aria-hidden="true">
        <span className="ends-sum-label">PONTAS</span>
        <span className="ends-sum-value">Σ–</span>
      </span>
    ) : null;
  }
  const five = sum > 0 && sum % 5 === 0;
  return (
    <span data-tut="sum" className={`ends-sum font-pixel ${cab ? 'is-cab' : ''} ${five ? 'is-five' : ''}`} style={right === null ? undefined : { right }} aria-label={`Soma das pontas: ${sum}`}>
      <span className="ends-sum-label">PONTAS</span>
      <span key={sum} className="ends-sum-value">Σ{sum}</span>
    </span>
  );
});
