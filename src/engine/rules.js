import { BEATS } from './constants.js';

// returns 'a' | 'b' | 'draw'
export function resolveRound(cardTypeA, cardTypeB) {
  if (cardTypeA === cardTypeB) return 'draw';
  return BEATS[cardTypeA] === cardTypeB ? 'a' : 'b';
}
