import { useState } from 'react';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';
import { TutorialModal } from './TutorialModal.jsx';

export function MainMenu({ onStart, onPlayOnline }) {
  const { t } = useT();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim p-4 sm:p-6 text-center">
      <p className="text-text-dim leading-relaxed text-[13px] mb-6">{t.menuDescription}</p>
      <div className="flex flex-col items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            sfx.click();
            onStart();
          }}
        >
          {t.playVsNpc}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            sfx.click();
            onPlayOnline();
          }}
        >
          {t.playOnline}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            sfx.click();
            setShowTutorial(true);
          }}
        >
          {t.howToPlay}
        </Button>
      </div>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
