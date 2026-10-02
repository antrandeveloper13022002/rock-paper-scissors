import { useEffect, useReducer, useState } from 'react';
import { matchReducer, createMatch } from '../engine/reducer.js';
import { PHASES } from '../engine/constants.js';
import { useNpcController } from '../ai/useNpcController.js';
import { useTurnTimer } from './useTurnTimer.js';
import { MatchScreenView } from './MatchScreenView.jsx';
import { PauseModal } from './PauseOverlays.jsx';

// Local vs NPC: owns the authoritative reducer directly (no server involved),
// drives the opponent via the AI controller, and auto-advances turns/timeouts
// client-side since there is nothing else to arbitrate them.
// Pausing (BR-ONLINE-02, NPC part) freezes the countdown, the NPC and the
// pause between rounds for as long as the player wants.
export function MatchScreen({ playerCharacter, playerComposition, npcCharacter, npcComposition, difficulty, onExit }) {
  const [state, dispatch] = useReducer(
    matchReducer,
    { playerCharacter, playerComposition, npcCharacter, npcComposition },
    createMatch
  );
  const [paused, setPaused] = useState(false);

  useNpcController(state, dispatch, playerComposition, difficulty, paused);
  const secondsLeft = useTurnTimer(state.phase, state.turnNumber, dispatch, paused);

  useEffect(() => {
    if (paused || state.phase !== PHASES.RESOLVED) return undefined;
    const timeout = setTimeout(() => dispatch({ type: 'NEXT_TURN' }), 3000);
    return () => clearTimeout(timeout);
  }, [state.phase, state.result, paused]);

  return (
    <>
      <MatchScreenView
        state={state}
        dispatch={dispatch}
        mySide="player"
        myCharacter={playerCharacter}
        oppCharacter={npcCharacter}
        oppComposition={npcComposition}
        myComposition={playerComposition}
        stageId={npcCharacter.id}
        secondsLeft={secondsLeft}
        onPause={() => setPaused(true)}
        onExit={onExit}
      />
      {paused && state.phase !== PHASES.FINISHED && <PauseModal onResume={() => setPaused(false)} onLeave={onExit} />}
    </>
  );
}
