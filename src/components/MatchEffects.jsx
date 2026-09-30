import { CARD_SPRITES } from '../data/cardSprites.js';
import { SKILLS } from '../data/skills.js';
import { SKILL_GLYPHS } from '../data/fxGlyphs.js';
import { Sprite } from './Sprite.jsx';
import { PixelGlyph } from './PixelGlyph.jsx';

const SHARDS = [
  [-26, -18, -120, '#c9d1dc'],
  [24, -22, 140, '#9999aa'],
  [-18, 24, 80, '#d9434b'],
  [28, 20, -90, '#c9d1dc'],
  [0, 30, 200, '#777788'],
];

function CardBox({ type, winner, children, style, cardStyle }) {
  return (
    <div
      className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"
      style={{
        background: '#3b2718',
        boxShadow: winner
          ? '0 0 0 3px #f2c14e, 0 0 0 6px #2a1a10, 0 0 18px 4px rgba(242,193,78,.45)'
          : '0 0 0 3px #2a1a10, inset 0 0 0 3px #6b4428',
        ...style,
      }}
    >
      <div className="fx-motion" style={cardStyle}>
        <Sprite rects={CARD_SPRITES[type].rects} size={52} />
      </div>
      {children}
    </div>
  );
}

// Round-result effect (BR-3D-06): Búa đập vỡ Kéo, Kéo cắt đôi Bao, Bao trùm gói
// Búa, or a clash on a draw. Purely visual; keyed by the parent per round so it
// replays each turn.
export function RoundEffect({ myType, oppType, winnerSide, mySide, caption, cardsIn3D = false }) {
  const draw = winnerSide === null;
  const iWin = winnerSide === mySide;
  const kind = draw ? 'draw' : iWin ? `${myType}-${oppType}` : `${oppType}-${myType}`;
  const loserOnLeft = !draw && !iWin;

  const role = (isLeft) => (draw ? 'draw' : isLeft === loserOnLeft ? 'loser' : 'winner');

  const renderSide = (type, isLeft) => {
    const r = role(isLeft);
    if (r === 'draw') {
      return (
        <CardBox type={type} cardStyle={{ animation: `${isLeft ? 'fxBounceL' : 'fxBounceR'} 0.7s ease-out forwards` }} />
      );
    }
    if (r === 'winner') {
      const anim =
        kind === 'bua-keo' ? 'fxSmash 0.5s ease-in forwards' : kind === 'bao-bua' ? 'fxEngulf 0.9s ease-out forwards' : undefined;
      return <CardBox type={type} winner cardStyle={{ animation: anim }} />;
    }
    // loser
    if (kind === 'bua-keo') {
      return (
        <CardBox type={type} cardStyle={{ '--dx': '0px', '--dy': '8px', '--rot': '0deg', animation: 'fxShatter 0.9s ease-out forwards' }}>
          {SHARDS.map(([dx, dy, rot, color], i) => (
            <span
              key={i}
              className="fx-motion absolute w-2 h-1.5"
              style={{ background: color, '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg`, opacity: 0, animation: 'fxShatter 0.9s ease-out 0.25s forwards' }}
            />
          ))}
          <PixelGlyph name="spark" color="#ffd166" size={40} className="fx-motion absolute" style={{ animation: 'fxPop 0.6s ease-out 0.2s both' }} />
        </CardBox>
      );
    }
    if (kind === 'keo-bao') {
      const half = (clip, anim) => (
        <div className="fx-motion absolute inset-0 flex items-center justify-center" style={{ clipPath: clip, animation: anim }}>
          <Sprite rects={CARD_SPRITES[type].rects} size={52} />
        </div>
      );
      return (
        <CardBox type={type} cardStyle={{ opacity: 0 }}>
          {half('inset(0 50% 0 0)', 'fxSplitL 0.9s ease-out forwards')}
          {half('inset(0 0 0 50%)', 'fxSplitR 0.9s ease-out forwards')}
          <PixelGlyph name="slash" color="#ffffff" color2="#9fd8ff" size={56} className="fx-motion absolute" style={{ animation: 'fxSlash 0.7s ease-out forwards' }} />
        </CardBox>
      );
    }
    // bao-bua: the hammer gets swallowed toward the sack
    return <CardBox type={type} cardStyle={{ '--sx': loserOnLeft ? 1 : -1, animation: 'fxSwallowed 0.9s ease-in forwards' }} />;
  };

  const banner = (
    <div
      className="fx-motion px-3 py-1 text-[15px] sm:text-lg text-[#2a1a10] bg-[#e8d3a0] shadow-[0_0_0_3px_#2a1a10]"
      style={{ animation: 'fxBanner 2.6s ease-out forwards' }}
    >
      {caption}
    </div>
  );
  // With the 3D world active the cards play out in 3D; only the caption stays.
  if (cardsIn3D) return banner;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="fx-motion relative flex gap-8 sm:gap-12 items-center"
        style={{ animation: kind === 'bua-keo' ? 'fxShake 0.35s linear 0.25s' : undefined }}
      >
        {renderSide(myType, true)}
        {draw && (
          <PixelGlyph name="spark" color="#ffffff" color2="#ffd166" size={36} className="fx-motion absolute left-1/2 -translate-x-1/2" style={{ animation: 'fxPop 0.6s ease-out 0.15s both' }} />
        )}
        {renderSide(oppType, false)}
      </div>
      {banner}
    </div>
  );
}

// Skill activation banner (BR-3D-06): glyph + skill name in the actor's colour.
export function SkillBanners({ events, mySide, myCharacter, oppCharacter, lang }) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
      {events.map((e, i) => {
        const actor = e.by === mySide ? myCharacter : oppCharacter;
        return (
          <div
            key={i}
            className="fx-motion flex items-center gap-2 px-3 py-1 bg-[#2a1a10]"
            style={{ boxShadow: `0 0 0 3px ${actor.color}, 0 0 18px ${actor.color}`, animation: 'fxBanner 1.8s ease-out forwards' }}
          >
            <PixelGlyph name={SKILL_GLYPHS[e.type] || 'spark'} color={actor.color} color2="#ffffff" size={26} />
            <span className="text-[15px] sm:text-lg whitespace-nowrap" style={{ color: actor.color }}>
              {actor.name[lang]} · {SKILLS[e.type].name[lang]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
