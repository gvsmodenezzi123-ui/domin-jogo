import { memo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { CASE_PX, HINGE_Y, paintCaseClosed, paintCaseLid, paintCaseTray } from './art/casePixels.js';

const FILL = { width: '100%', height: '100%' };
const LID_H = HINGE_Y + 2;
const LID_STYLE = { height: `${(LID_H / CASE_PX) * 100}%` };

/**
 * Versão 2.0: a maleta em 128×128 (art/casePixels.js). Fechada é uma pintura só; aberta é a
 * bandeja (a base vista do alto, com o que vem dentro) e, por cima, a tampa de pé por dentro,
 * numa camada própria (`lidClassName`) para girar a partir da dobradiça em 2.5D.
 */
function MaletaPixel({ id = 'classica', open = false, className = '', lidClassName = '' }) {
  if (!open) {
    return (
      <span className={`maleta-px ${className}`}>
        <PixelCanvas cacheKey={`maleta-${id}`} paint={() => paintCaseClosed(id)} w={CASE_PX} h={CASE_PX} className="maleta-px-layer" style={FILL} />
      </span>
    );
  }
  return (
    <span className={`maleta-px ${className}`}>
      <PixelCanvas cacheKey={`maleta-${id}-bandeja`} paint={() => paintCaseTray(id)} w={CASE_PX} h={CASE_PX} className="maleta-px-layer" style={FILL} />
      <span className={`maleta-px-lid ${lidClassName}`} style={LID_STYLE}>
        <PixelCanvas cacheKey={`maleta-${id}-tampa`} paint={() => paintCaseLid(id)} w={CASE_PX} h={LID_H} style={FILL} />
      </span>
    </span>
  );
}

export default memo(MaletaPixel);
