import { BEATS } from './constants.js';

// returns 'a' | 'b' | 'draw'
export function resolveRound(cardTypeA, cardTypeB) {
  if (cardTypeA === cardTypeB) return 'draw';
  return BEATS[cardTypeA] === cardTypeB ? 'a' : 'b';
}

// How many cards of each type `side` has spent so far, from the round log.
// With Fate Swap the log shows the traded cards, so the spent physical card is
// the one recorded for the other side.
export function spentCounts(log, side) {
  const counts = { keo: 0, bua: 0, bao: 0 };
  const ownKey = side === 'player' ? 'playerCard' : 'npcCard';
  const otherKey = side === 'player' ? 'npcCard' : 'playerCard';
  for (const round of log) {
    counts[round[round.swapped ? otherKey : ownKey].type] += 1;
  }
  return counts;
}
