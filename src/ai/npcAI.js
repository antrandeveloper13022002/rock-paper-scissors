import { BEATS, CARD_TYPES } from '../engine/constants.js';

const counterType = (type) => Object.entries(BEATS).find(([, beaten]) => beaten === type)?.[0];

const SKILL_CHANCE = {
  easy: { behind: 0.25, even: 0.12, ahead: 0.04 },
  normal: { behind: 0.6, even: 0.35, ahead: 0.15 },
  hard: { behind: 0.8, even: 0.5, ahead: 0.25 },
};

export function decideSkillUse(npc, player, difficulty = 'normal') {
  if (npc.skillUsed) return false;
  const chances = SKILL_CHANCE[difficulty] ?? SKILL_CHANCE.normal;
  const chance = npc.score < player.score ? chances.behind : npc.score > player.score ? chances.ahead : chances.even;
  return Math.random() < chance;
}

// Counts how many of each type the opponent has already played, from the round log.
function countPlayed(log, side) {
  const played = { keo: 0, bua: 0, bao: 0 };
  log.forEach((round) => {
    const card = side === 'player' ? round.playerCard : round.npcCard;
    if (card) played[card.type] += 1;
  });
  return played;
}

// Infers the type the opponent most likely still holds, from their known starting
// deck composition (visible to both sides at match start) minus what they've
// already played. Returns null if there's no meaningful signal (e.g. turn 1).
export function inferLikelyOpponentType(opponentComposition, log, side = 'player') {
  if (!opponentComposition || log.length === 0) return null;
  const played = countPlayed(log, side);
  const remaining = {};
  for (const type of CARD_TYPES) {
    remaining[type] = (opponentComposition[type] ?? 0) - played[type];
  }
  let best = null;
  let bestCount = 0;
  for (const type of CARD_TYPES) {
    if (remaining[type] > bestCount) {
      bestCount = remaining[type];
      best = type;
    }
  }
  return best;
}

export function decideCard(npc, { opponentComposition, log, difficulty = 'normal' } = {}) {
  const { hand, peekInfo } = npc;
  if (hand.length === 0) return null;

  // Easy NPCs don't read any signals at all — always a blind random pick.
  if (difficulty === 'easy') {
    return hand[Math.floor(Math.random() * hand.length)].id;
  }

  // Peeked cards are certain knowledge — always the strongest signal available.
  if (peekInfo && peekInfo.length > 0) {
    const counters = peekInfo.map((c) => counterType(c.type)).filter(Boolean);
    const counterCard = hand.find((c) => counters.includes(c.type));
    if (counterCard) return counterCard.id;
  }

  // Otherwise fall back to reading the opponent's known deck composition against
  // what they've played so far, and counter whichever type they most likely
  // still hold the most of.
  const likelyType = inferLikelyOpponentType(opponentComposition, log ?? []);
  if (likelyType) {
    const counter = counterType(likelyType);
    const counterCard = hand.find((c) => c.type === counter);
    if (counterCard) return counterCard.id;

    // Hard NPCs settle for a safe draw (matching the likely type) over a blind
    // gamble when they can't outright counter it.
    if (difficulty === 'hard') {
      const drawCard = hand.find((c) => c.type === likelyType);
      if (drawCard) return drawCard.id;
    }
  }

  return hand[Math.floor(Math.random() * hand.length)].id;
}
