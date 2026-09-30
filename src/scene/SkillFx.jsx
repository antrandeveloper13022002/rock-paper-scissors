// 3D skill activation (WG-04, BR-3D-06): the skill's pixel glyph extruded into
// voxels rises above the character who used it, with a particle burst and a
// light flash in that character's colour. Visual only.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLYPHS, SKILL_GLYPHS } from '../data/fxGlyphs.js';
import { SIDE_X } from './MatchSceneContext.js';

const DURATION = 1.8;
const PARTICLES = 18;
const VOX = 0.1;

function VoxelGlyph({ name, color, groupRef }) {
  const ref = useRef();
  const cells = useMemo(() => {
    const rows = GLYPHS[name];
    const out = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') out.push([x - (row.length - 1) / 2, (rows.length - 1) / 2 - y, ch === '2' ? '#ffffff' : color]);
    }));
    return out;
  }, [name, color]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    cells.forEach(([x, y, col], i) => {
      m.makeTranslation(x * VOX, y * VOX, 0);
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, c.set(col));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor.needsUpdate = true;
  }, [cells]);

  return (
    <group ref={groupRef}>
      <instancedMesh key={cells.length} ref={ref} args={[null, null, cells.length]}>
        <boxGeometry args={[VOX, VOX, VOX * 1.6]} />
        <meshBasicMaterial transparent />
      </instancedMesh>
    </group>
  );
}

function OneSkill({ by, type, color, lights }) {
  const glyph = useRef();
  const burst = useRef();
  const light = useRef();
  const t0 = useRef(null);
  const x = SIDE_X[by];
  const dirs = useMemo(
    () => Array.from({ length: PARTICLES }, (_, i) => {
      const a = (i / PARTICLES) * Math.PI * 2;
      return [Math.cos(a) * 0.9, 0.8 + (i % 4) * 0.35, Math.sin(a) * 0.9];
    }),
    []
  );
  const m = useMemo(() => new THREE.Matrix4(), []);
  useLayoutEffect(() => {
    burst.current.material.color.set(color);
  }, [color]);

  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    const on = t < DURATION;
    glyph.current.visible = on;
    burst.current.visible = on && t < 0.9;
    if (light.current) light.current.intensity = on ? 8 * Math.max(0, 1 - t / 0.8) : 0;
    if (!on) return;
    const pop = Math.min(1, t / 0.25);
    const fade = Math.min(1, (DURATION - t) / 0.4);
    glyph.current.position.set(x, 2.6 + t * 0.5, 0.8);
    glyph.current.rotation.y = t * 2.5;
    glyph.current.scale.setScalar(pop * (1 + 0.15 * Math.sin(pop * Math.PI)));
    glyph.current.children[0].material.opacity = fade;
    const k = Math.min(1, t / 0.9);
    dirs.forEach(([dx, dy, dz], i) => {
      m.makeTranslation(x + dx * k, 0.4 + dy * k * 2, 0.8 + dz * k);
      burst.current.setMatrixAt(i, m);
    });
    burst.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <VoxelGlyph name={SKILL_GLYPHS[type] || 'spark'} color={color} groupRef={glyph} />
      <instancedMesh ref={burst} args={[null, null, PARTICLES]}>
        <boxGeometry args={[0.09, 0.09, 0.09]} />
        <meshBasicMaterial />
      </instancedMesh>
      {lights && <pointLight ref={light} position={[x, 2.2, 1.4]} color={color} distance={6} intensity={0} />}
    </>
  );
}

// `skills` = [{ by: 'me'|'opp', type, color }], replayed whenever `skillKey` changes.
export function SkillFx({ skills, skillKey, lights }) {
  if (!skills?.length) return null;
  return skills.map((s, i) => <OneSkill key={`${skillKey}-${i}`} {...s} lights={lights} />);
}
