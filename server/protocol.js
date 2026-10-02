// Pure helpers for the online server: payload validation, stage vote, and
// per-side state redaction. No I/O here, so they are unit-testable directly.
import { CARD_TYPES, DECK_SIZE, LEGACY_DECK_SIZE, otherSide } from '../src/engine/constants.js';
import { CHARACTERS } from '../src/data/characters.js';
import { STAGES, DEFAULT_STAGE } from '../src/data/stages.js';

// Returns { character, composition, stageVote } built from server-side data,
// or null when the client sent anything invalid. The character object is
// always the server's own copy, never the client's (a client could otherwise
// claim any skill).
export function validateSetup(msg) {
  // `character` (a whole object) is what clients cached before the
  // characterId protocol sent; only its id is used either way.
  const characterId = msg?.characterId ?? msg?.character?.id;
  const character = CHARACTERS.find((c) => c.id === characterId);
  if (!character) return null;

  const raw = msg.composition;
  if (!raw || typeof raw !== 'object') return null;
  const composition = {};
  let total = 0;
  for (const type of CARD_TYPES) {
    const n = raw[type] ?? 0;
    if (!Number.isInteger(n) || n < 0) return null;
    composition[type] = n;
    total += n;
  }
  // 9 cards; 7 still accepted from cached older clients (7 turns either way)
  if (total !== DECK_SIZE && total !== LEGACY_DECK_SIZE) return null;

  const stageVote = msg.stageVote ?? DEFAULT_STAGE;
  if (!Object.hasOwn(STAGES, stageVote)) return null;

  return { character, composition, stageVote };
}

// BR-3D-07: same vote → that stage; different votes → one of the two, 50/50.
export function pickStage(voteA, voteB, rng = Math.random) {
  if (voteA === voteB) return voteA;
  return rng() < 0.5 ? voteA : voteB;
}

const hide = (cards, prefix) => cards.map((_, i) => ({ id: `${prefix}-${i}`, type: null }));

// What `side` is allowed to see: the opponent's hand, pick, skill intent and
// locked card, and both draw piles, are replaced by placeholders/nulls.
export function redactFor(state, side) {
  const oppSide = otherSide(side);
  const me = state.players[side];
  const opp = state.players[oppSide];
  return {
    ...state,
    players: {
      [side]: { ...me, deckRemaining: hide(me.deckRemaining, 'mydeck') },
      [oppSide]: {
        ...opp,
        hand: hide(opp.hand, 'opphand'),
        deckRemaining: hide(opp.deckRemaining, 'oppdeck'),
        selectedCardId: null,
        skillDeclaredThisTurn: null,
        peekInfo: null,
        // card ids are sequential per type, so even the id of the locked card
        // would reveal its type
        lockedCardId: null,
      },
    },
  };
}
