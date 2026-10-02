import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

// `outcome` is from the viewer's side ('win' | 'lose' | 'draw'), so online
// players on either side see their own result.
export function ResultOverlay({ result, outcome, player, npc, onExit }) {
  const { t } = useT();
  const isDraw = outcome === 'draw';
  const isPlayerWin = outcome === 'win';

  const titleColor = isDraw ? 'text-accent-blue' : isPlayerWin ? 'text-accent-green' : 'text-danger';
  const titleText = isDraw ? t.resultDraw : isPlayerWin ? t.resultWin : t.resultLose;
  const reason =
    result.reason === 'score5'
      ? t.reasonScore5
      : result.reason === 'forfeit'
      ? t.reasonForfeit[isPlayerWin ? 'win' : 'lose'][result.cause ?? 'left']
      : t.reasonRoundsExhausted;

  return (
    <div className="fixed inset-0 bg-[rgba(3,4,8,0.75)] flex items-center justify-center z-20">
      <div className="bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim2 p-5 sm:p-[30px] text-center max-w-[calc(100vw-48px)] sm:max-w-[320px]">
        <div className={`text-xl sm:text-2xl font-extrabold tracking-wide uppercase mb-2.5 ${titleColor}`}>
          {titleText}
        </div>
        <p className="text-text-dim">
          {isDraw ? t.resultDrawText(reason) : t.resultOutcomeText(isPlayerWin ? t.you : t.npc, reason)}
        </p>
        <p className="font-bold text-lg my-3">
          {t.score}: {player.score} — {npc.score}
        </p>
        <Button
          variant="primary"
          onClick={() => {
            sfx.click();
            onExit();
          }}
        >
          {t.backToMenu}
        </Button>
      </div>
    </div>
  );
}
