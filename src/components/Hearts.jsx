import { useEffect, useRef, useState } from 'react';
import { WIN_SCORE } from '../engine/constants.js';
import { PixelGlyph } from './PixelGlyph.jsx';

// Score shown as hearts (BR-3D-05): a side's hearts = WIN_SCORE minus the
// opponent's score. Presentation only — the engine still counts points.
export function Hearts({ opponentScore, label }) {
  const hp = Math.max(0, WIN_SCORE - opponentScore);
  const prevHp = useRef(hp);
  const [lostIndex, setLostIndex] = useState(null);

  useEffect(() => {
    if (hp < prevHp.current) {
      setLostIndex(hp);
      const timeout = setTimeout(() => setLostIndex(null), 900);
      prevHp.current = hp;
      return () => clearTimeout(timeout);
    }
    prevHp.current = hp;
    return undefined;
  }, [hp]);

  return (
    <div className="flex gap-1" role="img" aria-label={label}>
      {Array.from({ length: WIN_SCORE }).map((_, i) => (
        <span key={i} className="relative inline-block">
          <PixelGlyph name="heart" size={18} color={i < hp ? '#e0404a' : '#2a1a10'} color2={i < hp ? '#ffd0d0' : '#3d2616'} />
          {i === lostIndex && (
            <PixelGlyph
              name="heart"
              size={18}
              color="#e0404a"
              color2="#ffd0d0"
              className="fx-motion absolute inset-0"
              style={{ animation: 'fxHeartLost 0.9s ease-out forwards' }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
