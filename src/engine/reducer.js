import {
  PHASES,
  SKILL_IDS,
  INSTANT_SKILLS,
  INITIAL_HAND_SIZE,
  WIN_SCORE,
  TOTAL_TURNS,
} from './constants.js';
import { buildDeck, shuffle, drawOne, removeCard } from './deck.js';
import { resolveRound } from './rules.js';

function createPlayerState(character, composition) {
  const fullDeck = shuffle(buildDeck(composition));
  const hand = fullDeck.slice(0, INITIAL_HAND_SIZE);
  const deckRemaining = fullDeck.slice(INITIAL_HAND_SIZE);
  return {
    character,
    deckRemaining,
    hand,
    score: 0,
    skillUsed: false,
    skillDeclaredThisTurn: null,
    pendingDeferredSkill: null,
    selectedCardId: null,
    ready: false,
    peekInfo: null,
  };
}

export function createMatch({ playerCharacter, playerComposition, npcCharacter, npcComposition }) {
  return {
    phase: PHASES.SKILL,
    turnNumber: 1,
    players: {
      player: createPlayerState(playerCharacter, playerComposition),
      npc: createPlayerState(npcCharacter, npcComposition),
    },
    lastRound: null,
    log: [],
    result: null,
  };
}

const otherSide = (side) => (side === 'player' ? 'npc' : 'player');

function bothDeclared(players) {
  return players.player.skillDeclaredThisTurn !== null && players.npc.skillDeclaredThisTurn !== null;
}

function resolveSkillPhase(state) {
  const players = {
    player: { ...state.players.player },
    npc: { ...state.players.npc },
  };
  const events = [];

  for (const side of ['player', 'npc']) {
    const p = players[side];
    if (p.skillDeclaredThisTurn !== true) continue;
    const skillId = p.character.skillId;
    p.skillUsed = true;

    if (INSTANT_SKILLS.has(skillId)) {
      if (skillId === SKILL_IDS.FORCE_REDRAW) {
        const target = players[otherSide(side)];
        // The discarded card must go back into the deck before drawing its
        // replacement — otherwise the deck shrinks by an extra card and the
        // target ends up short a card (and a turn) later in the match.
        if (target.hand.length > 0 && target.deckRemaining.length > 0) {
          const idx = Math.floor(Math.random() * target.hand.length);
          const discarded = target.hand[idx];
          const remainingHand = target.hand.filter((c) => c.id !== discarded.id);
          const { card, deck } = drawOne(shuffle([...target.deckRemaining, discarded]));
          players[otherSide(side)] = {
            ...target,
            hand: [...remainingHand, card],
            deckRemaining: deck,
          };
          events.push({ type: SKILL_IDS.FORCE_REDRAW, by: side });
        }
      } else if (skillId === SKILL_IDS.PEEK) {
        const target = players[otherSide(side)];
        const shuffled = shuffle(target.hand);
        p.peekInfo = shuffled.slice(0, 2);
        events.push({ type: SKILL_IDS.PEEK, by: side });
      }
    } else {
      p.pendingDeferredSkill = skillId;
      events.push({ type: skillId, by: side, deferred: true });
    }
  }

  return {
    ...state,
    phase: PHASES.CHOOSE,
    players,
    skillEvents: events,
  };
}

function bothReady(players) {
  return players.player.ready && players.npc.ready;
}

function resolveChoosePhase(state) {
  let players = {
    player: { ...state.players.player },
    npc: { ...state.players.npc },
  };

  const originalPlayerCard = players.player.hand.find((c) => c.id === players.player.selectedCardId);
  const originalNpcCard = players.npc.hand.find((c) => c.id === players.npc.selectedCardId);

  // swap resolves before reveal: each side is judged using the other's chosen card
  const swapUser = ['player', 'npc'].find(
    (side) => players[side].pendingDeferredSkill === SKILL_IDS.SWAP
  );
  const playerCard = swapUser ? originalNpcCard : originalPlayerCard;
  const npcCard = swapUser ? originalPlayerCard : originalNpcCard;

  const outcome = resolveRound(playerCard.type, npcCard.type); // 'a' = player, 'b' = npc, 'draw'
  const winnerSide = outcome === 'draw' ? null : outcome === 'a' ? 'player' : 'npc';

  let pointsAwarded = 0;
  if (winnerSide) {
    const winner = players[winnerSide];
    const loser = players[otherSide(winnerSide)];
    pointsAwarded = winner.pendingDeferredSkill === SKILL_IDS.DOUBLE ? 2 : 1;
    if (loser.pendingDeferredSkill === SKILL_IDS.DENY) {
      pointsAwarded = 0;
    }
    players[winnerSide] = { ...winner, score: winner.score + pointsAwarded };
  }

  // remove the originally selected physical cards from each hand
  players.player.hand = removeCard(players.player.hand, originalPlayerCard.id);
  players.npc.hand = removeCard(players.npc.hand, originalNpcCard.id);

  const roundRecord = {
    turnNumber: state.turnNumber,
    playerCard,
    npcCard,
    winnerSide,
    pointsAwarded,
  };

  let result = null;
  if (players.player.score >= WIN_SCORE || players.npc.score >= WIN_SCORE) {
    const winner = players.player.score >= WIN_SCORE ? 'player' : 'npc';
    result = { winner, reason: 'score5' };
  }

  return {
    ...state,
    phase: PHASES.RESOLVED,
    players,
    lastRound: roundRecord,
    log: [...state.log, roundRecord],
    result,
  };
}

