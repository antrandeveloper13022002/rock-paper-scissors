import { useEffect, useRef } from 'react';
import { PHASES } from '../engine/constants.js';
import { decideSkillUse, decideCard } from './npcAI.js';

// Drives the 'npc' side through the same dispatch actions a human player would issue.
export function useNpcController(state, dispatch, playerComposition, difficulty = 'normal') {
  const stateRef = useRef(state);
  const phase = state?.phase;
  const turnNumber = state?.turnNumber;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!phase || phase === PHASES.FINISHED) return undefined;

    let timeoutId;

    if (phase === PHASES.SKILL) {
      timeoutId = setTimeout(() => {
        const current = stateRef.current;
        const npc = current.players.npc;
        if (npc.skillDeclaredThisTurn !== null) return;
        dispatch({ type: 'DECLARE_SKILL', side: 'npc', use: decideSkillUse(npc, current.players.player, difficulty) });
      }, 900 + Math.random() * 1200);
    } else if (phase === PHASES.CHOOSE) {
      timeoutId = setTimeout(() => {
        const current = stateRef.current;
        const npc = current.players.npc;
        if (npc.ready) return;
        const cardId = decideCard(npc, { opponentComposition: playerComposition, log: current.log, difficulty });
        if (cardId) {
          dispatch({ type: 'SELECT_CARD', side: 'npc', cardId });
          dispatch({ type: 'READY', side: 'npc' });
        }
      }, 1500 + Math.random() * 3000);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, turnNumber, dispatch, playerComposition, difficulty]);
}
