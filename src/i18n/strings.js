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
    skillRedrawAll: (actor, skillName) => `${actor} dùng ${skillName}: làm mới toàn bộ bài trên tay!`,
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

    howToPlay: 'Hướng dẫn chơi',
    close: 'Đóng',
    tutorialSteps: [
      'Chọn 1 nhân vật — mỗi nhân vật có 1 skill riêng, dùng được đúng 1 lần/trận.',
      'Xây deck 7 lá Kéo/Búa/Bao theo tỉ lệ tự do. Khi vào trận, cả 2 bên thấy được thành phần deck của nhau (nhưng không thấy skill).',
      'Mỗi trận gồm tối đa 7 turn, mỗi turn có 2 pha: Pha kỹ năng (6s, quyết định dùng skill hay không) rồi Pha chọn bài (14s, chọn 1 lá trên tay).',
      'Sau khi cả 2 bên sẵn sàng, bài được lật: Kéo thắng Bao, Búa thắng Kéo, Bao thắng Búa. Thắng +1 điểm, hòa không ai được điểm.',
      'Ai đạt 5 điểm trước sẽ thắng ngay lập tức. Nếu hết 7 turn mà chưa ai đủ 5 điểm, ai điểm cao hơn thắng; bằng điểm là hòa.',
    ],
    turnHistory: 'Lịch sử turn',
    noHistoryYet: 'Chưa có turn nào.',

    difficulty: 'Độ khó',
    difficultyLabels: { easy: 'Dễ', normal: 'Thường', hard: 'Khó' },

    playVsNpc: 'Chơi với NPC',
    playOnline: 'Chơi Online',
    createRoom: 'Tạo phòng',
    joinRoom: 'Vào phòng',
    roomCode: 'Mã phòng',
    enterRoomCode: 'Nhập mã phòng...',
    waitingForOpponent: 'Đang chờ đối thủ vào phòng...',
    shareRoomCode: (code) => `Chia sẻ mã phòng này cho bạn bè: ${code}`,
    connecting: 'Đang kết nối...',
    connectionError: 'Không kết nối được tới server. Kiểm tra server online đã chạy chưa.',
    opponentDisconnected: 'Đối thủ đã ngắt kết nối.',
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
    skillRedrawAll: (actor, skillName) => `${actor} used ${skillName}: refreshed their entire hand!`,
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

    howToPlay: 'How to Play',
    close: 'Close',
    tutorialSteps: [
      'Pick 1 character — each has its own skill, usable exactly once per match.',
      'Build a 7-card Scissors/Hammer/Paper deck in any ratio you like. At match start, both sides see each other\'s deck composition (but not their skill).',
      'Each match runs up to 7 rounds. Every round has 2 phases: Skill Phase (6s, decide whether to use your skill) then Choose Phase (14s, pick 1 card from your hand).',
      'Once both sides are ready, cards are revealed: Scissors beats Paper, Hammer beats Scissors, Paper beats Hammer. A win scores +1 point; a draw scores nothing.',
      'Reaching 5 points wins the match immediately. If nobody reaches 5 after 7 rounds, the higher score wins; equal scores are a draw.',
    ],
    turnHistory: 'Round History',
    noHistoryYet: 'No rounds played yet.',

    difficulty: 'Difficulty',
    difficultyLabels: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },

    playVsNpc: 'Play vs NPC',
    playOnline: 'Play Online',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    roomCode: 'Room Code',
    enterRoomCode: 'Enter room code...',
    waitingForOpponent: 'Waiting for an opponent to join...',
    shareRoomCode: (code) => `Share this room code with a friend: ${code}`,
    connecting: 'Connecting...',
    connectionError: 'Could not connect to the server. Check that the online server is running.',
    opponentDisconnected: 'The opponent disconnected.',
  },
};

export function useT() {
  const [lang] = useLanguage();
  const dict = STRINGS[lang];
  return { t: dict, lang };
}
