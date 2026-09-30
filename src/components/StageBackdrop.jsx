import { useMemo } from 'react';
import { STAGES, DEFAULT_STAGE } from '../data/stages.js';

const rectsPath = (list) => list.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('');

// Stepped (pixel) ridge line across the 360-wide grid.
function ridge(base, amp, seed, step) {
  let d = 'M0 225';
  for (let x = 0; x <= 360; x += step) {
    const y = Math.round(
      base - amp * (0.5 + 0.5 * Math.sin(x * 0.021 + seed)) - amp * 0.45 * (0.5 + 0.5 * Math.sin(x * 0.067 + seed * 2))
    );
    d += ` L${x} ${y} L${x + step} ${y}`;
  }
  return `${d} L360 225 Z`;
}

// Geometry shared by every stage — computed once.
const SHARED = (() => {
  const forest = [];
  for (let x = -4; x < 360; x += 11) {
    const levels = 5 + ((x * 7) % 4);
    for (let k = 0; k < levels; k += 1) forest.push([x + k, 166 - (k + 1) * 3, 2 * (levels - k) + 1, 3]);
  }
  const tiles = [];
  for (let y = 168; y < 225; y += 9) {
    tiles.push([0, y, 360, 1]);
    const off = ((y - 168) / 9) % 2 ? 10 : 0;
    for (let x = off; x < 360; x += 20) tiles.push([x, y + 1, 1, 8]);
  }
  const arena = [];
  const edge = [];
  for (let y = 176; y < 214; y += 2) {
    const t = (y - 195) / 19;
    const half = Math.round(110 * Math.sqrt(Math.max(0, 1 - t * t)));
    arena.push([180 - half, y, half * 2, 2]);
    edge.push([180 - half - 2, y, 2, 2], [180 + half, y, 2, 2]);
  }
  const aurora = [];
  for (let x = 0; x < 360; x += 6) aurora.push([x, 28 + Math.round(6 * Math.sin(x * 0.04)), 6, 3]);
  return {
    forest: rectsPath(forest),
    tiles: rectsPath(tiles),
    arena: rectsPath(arena),
    edge: rectsPath(edge),
    aurora: rectsPath(aurora),
    mid: ridge(132, 18, 4.1, 4),
    posts: rectsPath([[38, 132, 4, 36], [36, 128, 8, 4], [318, 132, 4, 36], [316, 128, 8, 4]]),
    flameOuter: rectsPath([[37, 118, 6, 10], [38, 115, 4, 3], [39, 112, 2, 3], [317, 118, 6, 10], [318, 115, 4, 3], [319, 112, 2, 3]]),
    flameInner: rectsPath([[39, 121, 2, 6], [319, 121, 2, 6]]),
    embers: rectsPath([[46, 108, 1, 1], [34, 100, 1, 1], [50, 94, 1, 1], [312, 104, 1, 1], [326, 98, 1, 1], [322, 90, 1, 1], [120, 150, 1, 1], [200, 142, 1, 1], [150, 132, 1, 1]]),
  };
})();

const SKY_BANDS = [[0, 40], [40, 28], [68, 22], [90, 16], [106, 12], [118, 10], [128, 10]];

// Full-screen pixel-art stage behind the UI. Decorative only (aria-hidden).
export function StageBackdrop({ stageId }) {
  const s = STAGES[stageId] || STAGES[DEFAULT_STAGE];
  const paths = useMemo(() => {
    const stars = [];
    for (let i = 0; i < s.stars; i += 1) stars.push([(i * 53 + 17) % 360, (i * 29 + 7) % 88, 1, 1]);
    const [farBase, farAmp] = s.farRidge || [112, 30];
    return {
      stars: rectsPath(stars),
      moon: rectsPath(s.moon),
      far: ridge(farBase, farAmp, 1.3, 6),
      land: rectsPath(s.land),
      lights: rectsPath(s.lights),
    };
  }, [s]);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden" style={{ background: s.sky[0] }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 360 225"
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
      >
        {SKY_BANDS.map(([y, h], i) => (
          <rect key={i} x="0" y={y} width="360" height={h} fill={s.sky[i]} />
        ))}
        <path d={paths.stars} fill="#f3e2b8" />
        <path d={paths.moon} fill={s.moonColor} />
        {s.aurora && <path d={SHARED.aurora} fill={s.lit} opacity="0.45" />}
        <path d={paths.far} fill={s.far} />
        <path d={SHARED.mid} fill={s.mid} />
        <path d={paths.land} fill={s.sil} />
        <path d={paths.lights} fill={s.lit} />
        <path d={SHARED.forest} fill={s.forest} />
        <rect x="0" y="162" width="360" height="63" fill={s.floor} />
        <path d={SHARED.tiles} fill={s.tile} />
        <path d={SHARED.arena} fill={s.arena} />
        <path d={SHARED.edge} fill={s.edge} />
        <path d={SHARED.posts} fill="#3a2a1e" />
        <path d={SHARED.flameOuter} fill={s.flame[0]} />
        <path d={SHARED.flameInner} fill={s.flame[1]} />
        <path d={SHARED.embers} fill={s.flame[0]} />
      </svg>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 45%, rgba(6,4,14,.7) 100%)' }}
      />
    </div>
  );
}
