import { SKILL_IDS } from '../engine/constants.js';

export const CHARACTERS = [
  {
    id: 'loi-long',
    name: { vi: 'Lôi Long', en: 'Dragon Warrior' },
    color: '#38a8e8',
    skillId: SKILL_IDS.SWAP,
  },
  {
    id: 'huyet-vu',
    name: { vi: 'Huyết Vũ', en: 'Berserker' },
    color: '#cc2020',
    skillId: SKILL_IDS.DOUBLE,
  },
  {
    id: 'am-anh',
    name: { vi: 'Ám Ảnh', en: 'Wraith' },
    color: '#c4a8e8',
    skillId: SKILL_IDS.DENY,
  },
  {
    id: 'bao-loan',
    name: { vi: 'Bạo Loạn', en: 'Thunder Monk' },
    color: '#f0cc00',
    skillId: SKILL_IDS.FORCE_REDRAW,
  },
  {
    id: 'thien-nhan',
    name: { vi: 'Thiên Nhãn', en: 'Mystic Seer' },
    color: '#38c898',
    skillId: SKILL_IDS.PEEK,
  },
];

export function randomCharacter(excludeId) {
  const pool = excludeId ? CHARACTERS.filter((c) => c.id !== excludeId) : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
