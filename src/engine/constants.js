export const CARD_TYPES = ['keo', 'bua', 'bao'];

// key beats value
export const BEATS = {
  keo: 'bao',
  bua: 'keo',
  bao: 'bua',
};

export const DECK_SIZE = 7;
export const INITIAL_HAND_SIZE = 3;
export const WIN_SCORE = 5;
export const TOTAL_TURNS = DECK_SIZE;

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
};

// instant skills resolve immediately once both players declare in skill-phase
// deferred skills are registered and resolved later (swap before reveal, double/deny at scoring)
export const INSTANT_SKILLS = new Set([SKILL_IDS.FORCE_REDRAW, SKILL_IDS.PEEK]);
export const DEFERRED_SKILLS = new Set([SKILL_IDS.SWAP, SKILL_IDS.DOUBLE, SKILL_IDS.DENY]);
