// Moldura comum dos sprites vetoriais (grade 40x40 por padrão). `crispEdges`
// mantém a estética de pixel art nítida em qualquer tamanho, sem borrão.
export function PixelSvg({ viewBox = '0 0 40 40', className = '', children }) {
  return (
    <svg viewBox={viewBox} className={`${className} inline-block select-none`} style={{ shapeRendering: 'crispEdges' }} aria-hidden="true">
      {children}
    </svg>
  );
}
