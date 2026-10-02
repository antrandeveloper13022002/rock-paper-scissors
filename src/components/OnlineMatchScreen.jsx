import { useT } from '../i18n/strings.js';
import { useTurnTimer } from './useTurnTimer.js';
import { MatchScreenView } from './MatchScreenView.jsx';
import { PauseModal, PausedBanner } from './PauseOverlays.jsx';
import { Button } from './Button.jsx';
import { PHASES } from '../engine/constants.js';

// Online PvP: the server (server/gameServer.js) runs the exact same reducer
// authoritatively and pushes state snapshots down. OnlineFlow owns the
// connection and the state (so a reconnect can swap sockets without losing
// messages); this component only renders it and sends the player's intents.
export function OnlineMatchScreen({
  state,
  mySide,
  myCharacter,
  oppCharacter,
  oppComposition,
  myComposition,
  stageId,
  notice,
  pauseInfo,
  pausesLeft,
  reconnecting,
  matchError,
  timerSync,
  send,
  onExit,
  onLeave,
}) {
  const { t } = useT();
  const finished = state.phase === PHASES.FINISHED;
  const frozen = !finished && (Boolean(pauseInfo) || reconnecting);

  // Display-only countdown — the server's own timers advance the match. It
  // freezes while the match is paused or this client is reconnecting.
  const secondsLeft = useTurnTimer(state.phase, state.turnNumber, undefined, frozen, timerSync);

  if (matchError) {
    return (
      <div className="w-full max-w-[460px] bg-gradient-to-b from-panel-top to-panel-bot pixel-panel p-6 flex flex-col gap-4 text-center">
        <p className="m-0 text-xl text-danger">{matchError}</p>
        <Button variant="primary" size="lg" onClick={onExit}>
          {t.backToMenu}
        </Button>
      </div>
    );
  }

  return (
    <>
      <MatchScreenView
        state={state}
        dispatch={(action) => send({ type: 'ACTION', action })}
        mySide={mySide}
        myCharacter={myCharacter}
        oppCharacter={oppCharacter}
        oppComposition={oppComposition}
        myComposition={myComposition}
        stageId={stageId}
        notice={notice}
        secondsLeft={secondsLeft}
        onPause={frozen ? undefined : () => send({ type: 'PAUSE' })}
        pausesLeft={pausesLeft}
        onExit={onExit}
      />
      {!finished && reconnecting && <PausedBanner kind="reconnecting" />}
      {!finished && !reconnecting && pauseInfo?.by === 'me' && pauseInfo.reason === 'pause' && (
        <PauseModal online until={pauseInfo.until} pausesLeft={pausesLeft} onResume={() => send({ type: 'RESUME' })} onLeave={onLeave} />
      )}
      {!finished && !reconnecting && pauseInfo?.by === 'opp' && <PausedBanner kind={pauseInfo.reason} until={pauseInfo.until} />}
    </>
  );
}
