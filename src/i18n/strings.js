import { useLanguage } from './LanguageContext.jsx';

export const STRINGS = {
  vi: {
    appTitle: 'Oẳn Tù Tì: Thẻ Bài',
    menuDescription:
      'Trò chơi thẻ bài Kéo - Búa - Bao. Xây deck 7 lá, chọn nhân vật với 1 skill đặc biệt, và đối đầu NPC để giành 5 điểm trước!',
    playNow: 'Chơi ngay',

    chooseCharacter: 'Chọn nhân vật',
    confirmCharacter: 'Xác nhận nhân vật',

    buildDeckFor: (name) => `Xây deck cho ${name}`,
    deckHint: (n) => `Tự do phối ${n} lá bài Kéo/Búa/Bao theo ý bạn.`,
    total: 'Tổng',
    back: 'Quay lại',
    startMatch: 'Bắt đầu trận đấu',

    turn: 'TURN',
    you: 'BẠN',
    npc: 'NPC',
    phaseSkill: 'Pha kỹ năng',
    phaseChoose: 'Pha chọn bài',
    phaseResult: 'Kết quả turn',
    deckRemaining: (label, n) => `${label} · còn ${n} lá`,
    useSkill: (name) => `Dùng ${name}`,
    skip: 'Bỏ qua',
    skillUsedContinue: 'Skill đã dùng — Tiếp tục',
    ready: 'Sẵn sàng',
    waitingOpponent: 'Đã sẵn sàng, chờ đối thủ...',
    youSee: 'Bạn thấy đối thủ có',
    drawRound: 'Hòa turn này — không ai được điểm.',
    winRound: (who, pts) => `${who} thắng turn (+${pts} điểm)`,
    skillForceRedraw: (actor, target, skillName) =>
      `${actor} dùng ${skillName}: ${target} bị buộc đổi 1 lá trên tay!`,
    skillPeek: (actor, skillName) => `${actor} dùng ${skillName}: đã xem trộm 2 lá của đối thủ.`,
    skillCardLock: (actor, target, skillName) => `${actor} dùng ${skillName}: khóa 1 lá trên tay ${target}!`,
    skillDeferred: (actor, skillName) =>
      `${actor} đã kích hoạt ${skillName} — hiệu ứng sẽ áp dụng ở cuối turn.`,

    resultWin: 'Bạn thắng!',
    resultLose: 'Bạn thua!',
    resultDraw: 'Hòa!',
    reasonScore5: 'đã đạt 5 điểm trước!',
    reasonRoundsExhausted: 'sau khi kết thúc 7 lượt.',
    resultDrawText: (reason) => `Hai bên hòa điểm ${reason}`,
    resultOutcomeText: (who, reason) => `${who} ${reason}`,
    score: 'Tỉ số',
    backToMenu: 'Về menu chính',

    cardLabels: { keo: 'Kéo', bua: 'Búa', bao: 'Bao' },
  },

  en: {
    appTitle: 'Rock Paper Scissors: Card Duel',
    menuDescription:
      'A Rock-Paper-Scissors card duel. Build a 7-card deck, pick a character with a unique skill, and battle the NPC to 5 points first!',
    playNow: 'Play Now',

    chooseCharacter: 'Choose Your Character',
    confirmCharacter: 'Confirm Character',

    buildDeckFor: (name) => `Build ${name}'s Deck`,
    deckHint: (n) => `Freely mix ${n} Scissors/Hammer/Paper cards however you like.`,
    total: 'Total',
    back: 'Back',
    startMatch: 'Start Match',

    turn: 'TURN',
    you: 'YOU',
    npc: 'NPC',
    phaseSkill: 'Skill Phase',
    phaseChoose: 'Choose Phase',
    phaseResult: 'Round Result',
    deckRemaining: (label, n) => `${label} · ${n} left`,
    useSkill: (name) => `Use ${name}`,
    skip: 'Skip',
    skillUsedContinue: 'Skill already used — Continue',
    ready: 'Ready',
    waitingOpponent: 'Ready — waiting for opponent...',
    youSee: 'You see the opponent has',
    drawRound: 'Draw this round — no one scores.',
    winRound: (who, pts) => `${who} won the round (+${pts} pts)`,
    skillForceRedraw: (actor, target, skillName) =>
      `${actor} used ${skillName}: ${target} was forced to swap a card!`,
    skillPeek: (actor, skillName) => `${actor} used ${skillName}: peeked at 2 of the opponent's cards.`,
    skillCardLock: (actor, target, skillName) => `${actor} used ${skillName}: locked one of ${target}'s cards!`,
    skillDeferred: (actor, skillName) =>
      `${actor} activated ${skillName} — the effect will apply at the end of the round.`,

    resultWin: 'You Win!',
    resultLose: 'You Lose!',
    resultDraw: 'Draw!',
    reasonScore5: 'reached 5 points first!',
    reasonRoundsExhausted: 'after all 7 rounds.',
    resultDrawText: (reason) => `Both sides tied ${reason}`,
    resultOutcomeText: (who, reason) => `${who} ${reason}`,
    score: 'Score',
    backToMenu: 'Back to Menu',

    cardLabels: { keo: 'Scissors', bua: 'Hammer', bao: 'Paper' },
  },
};

export function useT() {
  const [lang] = useLanguage();
  const dict = STRINGS[lang];
  return { t: dict, lang };
}
