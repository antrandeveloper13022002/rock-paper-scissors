import { useState } from 'react';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';
import { TutorialModal } from './TutorialModal.jsx';

// Design board 01: big pixel title, wood panel with the three choices; the 3D
// scene (castle + two idle characters) fills the rest.
export function MainMenu({ onStart, onPlayOnline }) {
  const { t } = useT();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="w-full flex flex-col items-center gap-8 sm:gap-12 pt-4 sm:pt-10">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="m-0 text-6xl sm:text-9xl leading-[0.9] font-normal tracking-[4px] text-accent-blue [text-shadow:6px_6px_0_#2a1a10,10px_10px_0_rgba(0,0,0,.35)]">
          {t.titleMain}
        </h1>
        <p className="m-0 text-2xl sm:text-4xl tracking-[10px] [text-shadow:4px_4px_0_#2a1a10]">{t.titleSub}</p>
      </div>

      <nav className="w-full max-w-[380px] bg-gradient-to-b from-panel-top to-panel-bot pixel-panel p-6 flex flex-col gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            sfx.click();
            onStart();
          }}
        >
          {t.playVsNpc}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            sfx.click();
            onPlayOnline();
          }}
        >
          {t.playOnline}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            sfx.click();
            setShowTutorial(true);
          }}
        >
          {t.howToPlay}
        </Button>
      </nav>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
