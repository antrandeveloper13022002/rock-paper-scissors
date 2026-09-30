import { SKILL_IDS, INSTANT_SKILLS } from '../engine/constants.js';

export const SKILLS = {
  [SKILL_IDS.SWAP]: {
    id: SKILL_IDS.SWAP,
    name: { vi: 'Đảo Số Phận', en: 'Fate Swap' },
    description: {
      vi: 'Sau khi cả 2 bên chọn bài xong, hoán đổi lá bài của 2 bên ở lượt này trước khi lật bài.',
      en: "After both sides pick their card, swap it with the opponent's for this round before reveal.",
    },
  },
  [SKILL_IDS.DOUBLE]: {
    id: SKILL_IDS.DOUBLE,
    name: { vi: 'Cuồng Phong', en: 'Berserk Rage' },
    description: {
      vi: 'Nếu thắng lượt này, điểm nhận được nhân đôi.',
      en: 'If you win this round, your points earned are doubled.',
    },
  },
  [SKILL_IDS.DENY]: {
    id: SKILL_IDS.DENY,
    name: { vi: 'Oán Niệm', en: 'Curse' },
    description: {
      vi: 'Nếu thua lượt này, đối thủ thắng cũng không được cộng điểm.',
      en: 'If you lose this round, the winner still gets no points.',
    },
  },
  [SKILL_IDS.FORCE_REDRAW]: {
    id: SKILL_IDS.FORCE_REDRAW,
    name: { vi: 'Hỗn Loạn', en: 'Chaos Strike' },
    description: {
      vi: 'Buộc đối thủ trả về 1 lá ngẫu nhiên trên tay và rút lá mới thay thế trước khi họ chọn bài.',
      en: "Forces the opponent to discard a random card from their hand and draw a new one before they choose.",
    },
  },
  [SKILL_IDS.PEEK]: {
    id: SKILL_IDS.PEEK,
    name: { vi: 'Thiên Nhãn', en: 'Third Eye' },
    description: {
      vi: 'Xem trộm 2 lá ngẫu nhiên trên tay hiện tại của đối thủ.',
      en: "Peek at 2 random cards currently in the opponent's hand.",
    },
  },
  [SKILL_IDS.POINT_STEAL]: {
    id: SKILL_IDS.POINT_STEAL,
    name: { vi: 'Cướp Điểm', en: 'Point Steal' },
    description: {
      vi: 'Nếu thắng lượt này, ngoài điểm nhận được còn trừ 1 điểm của đối thủ (không dưới 0).',
      en: "If you win this round, on top of your points, take 1 point away from the opponent (never below 0).",
    },
  },
  [SKILL_IDS.CARD_LOCK]: {
    id: SKILL_IDS.CARD_LOCK,
    name: { vi: 'Khóa Bài', en: 'Card Lock' },
    description: {
      vi: 'Khóa 1 lá ngẫu nhiên trên tay đối thủ, họ không thể chọn lá đó ở lượt này.',
      en: "Locks 1 random card in the opponent's hand — they cannot pick it this round.",
    },
  },
  [SKILL_IDS.REDRAW_ALL]: {
    id: SKILL_IDS.REDRAW_ALL,
    name: { vi: 'Tái Sinh', en: 'Reshape' },
    description: {
      vi: 'Trả lại toàn bộ bài trên tay và rút một bộ bài mới cùng số lượng từ bộ bài của bạn.',
      en: 'Discard your entire hand and draw a fresh hand of the same size from your own deck.',
    },
  },
};

export function isInstantSkill(skillId) {
  return INSTANT_SKILLS.has(skillId);
}
