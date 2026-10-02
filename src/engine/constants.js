export const CARD_TYPES = ['keo', 'bua', 'bao'];

export const otherSide = (side) => (side === 'player' ? 'npc' : 'player');

// key beats value
export const BEATS = {
  keo: 'bao',
  bua: 'keo',
  bao: 'bua',
};

export const DECK_SIZE = 9;
export const INITIAL_HAND_SIZE = 3;
export const WIN_SCORE = 5;
// 7 turns from a 9-card deck: 2 cards are never played, so neither hand is
// fully known until the last turn.
export const TOTAL_TURNS = 7;

export const SKILL_PHASE_SECONDS = 6;
export const CHOOSE_PHASE_SECONDS = 14;
export const TURN_SECONDS = SKILL_PHASE_SECONDS + CHOOSE_PHASE_SECONDS;

export const PHASES = {
  SKILL: 'skill',
  CHOOSE: 'choose',
  RESOLVED: 'resolved',
  FINISHED: 'finished',
};

export const SKILL_IDS = {
  SWAP: 'swap',
  DOUBLE: 'double',
  DENY: 'deny',
  FORCE_REDRAW: 'forceRedraw',
  PEEK: 'peek',
  POINT_STEAL: 'pointSteal',
  CARD_LOCK: 'cardLock',
  REDRAW_ALL: 'redrawAll',
};

// instant skills resolve immediately once both players declare in skill-phase
// deferred skills are registered and resolved later (swap before reveal, double/deny/pointSteal at scoring)
export const INSTANT_SKILLS = new Set([
  SKILL_IDS.FORCE_REDRAW,
  SKILL_IDS.PEEK,
  SKILL_IDS.CARD_LOCK,
  SKILL_IDS.REDRAW_ALL,
]);
export const DEFERRED_SKILLS = new Set([SKILL_IDS.SWAP, SKILL_IDS.DOUBLE, SKILL_IDS.DENY, SKILL_IDS.POINT_STEAL]);

export const NPC_DIFFICULTIES = ['easy', 'normal', 'hard'];
export const DEFAULT_NPC_DIFFICULTY = 'normal';
