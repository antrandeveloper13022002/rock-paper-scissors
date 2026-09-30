import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { MainMenu } from './components/MainMenu.jsx';
import { CharacterSelect } from './components/CharacterSelect.jsx';
import { DeckBuilder } from './components/DeckBuilder.jsx';
import { MatchScreen } from './components/MatchScreen.jsx';
import { OnlineFlow } from './components/OnlineFlow.jsx';
import { StageBackdrop } from './components/StageBackdrop.jsx';
import { DEFAULT_STAGE } from './data/stages.js';
import { MatchSceneContext, SIDE_X } from './scene/MatchSceneContext.js';
import { SceneBoundary } from './scene/SceneBoundary.jsx';

const World3D = lazy(() => import('./scene/World3D.jsx'));

const HAS_WEBGL = (() => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
})();

// After the match: the winner celebrates, the loser slumps (WG-05).
function matchMood(result, side) {
  if (!result || result === 'draw') return null;
  return result === side ? 'win' : 'lose';
}

// The player's explicit choice, or null if they never picked one.
function readQuality() {
  try {
    const v = localStorage.getItem('rps-card-game-quality');
    return v === 'low' || v === 'high' ? v : null;
  } catch {
    return null;
  }
}

function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
import { randomCharacter } from './data/characters.js';
import { randomComposition } from './engine/deck.js';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext.jsx';
import { useT } from './i18n/strings.js';
import { sfx, isMuted, setMuted, startMusic, setMusicTheme } from './audio/sfx.js';

const SCREENS = {
  MENU: 'menu',
  CHARACTER: 'character',
  DECK: 'deck',
  MATCH: 'match',
  ONLINE: 'online',
};

