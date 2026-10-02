// Persistent 3D world behind every screen (WG-02). Loaded lazily by App so the
// menu is usable before three.js has downloaded; the 2D StageBackdrop covers
// until then and whenever WebGL is unavailable.
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { STAGES, DEFAULT_STAGE } from '../data/stages.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';
import { StageScene, VoxelSprite } from './StageScene.jsx';
import { MatchCards } from './MatchCards.jsx';
import { SkillFx } from './SkillFx.jsx';

// Camera framing per screen: [position, lookAt].
const SHOTS = {
  menu: [[0, 3.4, 10.5], [0, 1.6, 0]],
  character: [[0, 2.8, 9.5], [0, 1.4, 0]],
  deck: [[0, 5.5, 8.5], [0, 0.6, 0]],
  match: [[0, 3.2, 9], [0, 1.2, 0]],
};

// Fitting the layout to the screen shape. The shots and character positions
// are authored for a landscape screen; on a portrait phone only ~±1.6 units
// are visible at the characters' depth, so they would sit off-screen. There
// the camera pulls back a little and the characters move inward and shrink.
const AUTHORED_SIDE_X = 4.3;
function useFit() {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const pull = aspect < 1 ? Math.min(1.6, 1 / Math.sqrt(aspect)) : 1;
  const halfWidth = 8.4 * pull * Math.tan((22.5 * Math.PI) / 180) * aspect; // fov 45, at the characters' depth
  return {
    pull,
    xScale: Math.min(1, (halfWidth * 0.72) / AUTHORED_SIDE_X),
    charScale: aspect < 1 ? 0.8 : 1,
  };
}

function CameraRig({ shot, animate }) {
  const target = useRef(new THREE.Vector3());
  const goal = useRef(new THREE.Vector3());
  const invalidate = useThree((s) => s.invalidate);
  const { pull } = useFit();
  // In on-demand mode (reduced motion) a screen or size change must request a frame.
  useEffect(() => invalidate(), [shot, pull, invalidate]);

  useFrame(({ camera, clock }, delta) => {
    const [pos, look] = SHOTS[shot] || SHOTS.menu;
    const k = animate ? 1 - Math.exp(-delta * 3) : 1; // smooth, or snap with reduced motion
    const sway = animate ? Math.sin(clock.elapsedTime * 0.25) * 0.25 : 0;
    // pull back along the view direction on narrow screens
    goal.current.set(look[0] + (pos[0] - look[0]) * pull + sway, look[1] + (pos[1] - look[1]) * pull, look[2] + (pos[2] - look[2]) * pull);
    camera.position.lerp(goal.current, k);
    target.current.lerp(goal.current.set(...look), k);
    camera.lookAt(target.current);
  });
  return null;
}

// Everything placed relative to the screen fit: characters, cards, skill effects.
function SceneContent({ shot, characters, matchScene, animate, high }) {
  const { xScale, charScale } = useFit();
  return (
    <>
      {characters.map(({ id, x, flip, mood, scale = 1 }, i) =>
        CHARACTER_SPRITES[id] ? (
          <VoxelSprite
            key={`${id}-${i}`}
            sprite={CHARACTER_SPRITES[id]}
            position={[x * xScale, 0.05, 0.6]}
            flip={flip}
            phase={i * 1.3}
            animate={animate}
            mood={mood}
            scale={scale * charScale}
          />
        ) : null
      )}
      {shot === 'match' && <MatchCards info={matchScene} animate={animate} />}
      {shot === 'match' && animate && <SkillFx skills={matchScene?.skills} skillKey={matchScene?.skillKey} lights={high} xScale={xScale} />}
    </>
  );
}

// Reports once if 3 s of rendering at high quality average under 40 fps
// (after a 1 s warm-up), so the app can fall back to low quality (WG-06).
// Only time actually spent rendering counts: a gap longer than 0.25 s between
// frames (tab hidden, window minimised) is skipped, not measured as slowness.
function FpsWatch({ onSlow }) {
  const s = useRef({ warm: 0, time: 0, frames: 0, done: false });
  useFrame((_, delta) => {
    const st = s.current;
    if (st.done || delta > 0.25) return;
    if (st.warm < 1) {
      st.warm += delta;
      return;
    }
    st.time += delta;
    st.frames += 1;
    if (st.time >= 3) {
      st.done = true;
      if (st.frames / st.time < 40) onSlow();
    }
  });
  return null;
}

export default function World3D({ stageId, shot, characters = [], matchScene = null, quality = 'high', reducedMotion = false, onReady, onSlow }) {
  const stage = STAGES[stageId] || STAGES[DEFAULT_STAGE];
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const animate = !reducedMotion;
  const high = quality === 'high';

  // Stop rendering entirely while the tab is in the background.
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        key={quality} // renderer settings (antialias, shadows) are fixed at creation
        // Low: half resolution upscaled crisply (chunkier pixels, ~4x fewer pixels to shade)
        dpr={high ? [1, 2] : 0.5}
        style={{ imageRendering: high ? 'auto' : 'pixelated' }}
        shadows={high ? 'percentage' : false}
        gl={{ antialias: high, powerPreference: high ? 'high-performance' : 'low-power' }}
        frameloop={hidden ? 'never' : animate ? 'always' : 'demand'}
        camera={{ position: SHOTS.menu[0], fov: 45 }}
        onCreated={() => onReady?.()}
      >
        <StageScene stage={stage} animate={animate} lights={high} />
        <SceneContent shot={shot} characters={characters} matchScene={matchScene} animate={animate} high={high} />
        <CameraRig shot={shot} animate={animate} />
        {high && animate && onSlow && <FpsWatch onSlow={onSlow} />}
      </Canvas>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 85% 80% at 50% 50%, rgba(0,0,0,0) 50%, rgba(6,4,14,.6) 100%)' }}
      />
    </div>
  );
}
