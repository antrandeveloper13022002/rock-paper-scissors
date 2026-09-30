// The two played cards in 3D (WG-03): face-down when a side is ready, flip at
// reveal, then the round-result effect (BR-3D-06). Driven only by the round
// summary the match UI publishes — no game rules here.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CARD_SPRITES } from '../data/cardSprites.js';
import { spriteGrid, gridTexture, pixelTexture } from '../three/pixelArt.js';

const SLOT_Y = 2.2;
const SLOT_Z = 1.6;
const SLOT_X = { me: -0.55, opp: 0.55 };
const FLIP_END = 0.35;
const HIT = 0.45; // moment of impact
const END = 1.3; // everything settled
const SPARKS = 14;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => 1 - (1 - clamp01(v)) ** 3;

// Card back: purple with a gold pixel diamond, like the 2D mockup.
function drawBack(ctx) {
  ctx.fillStyle = '#4b3a7a';
  ctx.fillRect(0, 0, 12, 16);
  ctx.fillStyle = '#2d2250';
  ctx.fillRect(1, 1, 10, 14);
  ctx.fillStyle = '#f2c14e';
  [[5, 4, 2, 1], [4, 5, 4, 1], [3, 6, 6, 1], [3, 7, 6, 2], [3, 9, 6, 1], [4, 10, 4, 1], [5, 11, 2, 1]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
  ctx.fillStyle = '#2d2250';
  ctx.fillRect(5, 7, 2, 2);
}

function useCardTextures() {
  const textures = useMemo(
    () => ({
      ...Object.fromEntries(Object.keys(CARD_SPRITES).map((type) => [type, gridTexture(spriteGrid(CARD_SPRITES[type]), '#3b2718')])),
      back: pixelTexture(12, 16, drawBack),
    }),
    []
  );
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  return textures;
}

// Where a card is at time t (seconds since reveal) for its role in the result.
function pose(role, kind, side, t) {
  const dir = side === 'me' ? -1 : 1; // outward direction
  const p = { x: SLOT_X[side], y: SLOT_Y, z: SLOT_Z, rotY: Math.PI * (1 - ease(t / FLIP_END)), rotZ: 0, scale: 1, opacity: 1, glow: 0 };
  const k = ease((t - HIT) / (END - HIT));
  if (role === 'draw') {
    const bump = Math.sin(clamp01((t - HIT) / 0.3) * Math.PI);
    p.x += -dir * 0.25 * bump + dir * 0.35 * k;
    p.rotZ = dir * -0.35 * k;
    p.opacity = 1 - 0.3 * k;
  } else if (role === 'winner') {
    p.y += 0.12 * k;
    p.scale = 1 + 0.08 * k;
    p.glow = k;
    if (kind === 'bua-keo') p.rotZ = dir * 0.9 * Math.sin(clamp01((t - FLIP_END) / 0.2) * Math.PI); // hammer swing
  } else if (kind === 'bua-keo') {
    // smashed: shake, then crumble downward
    p.x += t > HIT && t < HIT + 0.15 ? Math.sin(t * 90) * 0.05 : 0;
    p.y -= 1.2 * k * k;
    p.rotZ = dir * 1.2 * k;
    p.scale = 1 - 0.8 * k;
  } else if (kind === 'keo-bao') {
    // sliced: tips over and drops
    p.rotZ = dir * 1.4 * k;
    p.x += dir * 0.3 * k;
    p.y -= 0.9 * k;
    p.opacity = 1 - k;
  } else {
    // bao-bua: swallowed into the sack
    p.x += (-dir) * 1.5 * k;
    p.scale = 1 - k;
  }
  return p;
}

function Card3D({ face, back, side, visibleRef, poseRef }) {
  const group = useRef();
  const front = useRef();
  const edge = useRef();
  useFrame(() => {
    const g = group.current;
    g.visible = visibleRef.current[side];
    const p = poseRef.current[side];
    if (!p) return;
    g.position.set(p.x, p.y, p.z);
    g.rotation.set(0, p.rotY, p.rotZ);
    g.scale.setScalar(Math.max(p.scale, 0.001));
    front.current.opacity = p.opacity;
    edge.current.opacity = p.opacity;
    front.current.emissive.setRGB(0.05 * p.glow, 0.035 * p.glow, 0);
    edge.current.color.set(p.glow > 0.05 ? '#f2c14e' : '#2a1a10');
  });
  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.6, 0.84, 0.05]} />
        <meshLambertMaterial ref={edge} attach="material-0" transparent color="#2a1a10" />
        <meshLambertMaterial attach="material-1" transparent color="#2a1a10" />
        <meshLambertMaterial attach="material-2" transparent color="#2a1a10" />
        <meshLambertMaterial attach="material-3" transparent color="#2a1a10" />
        <meshLambertMaterial ref={front} attach="material-4" transparent map={face} />
        <meshLambertMaterial attach="material-5" transparent map={back} />
      </mesh>
    </group>
  );
}

