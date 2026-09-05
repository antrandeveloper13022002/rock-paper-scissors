import { CARD_SPRITES } from '../data/cardSprites.js';
import { Sprite } from './Sprite.jsx';
import { useT } from '../i18n/strings.js';

export function CardIcon({ type, selected, disabled, justDrawn, onClick }) {
  const { t } = useT();
  const sprite = CARD_SPRITES[type];

  return (
    <div
      className={`bg-gradient-to-b from-panel-top to-panel-bot border-2 py-1.5 px-1.5 pb-2 flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[72px] ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${justDrawn ? 'animate-card-draw-in' : ''}`}
      style={{
        borderColor: selected ? sprite.accent : undefined,
        boxShadow: selected ? `0 0 14px ${sprite.accent}` : undefined,
      }}
      onClick={disabled ? undefined : onClick}
    >
      <Sprite rects={sprite.rects} size={40} />
      <span
        className="text-[10px] tracking-wide font-bold"
        style={{ color: selected ? sprite.accent : 'var(--color-text-dim3)' }}
      >
        {t.cardLabels[type]}
      </span>
    </div>
  );
}
