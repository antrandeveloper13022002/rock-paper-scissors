import { BEATS } from '../engine/constants.js';

export function decideSkillUse(npc, player) {
  if (npc.skillUsed) return false;
  let chance = 0.35;
  if (npc.score < player.score) chance = 0.6;
  else if (npc.score > player.score) chance = 0.15;
  return Math.random() < chance;
}

export function decideCard(npc) {
  const { hand, peekInfo } = npc;
  if (hand.length === 0) return null;

  if (peekInfo && peekInfo.length > 0) {
    const counterType = (type) =>
      Object.entries(BEATS).find(([, beaten]) => beaten === type)?.[0];
    const counters = peekInfo.map((c) => counterType(c.type)).filter(Boolean);
    const counterCard = hand.find((c) => counters.includes(c.type));
    if (counterCard) return counterCard.id;
  }

  return hand[Math.floor(Math.random() * hand.length)].id;
}
