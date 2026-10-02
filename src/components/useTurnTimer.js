import { useEffect, useState } from 'react';
import { PHASES, SKILL_PHASE_SECONDS, CHOOSE_PHASE_SECONDS } from '../engine/constants.js';

function durationFor(phase) {
  if (phase === PHASES.SKILL) return SKILL_PHASE_SECONDS;
  if (phase === PHASES.CHOOSE) return CHOOSE_PHASE_SECONDS;
  return 0;
}

// dispatch is optional: pass it in local/NPC mode to auto-timeout the turn.
// Omit it for server-authoritative online mode, where this becomes a display-only
// countdown and the server's own timer is what actually advances the match.
// `paused` freezes the countdown where it is; it resumes from there.
export function useTurnTimer(phase, turnNumber, dispatch, paused = false) {
  const [secondsLeft, setSecondsLeft] = useState(durationFor(phase));

  // a new phase / turn restarts the countdown
  useEffect(() => {
    setSecondsLeft(durationFor(phase));
  }, [phase, turnNumber]);

  useEffect(() => {
    if (paused || (phase !== PHASES.SKILL && phase !== PHASES.CHOOSE)) return undefined;
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          dispatch?.({ type: phase === PHASES.SKILL ? 'TIMEOUT_SKILL' : 'TIMEOUT_CHOOSE' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turnNumber, paused]);

  return secondsLeft;
}
