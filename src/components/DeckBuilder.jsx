import { useState } from 'react';
import { CARD_TYPES, DECK_SIZE, NPC_DIFFICULTIES, DEFAULT_NPC_DIFFICULTY } from '../engine/constants.js';
import { CARD_SPRITES } from '../data/cardSprites.js';
import { Sprite } from './Sprite.jsx';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

const LABEL_COLORS = { keo: '#e0e6ee', bua: '#ffb07a', bao: '#f0d890' };

// One card lying on the table (display only).
function TableCard({ type, index, count }) {
  const tilt = (index - (count - 1) / 2) * 4;
  return (
    <div
      className="w-[32px] h-[46px] sm:w-[92px] sm:h-[130px] flex flex-col items-center justify-center gap-1 animate-card-draw-in"
      style={{
        background: '#3b2718',
        boxShadow: '0 0 0 3px #2a1a10, inset 0 0 0 3px #6b4428, 0 10px 0 3px rgba(0,0,0,.35)',
        transform: `rotate(${tilt}deg) translateY(${Math.abs(tilt) * 1.5}px)`,
      }}
    >
      <span className="hidden sm:flex items-center justify-center w-16 h-16 bg-[#2a1a10]">
        <Sprite rects={CARD_SPRITES[type].rects} size={52} />
      </span>
      <span className="sm:hidden">
        <Sprite rects={CARD_SPRITES[type].rects} size={22} />
      </span>
    </div>
  );
}

// Design board 03: cards laid out on a wooden table, steppers in a wood panel.
export function DeckBuilder({ onConfirm, onBack, showDifficulty = true, step = 2, steps = 2 }) {
  const { t } = useT();
  const [composition, setComposition] = useState({ keo: 3, bua: 3, bao: 3 });
  const [difficulty, setDifficulty] = useState(DEFAULT_NPC_DIFFICULTY);

  const total = CARD_TYPES.reduce((sum, ty) => sum + composition[ty], 0);
  const isValid = total === DECK_SIZE;
  const cards = CARD_TYPES.flatMap((type) => Array.from({ length: composition[type] }, () => type));

  const change = (type, delta) => {
    if (delta > 0) sfx.card(type);
    else sfx.click();
    setComposition((prev) => {
      const next = prev[type] + delta;
      if (next < 0 || next > DECK_SIZE) return prev;
      return { ...prev, [type]: next };
    });
  };

  const stepBtn =
    'w-11 h-11 border-0 cursor-pointer font-mono text-2xl text-[#f3e2b8] bg-[#4d4858] shadow-[0_0_0_3px_#2a1a10,inset_0_-4px_0_#353140,inset_0_3px_0_#6a6479] enabled:hover:brightness-110 disabled:opacity-35 disabled:cursor-not-allowed';

  return (
    <div className="w-full max-w-[1100px] flex flex-col items-center gap-5 sm:gap-7">
      <div className="w-full flex items-center gap-5">
        <Button
          variant="ghost"
          onClick={() => {
            sfx.click();
            onBack();
          }}
        >
          ‹ {t.back}
        </Button>
        <span className="text-lg sm:text-xl tracking-[4px] text-text-dim [text-shadow:2px_2px_0_#2a1a10]">{t.stepOf(step, steps)}</span>
      </div>

      <div className="flex flex-col items-center gap-1 text-center [text-shadow:3px_3px_0_#2a1a10]">
        <h2 className="m-0 text-4xl sm:text-6xl leading-none font-normal text-accent-blue">{t.deckTitle(DECK_SIZE)}</h2>
        <p className="m-0 text-lg sm:text-2xl">{t.deckSubtitle}</p>
      </div>

      {/* the wooden table with the deck laid out */}
      <div
        className="w-full py-5 sm:py-8 flex justify-center gap-1 sm:gap-3 min-h-[86px] sm:min-h-[196px]"
        style={{
          background: 'repeating-linear-gradient(90deg, #6b4428 0 116px, #5a3a22 116px 120px)',
          boxShadow: '0 0 0 3px #2a1a10, inset 0 5px 0 #8a5a34, 0 14px 0 3px rgba(0,0,0,.4)',
        }}
        role="img"
        aria-label={CARD_TYPES.map((ty) => `${t.cardLabels[ty]} ${composition[ty]}`).join(', ')}
      >
        {cards.map((type, i) => (
          <TableCard key={`${type}-${i}`} type={type} index={i} count={cards.length} />
        ))}
        {Array.from({ length: DECK_SIZE - cards.length }, (_, i) => (
          <div key={`empty-${i}`} className="w-[32px] h-[46px] sm:w-[92px] sm:h-[130px] border-2 border-dashed border-[#2a1a10] opacity-60" />
        ))}
      </div>

      {/* steppers + enter match */}
      <section className="w-full max-w-[860px] bg-gradient-to-b from-panel-top to-panel-bot pixel-panel px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="flex-1 grid grid-cols-3 gap-3">
            {CARD_TYPES.map((type) => (
              <div key={type} className="flex flex-col gap-2">
                <span className="text-xl sm:text-2xl leading-none" style={{ color: LABEL_COLORS[type] }}>
                  {t.cardLabels[type]}
                </span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button type="button" className={stepBtn} aria-label={t.removeCard(t.cardLabels[type])} disabled={composition[type] <= 0} onClick={() => change(type, -1)}>
                    −
                  </button>
                  <span className="w-6 text-center text-3xl">{composition[type]}</span>
                  <button type="button" className={stepBtn} aria-label={t.addCard(t.cardLabels[type])} disabled={total >= DECK_SIZE} onClick={() => change(type, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
            <span className={`text-xl ${isValid ? 'text-accent-green' : 'text-danger'}`} aria-live="polite">
              {t.deckCount(total, DECK_SIZE)}
            </span>
            <Button
              variant="primary"
              size="lg"
              disabled={!isValid}
              onClick={() => {
                sfx.click();
                onConfirm(composition, difficulty);
              }}
            >
              {t.enterMatch} ›
            </Button>
          </div>
        </div>

        {showDifficulty && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t-2 border-[#3d2616]">
            <span className="text-lg text-text-dim">{t.difficulty}</span>
            {NPC_DIFFICULTIES.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={difficulty === level}
                className="px-3 py-1.5 border-0 cursor-pointer font-mono text-lg"
                style={{
                  background: difficulty === level ? '#f2c14e' : '#3b2718',
                  color: difficulty === level ? '#2a1a10' : '#f3e2b8',
                  boxShadow: '0 0 0 3px #2a1a10',
                }}
                onClick={() => {
                  sfx.click();
                  setDifficulty(level);
                }}
              >
                {t.difficultyLabels[level]}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