function startNextTurn(state) {
  if (state.result) {
    return { ...state, phase: PHASES.FINISHED };
  }

  if (state.turnNumber >= TOTAL_TURNS) {
    const { player, npc } = state.players;
    let result;
    if (player.score > npc.score) result = { winner: 'player', reason: 'roundsExhausted' };
    else if (npc.score > player.score) result = { winner: 'npc', reason: 'roundsExhausted' };
    else result = { winner: 'draw', reason: 'roundsExhausted' };
    return { ...state, phase: PHASES.FINISHED, result };
  }

  const players = {
    player: { ...state.players.player },
    npc: { ...state.players.npc },
  };

  for (const side of ['player', 'npc']) {
    const p = players[side];
    const { card, deck } = drawOne(p.deckRemaining);
    players[side] = {
      ...p,
      hand: card ? [...p.hand, card] : p.hand,
      deckRemaining: deck,
      skillDeclaredThisTurn: null,
      pendingDeferredSkill: null,
      selectedCardId: null,
      ready: false,
      peekInfo: null,
    };
  }

  return {
    ...state,
    phase: PHASES.SKILL,
    turnNumber: state.turnNumber + 1,
    players,
    lastRound: null,
    skillEvents: [],
  };
}

export function matchReducer(state, action) {
  switch (action.type) {
    case 'DECLARE_SKILL': {
      if (state.phase !== PHASES.SKILL) return state;
      const { side, use } = action;
      const player = state.players[side];
      if (player.skillDeclaredThisTurn !== null) return state;
      const willUse = use === true && !player.skillUsed;
      const nextPlayers = {
        ...state.players,
        [side]: { ...player, skillDeclaredThisTurn: willUse },
      };
      const nextState = { ...state, players: nextPlayers };
      return bothDeclared(nextPlayers) ? resolveSkillPhase(nextState) : nextState;
    }

    case 'TIMEOUT_SKILL': {
      if (state.phase !== PHASES.SKILL) return state;
      const players = { ...state.players };
      for (const side of ['player', 'npc']) {
        if (players[side].skillDeclaredThisTurn === null) {
          players[side] = { ...players[side], skillDeclaredThisTurn: false };
        }
      }
      return resolveSkillPhase({ ...state, players });
    }

    case 'SELECT_CARD': {
      const { side, cardId } = action;
      if (state.phase !== PHASES.CHOOSE) return state;
      const player = state.players[side];
      if (player.ready) return state;
      if (!player.hand.some((c) => c.id === cardId)) return state;
      return {
        ...state,
        players: { ...state.players, [side]: { ...player, selectedCardId: cardId } },
      };
    }

    case 'READY': {
      const { side } = action;
      if (state.phase !== PHASES.CHOOSE) return state;
      const player = state.players[side];
      if (!player.selectedCardId) return state;
      const nextPlayers = { ...state.players, [side]: { ...player, ready: true } };
      const nextState = { ...state, players: nextPlayers };
      return bothReady(nextPlayers) ? resolveChoosePhase(nextState) : nextState;
    }

    case 'TIMEOUT_CHOOSE': {
      if (state.phase !== PHASES.CHOOSE) return state;
      const players = { ...state.players };
      for (const side of ['player', 'npc']) {
        const p = players[side];
        if (p.ready) continue;
        let selectedCardId = p.selectedCardId;
        if (!selectedCardId && p.hand.length > 0) {
          selectedCardId = p.hand[Math.floor(Math.random() * p.hand.length)].id;
        }
        players[side] = { ...p, selectedCardId, ready: true };
      }
      return resolveChoosePhase({ ...state, players });
    }

    case 'NEXT_TURN': {
      if (state.phase !== PHASES.RESOLVED) return state;
      return startNextTurn(state);
    }

    default:
      return state;
  }
}
