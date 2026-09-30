import { CARD_SPRITES } from '../data/cardSprites.js';
import { Sprite } from './Sprite.jsx';
import { useT } from '../i18n/strings.js';

// A card in the player's hand (design: tall pixel card with a big icon).
export function CardIcon({ type, selected, disabled, locked, justDrawn, onClick }) {
  const { t } = useT();
  const sprite = CARD_SPRITES[type];

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={`relative w-[78px] h-[110px] sm:w-[104px] sm:h-[146px] flex flex-col items-center justify-center gap-1.5 border-0 font-mono transition-transform duration-150 ${
        disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'
      } ${justDrawn ? 'animate-card-draw-in' : ''}`}
      style={{
        background: '#3b2718',
        transform: selected ? 'translateY(-14px)' : undefined,
        boxShadow: locked
          ? '0 0 0 3px #ff6a5a, 0 0 0 6px #2a1a10'
          : selected
          ? '0 0 0 3px #f2c14e, 0 0 0 6px #2a1a10, 0 0 22px 6px rgba(242,193,78,.45)'
          : '0 0 0 3px #2a1a10, inset 0 0 0 3px #6b4428, 0 6px 0 3px rgba(0,0,0,.35)',
      }}
      onClick={onClick}
    >
      {locked && (
        <span className="absolute -top-2.5 -right-2.5 text-sm" aria-hidden="true">
          🔒
        </span>
      )}
      <span className="flex items-center justify-center w-[58px] h-[58px] sm:w-[76px] sm:h-[76px] bg-[#2a1a10]">
        <Sprite rects={sprite.rects} size={52} />
      </span>
      <span className="text-[17px] sm:text-xl leading-none tracking-wide" style={{ color: selected ? '#f2c14e' : '#f3e2b8' }}>
        {t.cardLabels[type]}
      </span>
    </button>
  );
}
