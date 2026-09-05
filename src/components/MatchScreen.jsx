import { useEffect, useReducer } from 'react';
import { matchReducer, createMatch } from '../engine/reducer.js';
import { PHASES } from '../engine/constants.js';
import { useNpcController } from '../ai/useNpcController.js';
import { useTurnTimer } from './useTurnTimer.js';
import { MatchScreenView } from './MatchScreenView.jsx';

// Local vs NPC: owns the authoritative reducer directly (no server involved),
// drives the opponent via the AI controller, and auto-advances turns/timeouts
// client-side since there is nothing else to arbitrate them.
export function MatchScreen({ playerCharacter, playerComposition, npcCharacter, npcComposition, difficulty, onExit }) {
  const [state, dispatch] = useReducer(
    matchReducer,
    { playerCharacter, playerComposition, npcCharacter, npcComposition },
    createMatch
  );

  useNpcController(state, dispatch, playerComposition, difficulty);
  const secondsLeft = useTurnTimer(state.phase, state.turnNumber, dispatch);

  useEffect(() => {
    if (state.phase !== PHASES.RESOLVED) return undefined;
    const timeout = setTimeout(() => dispatch({ type: 'NEXT_TURN' }), 3000);
    return () => clearTimeout(timeout);
  }, [state.phase, state.result]);

  return (
    <MatchScreenView
      state={state}
      dispatch={dispatch}
      mySide="player"
      myCharacter={playerCharacter}
      oppCharacter={npcCharacter}
      oppComposition={npcComposition}
      secondsLeft={secondsLeft}
      onExit={onExit}
    />
  );
}
