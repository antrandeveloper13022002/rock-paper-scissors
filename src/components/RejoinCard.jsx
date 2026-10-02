import { useEffect, useState } from 'react';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { CHARACTERS } from '../data/characters.js';
import { STAGES } from '../data/stages.js';
import { loadRejoin, clearRejoin } from '../net/rejoin.js';
import { Button } from './Button.jsx';

// Menu card for an unfinished online match (BR-ONLINE-03): says which match it
// is and how long is left to rejoin; once the 30 s are up, says the match has
// ended and offers its result (the server keeps it for a while).
export function RejoinCard({ onRejoin }) {
  const { t, lang } = useT();
  const [info, setInfo] = useState(() => loadRejoin());

  useEffect(() => {
    const id = setInterval(() => setInfo(loadRejoin()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!info) return null;
  const s = info.summary;
  const charName = (id) => CHARACTERS.find((c) => c.id === id)?.name[lang] ?? '?';
  const details = s ? t.rejoinDetails(charName(s.me), charName(s.opp), STAGES[s.stage]?.name[lang] ?? '', s.turn, s.myScore, s.oppScore) : null;

  return (
    <section
      aria-live="polite"
      className="w-full max-w-[460px] px-5 py-4 flex flex-col gap-2 text-center bg-[#e8d3a0] text-[#2a1a10] shadow-[0_0_0_3px_#2a1a10,inset_0_3px_0_#f6e8c4,inset_0_-3px_0_#c7ad74]"
    >
      {details && <p className="m-0 text-lg leading-snug">{details}</p>}
      {info.expired ? (
        <>
          <p className="m-0 text-base text-[#8a4a12]">{t.lastMatchEnded}</p>
          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => {
                sfx.click();
                onRejoin(info.token);
              }}
            >
              {t.viewLastResult}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                sfx.click();
                clearRejoin();
                setInfo(null);
              }}
            >
              {t.dismiss}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              sfx.click();
              onRejoin(info.token);
            }}
          >
            {t.rejoinMatch}
          </Button>
          <p className="m-0 text-base text-[#8a4a12]">{t.rejoinTimeLeft(info.secondsLeft)}</p>
        </>
      )}
    </section>
  );
}
