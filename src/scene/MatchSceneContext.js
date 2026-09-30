import { createContext } from 'react';

// Lets the match UI (DOM) tell the persistent 3D world what to show for the
// current round, and learn whether the 3D layer is actually rendering.
// Presentation only: the scene never reads or changes game rules.
export const MatchSceneContext = createContext({ active: false, publish: () => {} });

// World x of each side's voxel character during a match (shared by the App,
// which places the characters, and the scene effects aimed at them).
export const SIDE_X = { me: -4.3, opp: 4.3 };
