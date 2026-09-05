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
  {
    id: 'chien-binh',
    name: { vi: 'Chiến Binh', en: 'Warrior' },
    color: '#cc2222',
    skillId: SKILL_IDS.POINT_STEAL,
  },
  {
    id: 'phap-su',
    name: { vi: 'Pháp Sư', en: 'Mage' },
    color: '#9955dd',
    skillId: SKILL_IDS.CARD_LOCK,
  },
  {
    id: 'thach-linh',
    name: { vi: 'Thạch Linh', en: 'Golem' },
    color: '#889aaa',
    skillId: SKILL_IDS.REDRAW_ALL,
  },
];

export function randomCharacter(excludeId) {
  const pool = excludeId ? CHARACTERS.filter((c) => c.id !== excludeId) : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