// Voxel spark burst at the impact point.
function Sparks({ timeRef, active, color }) {
  const ref = useRef();
  const dirs = useMemo(
    () => Array.from({ length: SPARKS }, (_, i) => {
      const a = (i / SPARKS) * Math.PI * 2;
      return [Math.cos(a) * (0.6 + (i % 3) * 0.25), Math.sin(a) * (0.6 + (i % 2) * 0.3) + 0.4, (i % 4) * 0.08];
    }),
    []
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  useLayoutEffect(() => {
    ref.current.material.color.set(color);
  }, [color]);
  useFrame(() => {
    const t = timeRef.current - HIT;
    const on = active && t > 0 && t < 0.6;
    ref.current.visible = on;
    if (!on) return;
    const k = ease(t / 0.6);
    dirs.forEach(([dx, dy, dz], i) => {
      m.makeTranslation(dx * k, SLOT_Y + dy * k - 0.8 * k * k, SLOT_Z + 0.2 + dz);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[null, null, SPARKS]} visible={false}>
      <boxGeometry args={[0.08, 0.08, 0.08]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

export function MatchCards({ info, animate }) {
  const faces = useCardTextures();
  const timeRef = useRef(0);
  const poseRef = useRef({ me: null, opp: null });
  const visibleRef = useRef({ me: false, opp: false });
  const revealKey = info?.revealed ? info.turnNumber : null;
  const invalidate = useThree((s) => s.invalidate);
  // On-demand rendering (reduced motion) needs a frame whenever the round changes.
  useEffect(() => invalidate(), [info, invalidate]);

  // Restart the reveal clock each round; with reduced motion jump to the end.
  useEffect(() => {
    timeRef.current = animate ? 0 : END;
  }, [revealKey, animate]);

  // Tap anywhere to fast-forward the reveal (visual only — the pause length is
  // owned by the engine/server).
  useEffect(() => {
    if (revealKey === null) return undefined;
    const skip = () => {
      timeRef.current = Math.max(timeRef.current, END);
    };
    window.addEventListener('pointerdown', skip);
    return () => window.removeEventListener('pointerdown', skip);
  }, [revealKey]);

  const kind = info?.revealed
    ? info.winner === null
      ? 'draw'
      : info.winner === 'me'
      ? `${info.myType}-${info.oppType}`
      : `${info.oppType}-${info.myType}`
    : null;

  useFrame((_, delta) => {
    if (!info) {
      visibleRef.current = { me: false, opp: false };
      return;
    }
    if (info.revealed) {
      timeRef.current = Math.min(timeRef.current + delta, END);
      const t = timeRef.current;
      const role = (side) => (info.winner === null ? 'draw' : info.winner === side ? 'winner' : 'loser');
      poseRef.current = { me: pose(role('me'), kind, 'me', t), opp: pose(role('opp'), kind, 'opp', t) };
      visibleRef.current = { me: true, opp: true };
    } else {
      // face-down cards drop in as each side locks in its pick
      for (const side of ['me', 'opp']) {
        const ready = side === 'me' ? info.myReady : info.oppReady;
        visibleRef.current[side] = ready;
        const prev = poseRef.current[side];
        const startY = SLOT_Y + 1.2;
        const prevY = prev && prev.rotY === Math.PI ? prev.y : startY;
        const y = !animate ? SLOT_Y : ready ? prevY + (SLOT_Y - prevY) * Math.min(1, delta * 10) : startY;
        poseRef.current[side] = { x: SLOT_X[side], y, z: SLOT_Z, rotY: Math.PI, rotZ: 0, scale: 1, opacity: 1, glow: 0 };
      }
    }
  });

  const winnerType = info?.winner === 'me' ? info.myType : info?.winner === 'opp' ? info.oppType : null;
  return (
    <>
      <Card3D face={faces[info?.myType] ?? faces.keo} back={faces.back} side="me" visibleRef={visibleRef} poseRef={poseRef} />
      <Card3D face={faces[info?.oppType] ?? faces.keo} back={faces.back} side="opp" visibleRef={visibleRef} poseRef={poseRef} />
      <Sparks timeRef={timeRef} active={Boolean(info?.revealed)} color={winnerType ? CARD_SPRITES[winnerType].accent : '#ffffff'} />
    </>
  );
}
