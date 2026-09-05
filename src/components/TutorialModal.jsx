import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

export function TutorialModal({ onClose }) {
  const { t } = useT();

  return (
    <div className="fixed inset-0 bg-[rgba(3,4,8,0.92)] flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim2 p-5 sm:p-6 max-w-[480px] w-full max-h-[80vh] overflow-y-auto">
        <h2 className="mt-0 mb-4 uppercase tracking-[3px] text-sm font-bold text-accent-blue">{t.howToPlay}</h2>
        <ol className="list-decimal pl-5 space-y-3 text-[13px] leading-relaxed text-text">
          {t.tutorialSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <div className="flex justify-center mt-5">
          <Button
            variant="primary"
            onClick={() => {
              sfx.click();
              onClose();
            }}
          >
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
