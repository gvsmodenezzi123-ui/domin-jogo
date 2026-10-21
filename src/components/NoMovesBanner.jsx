import { memo } from 'react';

/**
 * Faixa de alto contraste no centro do feltro quando a sua vez acaba sem saída
 * (3 compras sem encaixe, ou não dá para comprar de novo): "SEM JOGADAS
 * DISPONÍVEIS! TURNO PASSADO!". O App toca o som descendente junto e manda o
 * passe forçado quando ela some. Só transform/opacity animam (GPU no Safari).
 */
function NoMovesBanner() {
  return (
    <div className="no-moves-layer pointer-events-none absolute inset-0 z-40 flex items-center justify-center" role="alert" aria-live="assertive">
      <div className="no-moves-banner">
        <span className="no-moves-line no-moves-line-top">SEM JOGADAS DISPONÍVEIS!</span>
        <span className="no-moves-line no-moves-line-bottom">TURNO PASSADO!</span>
      </div>
    </div>
  );
}

export default memo(NoMovesBanner);
