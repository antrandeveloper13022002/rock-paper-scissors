import { useEffect, useRef, useState } from 'react';
import { CharacterSelect } from './CharacterSelect.jsx';
import { DeckBuilder } from './DeckBuilder.jsx';
import { OnlineLobby } from './OnlineLobby.jsx';
import { OnlineMatchScreen } from './OnlineMatchScreen.jsx';
import { Button } from './Button.jsx';
import { WS_URL } from '../net/config.js';
import { saveRejoin, clearRejoin } from '../net/rejoin.js';
import { useT } from '../i18n/strings.js';
import { STAGES } from '../data/stages.js';
import { PHASES } from '../engine/constants.js';

const STEPS = { CHARACTER: 'character', DECK: 'deck', LOBBY: 'lobby', MATCH: 'match', REJOIN: 'rejoin' };
// The server holds a dropped seat for 30 s (BR-ONLINE-03); keep retrying for that long.
const RECONNECT_WINDOW_MS = 30 * 1000;
const RECONNECT_EVERY_MS = 2000;

// Owns the whole "play online" flow end to end: pick a character/deck, then
// find a random opponent, host a room or join one by code, then play the
// match. It owns the socket and the match state, so a dropped connection can
// be replaced (REJOIN) without the match screen missing any message.
// onStage(stageId, inMatch) lets the app show the voted/picked stage and play its music.
// `rejoinToken`: open straight into an unfinished match (menu "rejoin" button).
// onBrowse(characterId | null): the character being looked at on the first step,
// so the 3D scene can show it (null once past that step).
export function OnlineFlow({ onExit, onStage, onBrowse, rejoinToken = null }) {
  const { t, lang } = useT();
  const [step, setStep] = useState(rejoinToken ? STEPS.REJOIN : STEPS.CHARACTER);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [playerComposition, setPlayerComposition] = useState(null);
  const [lobbyStatus, setLobbyStatus] = useState('idle');
  const [roomCode, setRoomCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [stageVote, setStageVote] = useState(null);

  const [matchData, setMatchData] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [pauseInfo, setPauseInfo] = useState(null); // { by: 'me'|'opp', reason, until }
  const [reconnecting, setReconnecting] = useState(false);
  const [matchError, setMatchError] = useState(null);

  const socketRef = useRef(null);
  const mySideRef = useRef(null);
  const tokenRef = useRef(rejoinToken);
  const finishedRef = useRef(false);
  const reconnectDeadline = useRef(0); // 0 = not reconnecting
  const reconnectTimer = useRef(null);
  // handleDrop runs from socket callbacks created on earlier renders, so it
  // reads the step from a ref rather than from a stale closure.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Preview the vote as the backdrop while in the lobby; the match itself
  // reports the server-picked stage from MATCH_START.
  useEffect(() => {
    if (step === STEPS.LOBBY && stageVote) onStage?.(stageVote, false);
  }, [step, stageVote, onStage]);

  // Past the character step the scene stops showcasing a character.
  useEffect(() => {
    if (step !== STEPS.CHARACTER) onBrowse?.(null);
  }, [step, onBrowse]);

  // Keep the rejoin token (and a summary of the match, for the menu) fresh
  // while the match is open, so a closed tab can come back within the server's
  // grace window. Saved again when the page is hidden/closed, so the menu's
  // countdown starts from the real moment the player left.
  const matchOpen = step === STEPS.MATCH && matchState && matchState.phase !== PHASES.FINISHED;
  const summaryRef = useRef(null);
  if (matchData && matchState) {
    const mySide = matchData.mySide;
    const oppSide = mySide === 'player' ? 'npc' : 'player';
    summaryRef.current = {
      me: matchData.myCharacter.id,
      opp: matchData.oppCharacter.id,
      stage: matchData.stage,
      turn: matchState.turnNumber,
      myScore: matchState.players[mySide].score,
      oppScore: matchState.players[oppSide].score,
    };
  }
  useEffect(() => {
    if (!matchOpen || !tokenRef.current) return undefined;
    const save = () => saveRejoin(tokenRef.current, summaryRef.current);
    save();
    const id = setInterval(save, 5000);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(id);
      window.removeEventListener('pagehide', save);
    };
  }, [matchOpen]);

  useEffect(() => () => clearTimeout(reconnectTimer.current), []);

  const closeSocket = () => {
    const ws = socketRef.current;
    socketRef.current = null;
    if (!ws) return;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.close();
  };

  const send = (message) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };

  const enterMatch = (msg, isRejoin) => {
    mySideRef.current = msg.mySide;
    tokenRef.current = msg.rejoinToken;
    finishedRef.current = msg.state.phase === PHASES.FINISHED;
    const oppSide = msg.mySide === 'player' ? 'npc' : 'player';
    const votes = [msg.stageVotes?.player, msg.stageVotes?.npc].filter(Boolean);
    const name = (id) => STAGES[id]?.name[lang] ?? id;
    onStage?.(msg.stage, true);
    setMatchData({
      mySide: msg.mySide,
      stage: msg.stage,
      stageNotice: isRejoin
        ? null
        : votes.length === 2 && votes[0] !== votes[1]
        ? t.stageRandomPicked(name(votes[0]), name(votes[1]), name(msg.stage))
        : t.stageBothPicked(name(msg.stage)),
      myCharacter: msg.state.players[msg.mySide].character,
      oppCharacter: msg.state.players[oppSide].character,
      myComposition: msg.mySide === 'player' ? msg.playerComposition : msg.npcComposition,
      oppComposition: msg.mySide === 'player' ? msg.npcComposition : msg.playerComposition,
    });
    setMatchState(msg.state);
    reconnectDeadline.current = 0;
    setReconnecting(false);
    setMatchError(null);
    clearTimeout(reconnectTimer.current);
    setStep(STEPS.MATCH);
  };

  // One handler for every socket this flow opens (lobby, match, reconnects).
  const onServerMessage = (msg) => {
    if (msg.type === 'SEARCHING') setLobbyStatus('searching');
    else if (msg.type === 'ROOM_CREATED') {
      setRoomCode(msg.roomCode);
      setLobbyStatus('waiting');
    } else if (msg.type === 'MATCH_START' || msg.type === 'REJOINED') enterMatch(msg, msg.type === 'REJOINED');
    else if (msg.type === 'STATE') {
      setMatchState(msg.state);
      if (msg.state.phase === PHASES.FINISHED) {
        finishedRef.current = true;
        setPauseInfo(null);
        clearRejoin(); // nothing left to rejoin
      }
    } else if (msg.type === 'PAUSED') {
      setPauseInfo({ by: msg.by === mySideRef.current ? 'me' : 'opp', reason: msg.reason, until: Date.now() + msg.seconds * 1000 });
    } else if (msg.type === 'RESUMED') setPauseInfo(null);
    else if (msg.type === 'ERROR') {
      const text = t.serverErrors[msg.message] ?? t.connectionError;
      if (msg.message === 'REJOIN_FAILED') {
        clearRejoin();
        clearTimeout(reconnectTimer.current);
        reconnectDeadline.current = 0;
        setReconnecting(false);
        setMatchError(text);
        return;
      }
      setErrorMessage(text);
      setLobbyStatus('error');
    }
  };
  const handlerRef = useRef(onServerMessage);
  useEffect(() => {
    handlerRef.current = onServerMessage;
  });

  const openSocket = (onOpen) => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      handleDrop(null);
      return;
    }
    socketRef.current = ws;
    ws.onopen = () => onOpen(ws);
    ws.onmessage = (event) => handlerRef.current(JSON.parse(event.data));
    ws.onerror = () => {}; // 'close' follows and decides what to do
    ws.onclose = () => handleDrop(ws);
  };

  // A socket closed without us asking: in a live match, keep trying to rejoin
  // for the grace window; before a match, it's a lobby error.
  const handleDrop = (ws) => {
    if (ws && ws !== socketRef.current) return; // an old socket we already replaced
    socketRef.current = null;
    const inMatch = mySideRef.current && !finishedRef.current && tokenRef.current;
    if (!inMatch) {
      setLobbyStatus((current) => (['waiting', 'connecting', 'searching'].includes(current) ? 'error' : current));
      if (stepRef.current === STEPS.REJOIN) setMatchError(t.connectionError);
      return;
    }
    if (!reconnectDeadline.current) reconnectDeadline.current = Date.now() + RECONNECT_WINDOW_MS;
    setReconnecting(true);
    if (Date.now() > reconnectDeadline.current) {
      // The server has given the win to the opponent by now; it keeps the
      // result, so the menu can still show it once the network is back.
      reconnectDeadline.current = 0;
      setReconnecting(false);
      setMatchError(t.reconnectTimeout);
      return;
    }
    clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => openSocket((s) => s.send(JSON.stringify({ type: 'REJOIN', token: tokenRef.current }))), RECONNECT_EVERY_MS);
  };

  // Opened from the menu's "rejoin" button. Exactly once: a second socket
  // (e.g. StrictMode re-running effects) would find the seat already taken.
  const rejoinStarted = useRef(false);
  useEffect(() => {
    if (step !== STEPS.REJOIN || !rejoinToken || rejoinStarted.current) return;
    rejoinStarted.current = true;
    openSocket((ws) => ws.send(JSON.stringify({ type: 'REJOIN', token: rejoinToken })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = (onOpen) => {
    setLobbyStatus('connecting');
    setErrorMessage(null);
    openSocket(onOpen);
  };

  const setupMsg = (type, extra = {}) =>
    JSON.stringify({ type, characterId: playerCharacter.id, composition: playerComposition, stageVote, ...extra });

  // keepRejoin: leave the saved token so the menu can still fetch the result
  // (after a reconnect that ran out of time).
  const exitToMenu = (keepRejoin = false) => {
    clearTimeout(reconnectTimer.current);
    if (keepRejoin !== true) clearRejoin();
    closeSocket();
    onExit();
  };

  // Leaving a live online match = conceding (BR-ONLINE-02).
  const leaveMatch = () => {
    send({ type: 'ACTION', action: { type: 'FORFEIT' } });
    exitToMenu();
  };

  if (step === STEPS.CHARACTER) {
    return (
      <CharacterSelect
        steps={3}
        onBrowse={onBrowse}
        onBack={onExit}
        onConfirm={(character) => {
          setPlayerCharacter(character);
          setStep(STEPS.DECK);
        }}
      />
    );
  }

  if (step === STEPS.DECK) {
    return (
      <DeckBuilder
        steps={3}
        showDifficulty={false}
        onBack={() => setStep(STEPS.CHARACTER)}
        onConfirm={(composition) => {
          setPlayerComposition(composition);
          setStageVote((current) => current ?? playerCharacter.id);
          setStep(STEPS.LOBBY);
        }}
      />
    );
  }

  if (step === STEPS.LOBBY) {
    return (
      <OnlineLobby
        status={lobbyStatus}
        roomCode={roomCode}
        errorMessage={errorMessage}
        stageVote={stageVote}
        onStageVote={setStageVote}
        onFindMatch={() => connect((ws) => ws.send(setupMsg('FIND_MATCH')))}
        onCancelSearch={() => {
          // cancelling a search = closing the connection; the server drops us from the queue
          closeSocket();
          setLobbyStatus('idle');
        }}
        onCreateRoom={() => connect((ws) => ws.send(setupMsg('CREATE_ROOM')))}
        onJoinRoom={(code) => connect((ws) => ws.send(setupMsg('JOIN_ROOM', { roomCode: code })))}
        onBack={() => {
          closeSocket();
          setLobbyStatus('idle');
          setStep(STEPS.DECK);
        }}
      />
    );
  }

  if (step === STEPS.REJOIN) {
    return (
      <div className="w-full max-w-[460px] bg-gradient-to-b from-panel-top to-panel-bot pixel-panel p-6 flex flex-col gap-4 text-center">
        <p className={`m-0 text-xl ${matchError ? 'text-danger' : 'animate-pulse'}`} aria-live="polite">
          {matchError ?? t.rejoining}
        </p>
        <Button variant={matchError ? 'primary' : 'ghost'} onClick={exitToMenu}>
          {t.backToMenu}
        </Button>
      </div>
    );
  }

  if (step === STEPS.MATCH && matchData && matchState) {
    return (
      <OnlineMatchScreen
        state={matchState}
        mySide={matchData.mySide}
        myCharacter={matchData.myCharacter}
        oppCharacter={matchData.oppCharacter}
        oppComposition={matchData.oppComposition}
        myComposition={matchData.myComposition}
        stageId={matchData.stage}
        notice={matchData.stageNotice}
        pauseInfo={pauseInfo}
        reconnecting={reconnecting}
        matchError={matchError}
        send={send}
        onExit={() => exitToMenu(matchError === t.reconnectTimeout)}
        onLeave={leaveMatch}
      />
    );
  }

  return null;
}
