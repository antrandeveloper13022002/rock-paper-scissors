import { useEffect, useState } from 'react';
import { MainMenu } from './components/MainMenu.jsx';
import { CharacterSelect } from './components/CharacterSelect.jsx';
import { DeckBuilder } from './components/DeckBuilder.jsx';
import { MatchScreen } from './components/MatchScreen.jsx';
import { OnlineFlow } from './components/OnlineFlow.jsx';
import { randomCharacter } from './data/characters.js';
import { randomComposition } from './engine/deck.js';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext.jsx';
import { useT } from './i18n/strings.js';
import { sfx, isMuted, setMuted, startMusic } from './audio/sfx.js';

const SCREENS = {
  MENU: 'menu',
  CHARACTER: 'character',
  DECK: 'deck',
  MATCH: 'match',
  ONLINE: 'online',
};

function TopControls() {
  const [lang, setLang] = useLanguage();
  const [muted, setMutedState] = useState(isMuted());

  return (
    <div className="static sm:absolute flex justify-end gap-1 mb-2 sm:mb-0 sm:top-3 sm:right-3">
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
    </div>
  );
}

function GameShell() {
  const { t } = useT();
  const [screen, setScreen] = useState(SCREENS.MENU);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [matchSetup, setMatchSetup] = useState(null);

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

  const resetToMenu = () => {
    setScreen(SCREENS.MENU);
    setPlayerCharacter(null);
    setMatchSetup(null);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center w-full px-2 pt-2.5 pb-6 sm:px-4 sm:pt-4">
      <TopControls />
      <h1 className="text-center uppercase font-extrabold text-text mt-0.5 mb-4 text-[15px] tracking-[2px] sm:text-[22px] sm:tracking-[5px] [text-shadow:3px_3px_0_#000]">
        {t.appTitle}
      </h1>

      {screen === SCREENS.MENU && (
        <MainMenu onStart={() => setScreen(SCREENS.CHARACTER)} onPlayOnline={() => setScreen(SCREENS.ONLINE)} />
      )}

      {screen === SCREENS.CHARACTER && (
        <CharacterSelect
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

      {screen === SCREENS.ONLINE && <OnlineFlow onExit={resetToMenu} />}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <GameShell />
    </LanguageProvider>
  );
}
