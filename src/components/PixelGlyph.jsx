import { GLYPHS } from '../data/fxGlyphs.js';

export function PixelGlyph({ name, color, color2 = '#ffffff', size = 32, className = '', style }) {
  const rows = GLYPHS[name];
  const w = rows[0].length;
  const h = rows.length;
  const fill = { 1: color, 2: color2 };
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {rows.flatMap((row, y) =>
        [...row].flatMap((ch, x) => (fill[ch] ? [<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={fill[ch]} />] : []))
      )}
    </svg>
  );
}
