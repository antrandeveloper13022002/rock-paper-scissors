import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { spriteGrid, stageBackdropTexture, stoneFloorTexture } from '../three/pixelArt.js';

const VOXEL = 0.06; // world size of one sprite pixel
const DEPTH = 3; // voxels of thickness

// A 32x32 sprite extruded into voxels: one InstancedMesh = one draw call.
// The middle layer is only kept on the silhouette edge — inside it is hidden
// by the front and back layers (~1/3 fewer triangles).
// `mood`: 'win' bounces, 'lose' slumps back (after a match, WG-05).
export function VoxelSprite({ sprite, position, flip = false, phase = 0, animate = true, mood = null, scale = 1 }) {
  const ref = useRef();
  const cells = useMemo(() => {
    const grid = spriteGrid(sprite);
    const filled = (x, y) => Boolean(grid[y]?.[x]);
    const out = [];
    grid.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      for (let z = 0; z < DEPTH; z += 1) if (z === 0 || z === DEPTH - 1 || edge) out.push([x, y, z, c]);
    }));
    return out;
  }, [sprite]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    cells.forEach(([x, y, z, c], i) => {
      const px = (flip ? 31 - x : x) - 15.5;
      m.makeTranslation(px * VOXEL, (31 - y) * VOXEL, (z - DEPTH / 2) * VOXEL);
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, color.set(c));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor.needsUpdate = true;
  }, [cells, flip]);

  useFrame(({ clock }) => {
    const m = ref.current;
    m.scale.setScalar(scale);
    m.rotation.x = mood === 'lose' ? -0.35 : 0;
    if (!animate) {
      m.position.y = position[1] - (mood === 'lose' ? 0.08 : 0);
      return;
    }
    const t = clock.elapsedTime + phase;
    if (mood === 'win') {
      m.position.y = position[1] + Math.abs(Math.sin(t * 5)) * 0.35;
      m.rotation.y = t * 1.5;
    } else if (mood === 'lose') {
      m.position.y = position[1] - 0.08;
      m.rotation.y = Math.sin(t * 0.5) * 0.1;
    } else {
      m.position.y = position[1] + Math.abs(Math.sin(t * 2)) * 0.06;
      m.rotation.y = Math.sin(t * 0.7) * 0.25;
    }
  });

  return (
    // key on the voxel count: the instance buffer size is fixed at creation
    <instancedMesh key={cells.length} ref={ref} args={[null, null, cells.length]} position={position} castShadow>
      <boxGeometry args={[VOXEL, VOXEL, VOXEL]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}

function Torch({ position, colors, animate, light: withLight }) {
  const light = useRef();
  useFrame(({ clock }) => {
    if (!animate || !light.current) return;
    const t = clock.elapsedTime * 9 + position[0];
    light.current.intensity = 6 + Math.sin(t) * 1.2 + Math.sin(t * 2.3) * 0.8;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.12, 1.8, 0.12]} />
        <meshLambertMaterial color="#3a2a1e" />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.2, 0.3, 0.2]} />
        <meshBasicMaterial color={colors[0]} />
      </mesh>
      <mesh position={[0, 1.95, 0.02]}>
        <boxGeometry args={[0.1, 0.18, 0.2]} />
        <meshBasicMaterial color={colors[1]} />
      </mesh>
      {withLight && <pointLight ref={light} position={[0, 2.1, 0.3]} intensity={6} color={colors[0]} distance={8} decay={1.6} />}
    </group>
  );
}

// The environment of one stage: sky backdrop, stone floor, arena, torches, lights.
// `lights` off (low quality) drops the torch point lights for a brighter flat ambient.
export function StageScene({ stage, animate, lights = true }) {
  const backdrop = useMemo(() => stageBackdropTexture(stage), [stage]);
  const floor = useMemo(() => {
    const tex = stoneFloorTexture(stage);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 8);
    return tex;
  }, [stage]);
  useEffect(() => () => {
    backdrop.dispose();
    floor.dispose();
  }, [backdrop, floor]);

  return (
    <>
      <color attach="background" args={[stage.sky[0]]} />
      <fog attach="fog" args={[stage.sky[3], 16, 44]} />
      <ambientLight intensity={lights ? 0.8 : 1.3} />
      <hemisphereLight args={[stage.sky[4], stage.floor, 0.6]} />
      <directionalLight position={[4, 8, 6]} intensity={0.7} castShadow />
      <mesh position={[0, 8.5, -24]}>
        <planeGeometry args={[64, 30]} />
        <meshBasicMaterial map={backdrop} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshLambertMaterial map={floor} />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.8, 0.06, 20]} />
        <meshLambertMaterial color={stage.arena} />
      </mesh>
      <Torch position={[-5.4, 0, -0.6]} colors={stage.flame} animate={animate} light={lights} />
      <Torch position={[5.4, 0, -0.6]} colors={stage.flame} animate={animate} light={lights} />
    </>
  );
}
