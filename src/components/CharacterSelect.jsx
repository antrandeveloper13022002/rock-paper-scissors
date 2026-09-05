import { useState } from 'react';
import { CHARACTERS } from '../data/characters.js';
import { SKILLS } from '../data/skills.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';
import { Sprite } from './Sprite.jsx';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

export function CharacterSelect({ onConfirm }) {
  const { t, lang } = useT();
  const [selectedId, setSelectedId] = useState(CHARACTERS[0].id);
  const selected = CHARACTERS.find((c) => c.id === selectedId);
  const skill = SKILLS[selected.skillId];

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim p-4 sm:p-6">
      <h2 className="mt-0 mb-3 uppercase tracking-[3px] text-sm font-bold">{t.chooseCharacter}</h2>

      <div className="grid gap-2 sm:gap-3 my-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))' }}>
        {CHARACTERS.map((c) => {
          const sprite = CHARACTER_SPRITES[c.id];
          const isSelected = c.id === selectedId;
          return (
            <div
              key={c.id}
              className="bg-gradient-to-b from-panel-top to-panel-bot border-2 py-2.5 px-1.5 text-center cursor-pointer"
              style={{
                borderColor: isSelected ? c.color : undefined,
                boxShadow: isSelected ? `0 0 14px ${c.color}` : undefined,
              }}
              onClick={() => {
                sfx.click();
                setSelectedId(c.id);
              }}
            >
              <div className="flex justify-center mb-1.5">
                <Sprite grid={sprite.grid} pal={sprite.pal} rects={sprite.rects} size={56} />
              </div>
              <div
                className="text-[10px] tracking-wide uppercase"
                style={{ color: isSelected ? c.color : 'var(--color-text-dim3)' }}
              >
                {c.name[lang]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3.5 border border-border-dim text-[13px] leading-relaxed">
        <strong className="block tracking-wide uppercase text-xs mb-1.5">{skill.name[lang]}</strong>
        <div>{skill.description[lang]}</div>
      </div>

      <div className="flex justify-center gap-3.5 mt-3.5 flex-wrap">
        <Button
          variant="primary"
          onClick={() => {
            sfx.click();
            onConfirm(selected);
          }}
        >
          {t.confirmCharacter}
        </Button>
      </div>
    </div>
  );
}
