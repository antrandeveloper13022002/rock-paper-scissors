import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

export function MainMenu({ onStart }) {
  const { t } = useT();
  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim p-4 sm:p-6 text-center">
      <p className="text-text-dim leading-relaxed text-[13px] mb-6">{t.menuDescription}</p>
      <Button
        variant="primary"
        onClick={() => {
          sfx.click();
          onStart();
        }}
      >
        {t.playNow}
      </Button>
    </div>
  );
}
