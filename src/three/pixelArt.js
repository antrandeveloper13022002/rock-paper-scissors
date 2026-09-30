// Turns the game's 2D pixel art (sprites, cards, stages) into Three.js
// textures and voxel grids, so the 3D scene reuses the existing art instead of
// needing external model assets.
import * as THREE from 'three';

// 32x32 grid of CSS colours (null = empty) from a CHARACTER_SPRITES or
// CARD_SPRITES entry (either grid+pal or a rect list).
export function spriteGrid(sprite) {
  const g = Array.from({ length: 32 }, () => new Array(32).fill(null));
  if (sprite.grid) {
    sprite.grid.forEach((row, y) => row.forEach((code, x) => {
      if (code && sprite.pal[code]) g[y][x] = sprite.pal[code];
    }));
  } else {
    for (const r of sprite.rects) {
      for (let y = r.y; y < r.y + r.h; y += 1) for (let x = r.x; x < r.x + r.w; x += 1) if (x < 32 && y < 32) g[y][x] = r.fill;
    }
  }
  return g;
}

// Crisp (nearest-filtered) texture drawn on a small canvas.
export function pixelTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function gridTexture(grid, background = null) {
  return pixelTexture(32, 32, (ctx) => {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 32, 32);
    }
    grid.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }));
  });
}

function fillRects(ctx, color, rects) {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
}

function ridge(ctx, color, base, amp, seed, step) {
  ctx.fillStyle = color;
  for (let x = 0; x <= 360; x += step) {
    const y = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * 0.021 + seed)) - amp * 0.45 * (0.5 + 0.5 * Math.sin(x * 0.067 + seed * 2)));
    ctx.fillRect(x, y, step, 225 - y);
  }
}

// The distant part of a stage (sky → landmark → treeline) as a 360x170 texture;
// the floor is real 3D geometry instead.
export function stageBackdropTexture(stage) {
  return pixelTexture(360, 170, (ctx) => {
    const bands = [[0, 40], [40, 28], [68, 22], [90, 16], [106, 12], [118, 10], [128, 42]];
    bands.forEach(([y, h], i) => fillRects(ctx, stage.sky[i], [[0, y, 360, h]]));
    const stars = [];
    for (let i = 0; i < stage.stars; i += 1) stars.push([(i * 53 + 17) % 360, (i * 29 + 7) % 88, 1, 1]);
    fillRects(ctx, '#f3e2b8', stars);
    fillRects(ctx, stage.moonColor, stage.moon);
    const [farBase, farAmp] = stage.farRidge || [112, 30];
    ridge(ctx, stage.far, farBase, farAmp, 1.3, 6);
    ridge(ctx, stage.mid, 132, 18, 4.1, 4);
    fillRects(ctx, stage.sil, stage.land);
    fillRects(ctx, stage.lit, stage.lights);
    const trees = [];
    for (let x = -4; x < 360; x += 11) {
      const levels = 5 + ((x * 7) % 4);
      for (let k = 0; k < levels; k += 1) trees.push([x + k, 170 - (k + 1) * 3, 2 * (levels - k) + 1, 3]);
    }
    fillRects(ctx, stage.forest, trees);
  });
}

export function stoneFloorTexture(stage) {
  return pixelTexture(40, 18, (ctx) => {
    fillRects(ctx, stage.floor, [[0, 0, 40, 18]]);
    fillRects(ctx, stage.tile, [[0, 0, 40, 1], [0, 9, 40, 1], [0, 1, 1, 8], [20, 1, 1, 8], [10, 10, 1, 8], [30, 10, 1, 8]]);
  });
}
