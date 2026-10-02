import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

// Seconds left until `until` (a Date.now() timestamp), ticking once a second.
function useCountdown(until) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : null;
}

// The pause window. Clicking outside the window (or Esc) = Continue.
// `until`: online only — the moment the pause runs out and the match is lost.
export function PauseModal({ until, online, onResume, onLeave }) {
  const { t } = useT();
  const secondsLeft = useCountdown(until);
  const resumeRef = useRef(null);

  useEffect(() => {
    resumeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(6,4,14,0.7)] px-4" onClick={onResume}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="w-full max-w-[380px] bg-gradient-to-b from-panel-top to-panel-bot pixel-panel p-6 flex flex-col gap-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pause-title" className="m-0 text-4xl font-normal text-accent-blue [text-shadow:3px_3px_0_#2a1a10]">
          {t.pausedTitle}
        </h2>
        {online && (
          <p className="m-0 text-base text-text-dim" aria-live="polite">
            {t.pauseOnlineHint(secondsLeft ?? 0)}
          </p>
        )}
        <Button
          ref={resumeRef}
          variant="primary"
          size="lg"
          onClick={() => {
            sfx.click();
            onResume();
          }}
        >
          {t.resume}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            sfx.click();
            onLeave();
          }}
        >
          {t.leaveToMenu}
        </Button>
        {online && <p className="m-0 text-sm text-danger">{t.leaveForfeitHint}</p>}
      </div>
    </div>
  );
}

// Shown to the other player while the match is frozen (opponent paused or
// disconnected), or to me while my own connection is being restored.
export function PausedBanner({ kind, until }) {
  const { t } = useT();
  const secondsLeft = useCountdown(until);
  const text =
    kind === 'reconnecting'
      ? t.reconnecting
      : kind === 'disconnect'
      ? t.oppDisconnected(secondsLeft ?? 0)
      : t.oppPaused(secondsLeft ?? 0);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(6,4,14,0.55)] px-4 pointer-events-auto">
      <div role="status" aria-live="polite" className="px-5 py-4 bg-[#e8d3a0] text-[#2a1a10] text-xl sm:text-2xl shadow-[0_0_0_3px_#2a1a10] text-center animate-pulse">
        {text}
      </div>
    </div>
  );
}
