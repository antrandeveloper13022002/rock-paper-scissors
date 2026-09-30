import { useEffect, useState } from 'react';
import { CHARACTERS } from '../data/characters.js';
import { SKILLS } from '../data/skills.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';
import { Sprite } from './Sprite.jsx';
import { STAGES } from '../data/stages.js';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

// Design board 02: grid + skill scroll on the left, the chosen character
// shown large in the 3D scene on the right (placed by the App).
export function CharacterSelect({ onConfirm, onBack, onBrowse, step = 1, steps = 2 }) {
  const { t, lang } = useT();
  const [selectedId, setSelectedId] = useState(CHARACTERS[0].id);
  const selected = CHARACTERS.find((c) => c.id === selectedId);
  const skill = SKILLS[selected.skillId];
  const stage = STAGES[selected.id];

  useEffect(() => {
    onBrowse?.(selectedId);
  }, [selectedId, onBrowse]);

  return (
    <div className="w-full max-w-[1360px] flex-1 flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-[760px] flex flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-between">
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

        <h2 className="m-0 text-4xl sm:text-6xl leading-none font-normal text-accent-blue [text-shadow:4px_4px_0_#2a1a10]">
          {t.chooseCharacter}
        </h2>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-5">
          {CHARACTERS.map((c) => {
            const sprite = CHARACTER_SPRITES[c.id];
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isSelected}
                className="flex flex-col items-center justify-between gap-1 px-1 py-2 sm:py-2.5 border-0 cursor-pointer font-mono text-text"
                style={{
                  background: isSelected ? '#4a3220' : '#3b2718',
                  boxShadow: isSelected
                    ? '0 0 0 3px #f2c14e, 0 0 0 6px #2a1a10, 0 0 22px 6px rgba(242,193,78,.4)'
                    : '0 0 0 3px #2a1a10, inset 0 0 0 3px #6b4428',
                }}
                onClick={() => {
                  sfx.click();
                  setSelectedId(c.id);
                }}
              >
                <Sprite grid={sprite.grid} pal={sprite.pal} rects={sprite.rects} size={72} />
                <span className="text-base sm:text-xl leading-none">{c.name[lang]}</span>
                <span className="hidden sm:block text-[15px] leading-none text-text-dim">{SKILLS[c.skillId].name[lang]}</span>
              </button>
            );
          })}
        </div>

        <section className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-5 py-4 bg-[#e8d3a0] text-[#2a1a10] shadow-[0_0_0_3px_#2a1a10,inset_0_3px_0_#f6e8c4,inset_0_-3px_0_#c7ad74]">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[15px] tracking-[3px] text-[#6b4428]">{t.skillOncePerMatch}</span>
            <strong className="text-2xl sm:text-3xl leading-none font-normal">{skill.name[lang]}</strong>
            <p className="m-0 text-base sm:text-lg leading-snug">{skill.description[lang]}</p>
            <span className="text-base text-[#8a4a12]">{t.stageLabel(stage.name[lang])}</span>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="shrink-0"
            onClick={() => {
              sfx.click();
              onConfirm(selected);
            }}
          >
            {t.continueNext} ›
          </Button>
        </section>
      </div>

      {/* right half: the 3D scene shows the chosen character here */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-end pb-6 [text-shadow:2px_2px_0_#2a1a10]">
        <span className="text-3xl" style={{ color: selected.color }}>
          {selected.name[lang]}
        </span>
        <span className="text-xl text-accent-blue">{t.stageLabel(stage.name[lang])}</span>
      </div>
    </div>
  );
}
