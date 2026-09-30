import { useEffect, useState } from 'react';
import { CharacterSelect } from './CharacterSelect.jsx';
import { DeckBuilder } from './DeckBuilder.jsx';
import { OnlineLobby } from './OnlineLobby.jsx';
import { OnlineMatchScreen } from './OnlineMatchScreen.jsx';
import { WS_URL } from '../net/config.js';
import { useT } from '../i18n/strings.js';
import { STAGES } from '../data/stages.js';
import { otherSide } from '../engine/constants.js';

const STEPS = { CHARACTER: 'character', DECK: 'deck', LOBBY: 'lobby', MATCH: 'match' };

// Owns the whole "play online" flow end to end: pick a character/deck, then
// either host a room (get a code, wait) or join one by code, then hand off to
// OnlineMatchScreen once the server pairs both players and starts the match.
// onStage(stageId, inMatch) lets the app show the voted/picked stage and play its music.
export function OnlineFlow({ onExit, onStage }) {
  const { t, lang } = useT();
  const [step, setStep] = useState(STEPS.CHARACTER);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [playerComposition, setPlayerComposition] = useState(null);
  const [lobbyStatus, setLobbyStatus] = useState('idle');
  const [roomCode, setRoomCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [stageVote, setStageVote] = useState(null);

  // Preview the vote as the backdrop while in the lobby; the match itself
  // reports the server-picked stage from MATCH_START.
  useEffect(() => {
    if (step === STEPS.LOBBY && stageVote) onStage?.(stageVote, false);
  }, [step, stageVote, onStage]);

  const cleanupSocket = (current) => {
    if (!current) return;
    current.onmessage = null;
    current.onerror = null;
    current.onclose = null;
    current.close();
  };

  const connect = (onOpen) => {
    setLobbyStatus('connecting');
    setErrorMessage(null);
    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setLobbyStatus('error');
      return;
    }
    setSocket(ws);

    ws.onopen = () => onOpen(ws);
    ws.onerror = () => setLobbyStatus('error');
    ws.onclose = () => {
      // A close before a match ever started means the connection attempt failed
      // (or the server rejected/dropped us) — once MATCH_START lands, this
      // handler is superseded by OnlineMatchScreen's own listeners.
      setLobbyStatus((current) => (current === 'waiting' || current === 'connecting' ? 'error' : current));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'ROOM_CREATED') {
        setRoomCode(msg.roomCode);
        setLobbyStatus('waiting');
      } else if (msg.type === 'ERROR') {
        setErrorMessage(t.serverErrors[msg.message] ?? t.connectionError);
        setLobbyStatus('error');
      } else if (msg.type === 'MATCH_START') {
        const oppSide = otherSide(msg.mySide);
        const votes = [msg.stageVotes?.player, msg.stageVotes?.npc].filter(Boolean);
        const name = (id) => STAGES[id]?.name[lang] ?? id;
        onStage?.(msg.stage, true);
        setMatchData({
          mySide: msg.mySide,
          initialState: msg.state,
          stage: msg.stage,
          stageNotice:
            votes.length === 2 && votes[0] !== votes[1]
              ? t.stageRandomPicked(name(votes[0]), name(votes[1]), name(msg.stage))
              : t.stageBothPicked(name(msg.stage)),
          oppCharacter: msg.state.players[oppSide].character,
          oppComposition: msg.mySide === 'player' ? msg.npcComposition : msg.playerComposition,
        });
        setStep(STEPS.MATCH);
      }
    };
  };

  const handleCreateRoom = () => {
    connect((ws) => {
      ws.send(JSON.stringify({ type: 'CREATE_ROOM', characterId: playerCharacter.id, composition: playerComposition, stageVote }));
    });
  };

  const handleJoinRoom = (code) => {
    connect((ws) => {
      ws.send(
        JSON.stringify({ type: 'JOIN_ROOM', roomCode: code, characterId: playerCharacter.id, composition: playerComposition, stageVote })
      );
    });
  };

  const exitToMenu = () => {
    cleanupSocket(socket);
    onExit();
  };

  if (step === STEPS.CHARACTER) {
    return (
      <CharacterSelect
        steps={3}
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
        character={playerCharacter}
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
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={() => {
          cleanupSocket(socket);
          setSocket(null);
          setLobbyStatus('idle');
          setStep(STEPS.DECK);
        }}
      />
    );
  }

  if (step === STEPS.MATCH && matchData && socket) {
    return (
      <OnlineMatchScreen
        ws={socket}
        mySide={matchData.mySide}
        initialState={matchData.initialState}
        myCharacter={playerCharacter}
        oppCharacter={matchData.oppCharacter}
        oppComposition={matchData.oppComposition}
        stageNotice={matchData.stageNotice}
        stageId={matchData.stage}
        myComposition={playerComposition}
        onExit={exitToMenu}
        onOpponentLeft={exitToMenu}
      />
    );
  }

  return null;
}
