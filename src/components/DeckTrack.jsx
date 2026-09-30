import { CARD_TYPES } from '../engine/constants.js';
import { spentCounts } from '../engine/rules.js';
import { CARD_SPRITES } from '../data/cardSprites.js';
import { Sprite } from './Sprite.jsx';
import { useT } from '../i18n/strings.js';

// A side's whole deck as a row of card icons, grouped by type. Spent cards
// (from the round log) fade to grey, rightmost of their group first.
export function DeckTrack({ composition, log, side, size = 18, align = 'center' }) {
  const { t } = useT();
  const spent = spentCounts(log, side);
  const label = CARD_TYPES.filter((type) => composition[type] > 0)
    .map((type) => t.deckTrackPart(t.cardLabels[type], composition[type] - spent[type], composition[type]))
    .join(', ');

  return (
    <div className={`flex flex-wrap gap-1 ${align === 'start' ? 'justify-start' : 'justify-center'}`} role="img" aria-label={label}>
      {CARD_TYPES.flatMap((type) =>
        Array.from({ length: composition[type] }, (_, i) => {
          const isSpent = i >= composition[type] - spent[type];
          return (
            <span
              key={`${type}-${i}`}
              className="inline-flex p-0.5 bg-[#3b2718] shadow-[0_0_0_2px_#2a1a10] transition-[filter,opacity] duration-700"
              style={{ filter: isSpent ? 'grayscale(1) brightness(0.7)' : 'none', opacity: isSpent ? 0.4 : 1 }}
            >
              <Sprite rects={CARD_SPRITES[type].rects} size={size} />
            </span>
          );
        })
      )}
    </div>
  );
}
