// Renders 32x32 pixel-art sprites authored either as a color-code grid + palette,
// or as a flat list of {x,y,w,h,fill} rects (more compact for large flat regions).
export function Sprite({ grid, pal, rects, size = 128, flip = false }) {
  const content = grid
    ? grid.flatMap((row, y) =>
        row.flatMap((code, x) =>
          code && pal[code] ? [<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={pal[code]} />] : []
        )
      )
    : rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />);

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      <g transform={flip ? 'translate(32,0) scale(-1,1)' : undefined}>{content}</g>
    </svg>
  );
}
