import { useState } from 'react';
import { CharacterSelect } from './CharacterSelect.jsx';
import { DeckBuilder } from './DeckBuilder.jsx';
import { OnlineLobby } from './OnlineLobby.jsx';
import { OnlineMatchScreen } from './OnlineMatchScreen.jsx';
import { WS_URL } from '../net/config.js';
import { useT } from '../i18n/strings.js';

const STEPS = { CHARACTER: 'character', DECK: 'deck', LOBBY: 'lobby', MATCH: 'match' };

// Owns the whole "play online" flow end to end: pick a character/deck, then
// either host a room (get a code, wait) or join one by code, then hand off to
// OnlineMatchScreen once the server pairs both players and starts the match.
export function OnlineFlow({ onExit }) {
  const { t } = useT();
  const [step, setStep] = useState(STEPS.CHARACTER);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [playerComposition, setPlayerComposition] = useState(null);
  const [lobbyStatus, setLobbyStatus] = useState('idle');
  const [roomCode, setRoomCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [socket, setSocket] = useState(null);

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
        setErrorMessage(msg.message === 'ROOM_NOT_FOUND' ? t.connectionError : msg.message);
        setLobbyStatus('error');
      } else if (msg.type === 'MATCH_START') {
        const oppSide = msg.mySide === 'player' ? 'npc' : 'player';
        setMatchData({
          mySide: msg.mySide,
          initialState: msg.state,
          oppCharacter: msg.state.players[oppSide].character,
          oppComposition: msg.mySide === 'player' ? msg.npcComposition : msg.playerComposition,
        });
        setStep(STEPS.MATCH);
      }
    };
  };

  const handleCreateRoom = () => {
    connect((ws) => {
      ws.send(JSON.stringify({ type: 'CREATE_ROOM', character: playerCharacter, composition: playerComposition }));
    });
  };

  const handleJoinRoom = (code) => {
    connect((ws) => {
      ws.send(
        JSON.stringify({ type: 'JOIN_ROOM', roomCode: code, character: playerCharacter, composition: playerComposition })
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
        character={playerCharacter}
        showDifficulty={false}
        onBack={() => setStep(STEPS.CHARACTER)}
        onConfirm={(composition) => {
          setPlayerComposition(composition);
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
        onExit={exitToMenu}
        onOpponentLeft={exitToMenu}
      />
    );
  }

  return null;
}
