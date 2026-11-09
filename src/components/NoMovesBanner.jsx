import { memo } from 'react';

/**
 * Faixa de alto contraste no centro do feltro quando a sua vez acaba sem saída
 * (3 compras sem encaixe, ou não dá para comprar de novo): "SEM JOGADA! A VEZ
 * PASSOU" (versão 2.14: o letreiro dos avisos da mesa, sem escurecer a tela). O App
 * toca o som descendente junto e manda o passe forçado quando ela some. Só
 * transform/opacity animam (GPU no Safari).
 */
function NoMovesBanner() {
  return (
    <div className="no-moves-layer pointer-events-none absolute inset-0 z-40 flex items-center justify-center" role="alert" aria-live="assertive">
      <div className="no-moves-banner">
        <span className="no-moves-line no-moves-line-top">SEM JOGADA!</span>
        <span className="no-moves-line no-moves-line-bottom">A VEZ PASSOU</span>
      </div>
    </div>
  );
}

export default memo(NoMovesBanner);
