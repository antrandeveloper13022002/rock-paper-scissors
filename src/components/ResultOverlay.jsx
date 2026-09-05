import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

export function ResultOverlay({ result, player, npc, onExit }) {
  const { t } = useT();
  const isDraw = result.winner === 'draw';
  const isPlayerWin = result.winner === 'player';

  const titleColor = isDraw ? 'text-accent-blue' : isPlayerWin ? 'text-accent-green' : 'text-danger';
  const titleText = isDraw ? t.resultDraw : isPlayerWin ? t.resultWin : t.resultLose;
  const reason = result.reason === 'score5' ? t.reasonScore5 : t.reasonRoundsExhausted;

  return (
    <div className="absolute inset-0 bg-[rgba(3,4,8,0.92)] flex items-center justify-center z-20">
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
