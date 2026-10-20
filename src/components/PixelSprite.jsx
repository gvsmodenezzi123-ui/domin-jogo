import { memo, useMemo } from 'react';

/** Junta pixels vizinhos da mesma cor numa linha em um único <rect>. */
function spriteToRects(rows, palette) {
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end += 1;
      rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return rects;
}

/** Renderiza um mapa de pixels como SVG nítido (sem anti-aliasing). */
function PixelSprite({ rows, palette, pixel = 4, className = '', title, style }) {
  const rects = useMemo(() => spriteToRects(rows, palette), [rows, palette]);
  const width = rows[0].length;
  const height = rows.length;
  return (
    <svg
      width={width * pixel}
      height={height * pixel}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

export default memo(PixelSprite);
