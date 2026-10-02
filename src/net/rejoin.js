// Rejoin token for an online match in progress (BR-ONLINE-03), kept in
// localStorage so a closed tab can get back in, together with a short summary
// so the menu can say *which* match it is. `seenAt` is refreshed while the
// match is open (and when the page is hidden/closed).
import { ONLINE_GRACE_SECONDS } from '../engine/constants.js';

const KEY = 'rps-card-game-rejoin';
// The server holds a dropped seat for ONLINE_GRACE_SECONDS; after that the
// match is over, but it keeps the final result for 10 min.
export const REJOIN_WINDOW_MS = ONLINE_GRACE_SECONDS * 1000;
const RESULT_KEPT_MS = 10 * 60 * 1000;

// summary: { me, opp, stage, turn, myScore, oppScore } (ids/numbers, no text)
export function saveRejoin(token, summary) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, summary, seenAt: Date.now() }));
  } catch {
    // ignore (private mode etc.)
  }
}

// → null, or { token, summary, secondsLeft, expired }. `expired`: past the
// 30 s window — the match has ended; only its result can still be fetched.
export function loadRejoin() {
  try {
    const { token, summary, seenAt } = JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {};
    if (typeof token !== 'string' || typeof seenAt !== 'number') return null;
    const age = Date.now() - seenAt;
    if (age > RESULT_KEPT_MS) {
      clearRejoin();
      return null;
    }
    return {
      token,
      summary: summary ?? null,
      secondsLeft: Math.max(0, Math.ceil((REJOIN_WINDOW_MS - age) / 1000)),
      expired: age >= REJOIN_WINDOW_MS,
    };
  } catch {
    return null;
  }
}

export function clearRejoin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