function TopControls({ quality, onQuality }) {
  const { t } = useT();
  const [lang, setLang] = useLanguage();
  const [muted, setMutedState] = useState(isMuted());

  return (
    <div className="relative z-20 sm:absolute flex justify-end gap-1 mb-2 sm:mb-0 sm:top-3 sm:right-3">
      <button
        className="border-2 border-border-dim px-2.5 py-1 text-[10px] font-bold text-text uppercase tracking-wider hover:brightness-125"
        onClick={() => {
          const next = !muted;
          setMuted(next);
          setMutedState(next);
          if (!next) sfx.click();
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      {['vi', 'en'].map((code) => (
        <button
          key={code}
          className={`border-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:brightness-125 ${
            lang === code ? 'border-accent-blue text-accent-blue' : 'border-border-dim text-text-dim3'
          }`}
          onClick={() => {
            sfx.click();
            setLang(code);
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
      {HAS_WEBGL && (
        <button
          className="border-2 border-border-dim px-2.5 py-1 text-[10px] font-bold text-text uppercase tracking-wider hover:brightness-125"
          onClick={() => {
            sfx.click();
            onQuality(quality === 'high' ? 'low' : 'high');
          }}
        >
          {quality === 'high' ? t.graphicsHigh : t.graphicsLow}
        </button>
      )}
    </div>
  );
}

function GameShell() {
  const { t } = useT();
  const [screen, setScreen] = useState(SCREENS.MENU);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [matchSetup, setMatchSetup] = useState(null);
  const [browsedCharacterId, setBrowsedCharacterId] = useState(null);
  const [onlineStage, setOnlineStage] = useState({ id: null, inMatch: false });
  const handleOnlineStage = useCallback((id, inMatch) => setOnlineStage({ id, inMatch }), []);
  const [chosenQuality, setQuality] = useState(readQuality);
  const [autoLow, setAutoLow] = useState(false);
  // A slow device drops to low automatically unless the player chose a level.
  const handleSlow = useCallback(() => setAutoLow(true), []);
  const quality = chosenQuality ?? (autoLow ? 'low' : 'high');
  const reducedMotion = useReducedMotion();
  const [worldReady, setWorldReady] = useState(false);
  const handleWorldReady = useCallback(() => setWorldReady(true), []);
  // 3D failed at runtime: the 2D backdrop and 2D effects take over.
  const handleWorldFail = useCallback(() => setWorldReady(false), []);
  const [matchScene, setMatchScene] = useState(null);
  const sceneContext = useMemo(() => ({ active: HAS_WEBGL && worldReady, publish: setMatchScene }), [worldReady]);
  const changeQuality = (next) => {
    setQuality(next);
    try {
      localStorage.setItem('rps-card-game-quality', next);
    } catch {
      // ignore (private mode etc.)
    }
  };

  // Browsers block audio until a real user gesture — start the music loop on the
  // very first click/tap anywhere in the app, whichever screen that happens to be.
  useEffect(() => {
    const unlock = () => {
      startMusic();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // vs NPC the match is played on the NPC's stage (BR-3D-04); while picking a
  // character the backdrop previews that character's stage.
  const stageId =
    screen === SCREENS.MATCH && matchSetup
      ? matchSetup.npcCharacter.id
      : screen === SCREENS.CHARACTER && browsedCharacterId
      ? browsedCharacterId
      : screen === SCREENS.ONLINE && onlineStage.id
      ? onlineStage.id
      : DEFAULT_STAGE;

  // Each stage has its own music during a match (vs NPC or online); every
  // other screen plays the default castle theme.
  const inMatch = screen === SCREENS.MATCH || (screen === SCREENS.ONLINE && onlineStage.inMatch);
  const musicTheme = inMatch ? stageId : DEFAULT_STAGE;

  // Camera shot and the voxel characters standing beside the panels.
  const shot = inMatch ? 'match' : screen === SCREENS.CHARACTER ? 'character' : screen === SCREENS.MENU ? 'menu' : 'deck';
  const sceneCharacters =
    screen === SCREENS.MENU
      ? [{ id: 'chien-binh', x: -4.4 }, { id: 'phap-su', x: 4.4, flip: true }]
      : screen === SCREENS.CHARACTER && browsedCharacterId
      ? [{ id: browsedCharacterId, x: 3.9, flip: true, scale: 1.6 }]
      : inMatch && matchScene
      ? [
          { id: matchScene.myId, x: SIDE_X.me, mood: matchMood(matchScene.result, 'me') },
          { id: matchScene.oppId, x: SIDE_X.opp, flip: true, mood: matchMood(matchScene.result, 'opp') },
        ]
      : [];
  useEffect(() => {
    setMusicTheme(musicTheme);
  }, [musicTheme]);

  const resetToMenu = () => {
    setOnlineStage({ id: null, inMatch: false });
    setScreen(SCREENS.MENU);
    setPlayerCharacter(null);
    setMatchSetup(null);
  };

  return (
    <MatchSceneContext.Provider value={sceneContext}>
    <div className="relative flex flex-1 flex-col items-center w-full px-2 pt-2.5 pb-6 sm:px-4 sm:pt-4">
      {HAS_WEBGL ? (
        <SceneBoundary fallback={<StageBackdrop stageId={stageId} />} onFail={handleWorldFail}>
          <Suspense fallback={<StageBackdrop stageId={stageId} />}>
            <World3D
            stageId={stageId}
            shot={shot}
            characters={sceneCharacters}
            matchScene={inMatch ? matchScene : null}
            quality={quality}
            reducedMotion={reducedMotion}
            onReady={handleWorldReady}
            onSlow={chosenQuality ? undefined : handleSlow}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        <StageBackdrop stageId={stageId} />
      )}
      <TopControls quality={quality} onQuality={changeQuality} />
      {!HAS_WEBGL && <p className="m-0 mb-2 px-2 py-1 text-[13px] bg-[#2a1a10] text-text-dim">{t.webglMissing}</p>}


      {screen === SCREENS.MENU && (
        <MainMenu onStart={() => setScreen(SCREENS.CHARACTER)} onPlayOnline={() => setScreen(SCREENS.ONLINE)} />
      )}

      {screen === SCREENS.CHARACTER && (
        <CharacterSelect
          onBack={() => setScreen(SCREENS.MENU)}
          onBrowse={setBrowsedCharacterId}
          onConfirm={(character) => {
            setPlayerCharacter(character);
            setScreen(SCREENS.DECK);
          }}
        />
      )}

      {screen === SCREENS.DECK && playerCharacter && (
        <DeckBuilder
          character={playerCharacter}
          onBack={() => setScreen(SCREENS.CHARACTER)}
          onConfirm={(composition, difficulty) => {
            const npcCharacter = randomCharacter(playerCharacter.id);
            setMatchSetup({
              key: `match-${Date.now()}`,
              playerComposition: composition,
              npcCharacter,
              npcComposition: randomComposition(),
              difficulty,
            });
            setScreen(SCREENS.MATCH);
          }}
        />
      )}

      {screen === SCREENS.MATCH && matchSetup && (
        <MatchScreen
          key={matchSetup.key}
          playerCharacter={playerCharacter}
          playerComposition={matchSetup.playerComposition}
          npcCharacter={matchSetup.npcCharacter}
          npcComposition={matchSetup.npcComposition}
          difficulty={matchSetup.difficulty}
          onExit={resetToMenu}
        />
      )}

      {screen === SCREENS.ONLINE && <OnlineFlow onExit={resetToMenu} onStage={handleOnlineStage} />}
    </div>
    </MatchSceneContext.Provider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <GameShell />
    </LanguageProvider>
  );
}
