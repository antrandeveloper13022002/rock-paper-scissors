import { useEffect, useState } from 'react';
import { useTurnTimer } from './useTurnTimer.js';
import { MatchScreenView } from './MatchScreenView.jsx';
import { useT } from '../i18n/strings.js';

// Online PvP: the server (server/index.js) runs the exact same reducer
// authoritatively and pushes full state snapshots down; this component never
// runs the reducer itself, it only ever reflects what the server says and
// forwards the local player's intent as ACTION messages.
export function OnlineMatchScreen({
  ws,
  mySide,
  initialState,
  myCharacter,
  oppCharacter,
  oppComposition,
  onExit,
  onOpponentLeft,
}) {
  const { t } = useT();
  const [state, setState] = useState(initialState);
  const [opponentLeft, setOpponentLeft] = useState(false);

  useEffect(() => {
    const onMessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'STATE') setState(msg.state);
      else if (msg.type === 'OPPONENT_LEFT') setOpponentLeft(true);
    };
    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [ws]);

  const dispatch = (action) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ACTION', action }));
  };

  // Display-only countdown — no dispatch here, since only the server's own
  // timers are allowed to actually time a phase out.
  const secondsLeft = useTurnTimer(state.phase, state.turnNumber);

  if (opponentLeft) {
    return (
      <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim p-6 text-center">
        <p className="text-danger mb-4">{t.opponentDisconnected}</p>
        <button
          className="font-mono font-bold border-2 border-accent-blue text-accent-blue px-4 py-2.5 uppercase tracking-wider text-xs"
          onClick={() => {
            ws.close();
            onOpponentLeft();
          }}
        >
          {t.backToMenu}
        </button>
      </div>
    );
  }

  return (
    <MatchScreenView
      state={state}
      dispatch={dispatch}
      mySide={mySide}
      myCharacter={myCharacter}
      oppCharacter={oppCharacter}
      oppComposition={oppComposition}
      secondsLeft={secondsLeft}
      onExit={() => {
        ws.close();
        onExit();
      }}
    />
  );
}
