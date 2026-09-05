import { useState } from 'react';
import { CARD_TYPES, DECK_SIZE, NPC_DIFFICULTIES, DEFAULT_NPC_DIFFICULTY } from '../engine/constants.js';
import { CARD_SPRITES } from '../data/cardSprites.js';
import { Sprite } from './Sprite.jsx';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

export function DeckBuilder({ character, onConfirm, onBack, showDifficulty = true }) {
  const { t, lang } = useT();
  const [composition, setComposition] = useState({ keo: 3, bua: 2, bao: 2 });
  const [difficulty, setDifficulty] = useState(DEFAULT_NPC_DIFFICULTY);

  const total = CARD_TYPES.reduce((sum, ty) => sum + composition[ty], 0);
  const isValid = total === DECK_SIZE;

  const change = (type, delta) => {
    sfx.click();
    setComposition((prev) => {
      const next = prev[type] + delta;
      if (next < 0 || next > DECK_SIZE) return prev;
      return { ...prev, [type]: next };
    });
  };

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim p-4 sm:p-6">
      <h2 className="mt-0 mb-1.5 uppercase tracking-wide text-sm font-bold">
        {t.buildDeckFor(character.name[lang])}
      </h2>
      <p className="text-text-dim text-xs -mt-1.5 mb-2">{t.deckHint(DECK_SIZE)}</p>

      {CARD_TYPES.map((type) => (
        <div className="flex items-center justify-between py-3 border-b border-border-dim last:border-b-0" key={type}>
          <div className="flex items-center gap-2.5">
            <Sprite rects={CARD_SPRITES[type].rects} size={32} />
            <span className="tracking-wide uppercase text-xs">{t.cardLabels[type]}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="w-[30px] h-[30px] bg-transparent text-text border-2 border-border-dim text-base font-bold cursor-pointer font-mono disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => change(type, -1)}
              disabled={composition[type] <= 0}
            >
              −
            </button>
            <span className="min-w-5 text-center font-bold text-base">{composition[type]}</span>
            <button
              className="w-[30px] h-[30px] bg-transparent text-text border-2 border-border-dim text-base font-bold cursor-pointer font-mono disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => change(type, 1)}
              disabled={total >= DECK_SIZE}
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div className={`text-center mt-4 font-bold tracking-wide text-xs uppercase ${isValid ? 'text-accent-green' : 'text-danger'}`}>
        {t.total}: {total} / {DECK_SIZE}
      </div>

      {showDifficulty && (
        <div className="mt-4 pt-3 border-t border-border-dim">
          <div className="text-center text-xs tracking-wide uppercase text-text-dim mb-2">{t.difficulty}</div>
          <div className="flex justify-center gap-2">
            {NPC_DIFFICULTIES.map((level) => (
              <button
                key={level}
                className={`px-3 py-1.5 text-xs uppercase tracking-wide border-2 font-mono font-bold ${
                  difficulty === level ? 'border-accent-blue text-accent-blue' : 'border-border-dim text-text-dim3'
                }`}
                onClick={() => {
                  sfx.click();
                  setDifficulty(level);
                }}
              >
                {t.difficultyLabels[level]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3.5 mt-3.5 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => {
            sfx.click();
            onBack();
          }}
        >
          {t.back}
        </Button>
        <Button
          variant="primary"
          disabled={!isValid}
          onClick={() => {
            sfx.click();
            onConfirm(composition, difficulty);
          }}
        >
          {t.startMatch}
        </Button>
      </div>
    </div>
  );
}
