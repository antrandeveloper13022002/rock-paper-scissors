import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES, CARD_TYPES, WIN_SCORE } from '../engine/constants.js';
import { SKILLS } from '../data/skills.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';
import { CARD_SPRITES } from '../data/cardSprites.js';
import { Sprite } from './Sprite.jsx';
import { CardIcon } from './CardIcon.jsx';
import { ResultOverlay } from './ResultOverlay.jsx';
import { WinConfetti } from './WinConfetti.jsx';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

function opponentSide(side) {
  return side === 'player' ? 'npc' : 'player';
}

function deckSummary(composition, cardLabels) {
  return CARD_TYPES.filter((ty) => composition[ty] > 0)
    .map((ty) => `${cardLabels[ty]}x${composition[ty]}`)
    .join(' ');
}

function skillEventText(event, mySide, myCharacter, oppCharacter, t, lang) {
  const actorIsMe = event.by === mySide;
  const actorName = actorIsMe ? myCharacter.name[lang] : oppCharacter.name[lang];
  const skill = SKILLS[event.type];
  if (event.type === 'forceRedraw') {
    const targetName = actorIsMe ? oppCharacter.name[lang] : myCharacter.name[lang];
    return t.skillForceRedraw(actorName, targetName, skill.name[lang]);
  }
  if (event.type === 'peek') {
    return t.skillPeek(actorName, skill.name[lang]);
  }
  if (event.type === 'cardLock') {
    const targetName = actorIsMe ? oppCharacter.name[lang] : myCharacter.name[lang];
    return t.skillCardLock(actorName, targetName, skill.name[lang]);
  }
  if (event.type === 'redrawAll') {
    return t.skillRedrawAll(actorName, skill.name[lang]);
  }
  return t.skillDeferred(actorName, skill.name[lang]);
}

function ScoreProgress({ score, color }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: WIN_SCORE }).map((_, i) => (
        <div
          key={i}
          className="w-3.5 h-1 border border-border-dim2"
          style={{ background: i < score ? color : 'var(--color-border-dim)' }}
        />
      ))}
    </div>
  );
}

// Side-agnostic match rendering, shared by the local-vs-NPC screen and the online
// screen. `mySide` says which of state.players is "me" — the other one is always
// rendered as the opponent, regardless of the internal 'player'/'npc' labels.
export function MatchScreenView({
  state,
  dispatch,
  mySide,
  myCharacter,
  oppCharacter,
  oppComposition,
  secondsLeft,
  onExit,
}) {
  const { t, lang } = useT();
  const oppSide = opponentSide(mySide);
  const me = state.players[mySide];
  const opp = state.players[oppSide];

  // Track newly-drawn cards for the draw-in animation
  const prevHandIds = useRef(new Set());
  const [justDrawnIds, setJustDrawnIds] = useState(new Set());
  useEffect(() => {
    const currentIds = new Set(me.hand.map((c) => c.id));
    const fresh = [...currentIds].filter((id) => !prevHandIds.current.has(id));
    prevHandIds.current = currentIds;
    if (fresh.length === 0) return undefined;
    setJustDrawnIds(new Set(fresh));
    sfx.draw();
    const timeout = setTimeout(() => setJustDrawnIds(new Set()), 400);
    return () => clearTimeout(timeout);
  }, [me.hand]);

  // Flash the portrait of whoever used a skill this turn.
  // Keyed on (turnNumber, phase) — primitives that stay equal across repeated
  // renders of "the same moment" — rather than state.skillEvents itself: in
  // online play every server broadcast is a freshly JSON-parsed object, so a
  // reference-based dependency would re-trigger this on every later broadcast
  // in the same turn (e.g. the opponent selecting a card) and replay the sound
  // and flash repeatedly instead of once.
  const [flashSides, setFlashSides] = useState(new Set());
  useEffect(() => {
    if (!state.skillEvents || state.skillEvents.length === 0) return undefined;
    setFlashSides(new Set(state.skillEvents.map((e) => e.by)));
    sfx.skill();
    const timeout = setTimeout(() => setFlashSides(new Set()), 1100);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.phase]);

  // Round-result sting — same reasoning: key on primitives, not state.lastRound.
  useEffect(() => {
    if (!state.lastRound) return;
    if (state.lastRound.winnerSide === null) sfx.drawRound();
    else if (state.lastRound.winnerSide === mySide) sfx.winRound();
    else sfx.loseRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.phase]);

  // Match-end fanfare — same reasoning: key on primitives, not state.result.
  useEffect(() => {
    if (!state.result) return;
    if (state.result.winner === mySide) sfx.matchWin();
    else if (state.result.winner === oppSide) sfx.matchLose();
    else sfx.drawRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.phase]);

  const oppDeckLabel = useMemo(() => deckSummary(oppComposition, t.cardLabels), [oppComposition, t]);
  const oppCardsLeft = opp.hand.length + opp.deckRemaining.length;
  const oppSprite = CHARACTER_SPRITES[oppCharacter.id];
  const mySprite = CHARACTER_SPRITES[myCharacter.id];

  const phaseLabel =
    state.phase === PHASES.SKILL ? t.phaseSkill : state.phase === PHASES.CHOOSE ? t.phaseChoose : t.phaseResult;

  const revealed = (state.phase === PHASES.RESOLVED || state.phase === PHASES.FINISHED) && state.lastRound;
  const myCard = mySide === 'player' ? state.lastRound?.playerCard : state.lastRound?.npcCard;
  const oppCard = mySide === 'player' ? state.lastRound?.npcCard : state.lastRound?.playerCard;

  return (
    <div className="w-full max-w-[620px] bg-bg border-2 border-border-dim flex flex-col relative">
      <div className="bg-gradient-to-b from-panel-top to-panel-bot border-b-2 border-border-dim2 px-2 sm:px-3 h-auto sm:h-[50px] py-1.5 sm:py-0 flex items-center justify-between shrink-0 gap-1 sm:gap-1.5 flex-wrap">
        <div className="border border-border-dim2 px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px]">
          <span className="text-text-dim2 tracking-wide">{t.turn}</span>
          <span className="text-text text-[13px]">{state.turnNumber}</span>
          <span className="text-text-dim2 tracking-wide">/7</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] tracking-wide">
          <span className="text-text-dim">{t.you}</span>
          <span className="text-accent-red text-[15px] sm:text-lg font-extrabold">{me.score}</span>
          <span className="text-border-dim2 text-sm">—</span>
          <span className="text-accent-blue text-[15px] sm:text-lg font-extrabold">{opp.score}</span>
          <span className="text-text-dim">{t.npc}</span>
        </div>
        {state.phase !== PHASES.RESOLVED && (
          <div className="border-2 border-text-dim2 bg-[#060810] px-2.5 py-0.5 flex items-center gap-1">
            <span className="text-text-dim2">T</span>
            <span className={`text-lg tracking-wide min-w-[26px] text-center ${secondsLeft <= 5 ? 'text-danger' : 'text-accent-blue'}`}>
              {String(secondsLeft).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
      <div className="text-center text-[9px] tracking-[3px] text-text-dim3 uppercase pt-1.5">{phaseLabel}</div>

      {state.log.length > 0 && (
        <div className="flex justify-center gap-1 pt-1" title={t.turnHistory}>
          {state.log.map((round, i) => (
            <div
              key={i}
              title={`#${round.turnNumber}: ${t.cardLabels[round.playerCard.type]} vs ${t.cardLabels[round.npcCard.type]}`}
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  round.winnerSide === mySide
                    ? 'var(--color-accent-green)'
                    : round.winnerSide === oppSide
                    ? 'var(--color-danger)'
                    : 'var(--color-border-dim2)',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 min-h-[220px] sm:min-h-[190px] [@media(max-height:520px)]:min-h-[140px] relative overflow-hidden">
        <div className="scanlines absolute inset-0 pointer-events-none z-10" />
        <div className="absolute top-2 left-2 w-5 h-5 border-t border-l border-border-dim" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t border-r border-border-dim" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b border-l border-border-dim" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b border-r border-border-dim" />

        <div
          className="absolute top-[4%] right-[3%] sm:top-[6%] sm:right-[4%] flex flex-col items-center gap-1.5 z-[2]"
          style={{ '--accent-color': oppCharacter.color }}
        >
          <ScoreProgress score={opp.score} color={oppCharacter.color} />
          <div
            className="border bg-gradient-to-b from-panel-top to-panel-bot p-1.5 transition-shadow"
            style={{
              borderColor: oppCharacter.color,
              boxShadow: flashSides.has(oppSide) ? `0 0 4px ${oppCharacter.color}, 0 0 22px ${oppCharacter.color}, 0 0 40px ${oppCharacter.color}` : undefined,
              animation: flashSides.has(oppSide) ? 'skillPulse 1.1s ease-out' : undefined,
            }}
          >
            <Sprite grid={oppSprite.grid} pal={oppSprite.pal} rects={oppSprite.rects} size={60} flip />
          </div>
          <span className="text-[8px] sm:text-[9px] tracking-[1px] sm:tracking-[3px]" style={{ color: oppCharacter.color }}>
            {oppCharacter.name[lang]}
          </span>
          <span className="text-[9px] text-text-dim2 max-w-[100px] sm:max-w-[160px] text-center leading-tight">
            {t.deckRemaining(oppDeckLabel, oppCardsLeft)}
          </span>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] border-2 border-text-dim2 bg-bg px-3.5 py-1.5">
          <span className="text-text-dim3 text-lg tracking-[6px] font-extrabold">VS</span>
        </div>

        <div
          className="absolute bottom-[4%] left-[3%] sm:bottom-[6%] sm:left-[4%] flex flex-col items-center gap-1.5 z-[2]"
          style={{ '--accent-color': myCharacter.color }}
        >
          <div
            className="border bg-gradient-to-b from-panel-top to-panel-bot p-1.5 transition-shadow"
            style={{
              borderColor: myCharacter.color,
              boxShadow: flashSides.has(mySide) ? `0 0 4px ${myCharacter.color}, 0 0 22px ${myCharacter.color}, 0 0 40px ${myCharacter.color}` : undefined,
              animation: flashSides.has(mySide) ? 'skillPulse 1.1s ease-out' : undefined,
            }}
          >
            <Sprite grid={mySprite.grid} pal={mySprite.pal} rects={mySprite.rects} size={60} />
          </div>
          <span className="text-[8px] sm:text-[9px] tracking-[1px] sm:tracking-[3px]" style={{ color: myCharacter.color }}>
            {myCharacter.name[lang]}
          </span>
          <ScoreProgress score={me.score} color={myCharacter.color} />
        </div>

        {revealed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-6 sm:gap-10 z-[4] mt-10">
            <div
              className="w-[46px] h-[46px] sm:w-[60px] sm:h-[60px] border-2 border-dashed border-border-dim2 flex items-center justify-center"
              style={{
                borderColor:
                  state.lastRound.winnerSide === mySide
                    ? 'var(--color-accent-green)'
                    : state.lastRound.winnerSide === oppSide
                    ? 'var(--color-danger)'
                    : undefined,
              }}
            >
              <Sprite rects={CARD_SPRITES[myCard.type].rects} size={30} />
            </div>
            <div
              className="w-[46px] h-[46px] sm:w-[60px] sm:h-[60px] border-2 border-dashed border-border-dim2 flex items-center justify-center"
              style={{
                borderColor:
                  state.lastRound.winnerSide === oppSide
                    ? 'var(--color-accent-green)'
                    : state.lastRound.winnerSide === mySide
                    ? 'var(--color-danger)'
                    : undefined,
              }}
            >
              <Sprite rects={CARD_SPRITES[oppCard.type].rects} size={30} />
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-accent-blue min-h-4 px-2.5 pt-1.5">
        {revealed
          ? state.lastRound.winnerSide === null
            ? t.drawRound
            : t.winRound(state.lastRound.winnerSide === mySide ? t.you : t.npc, state.lastRound.pointsAwarded)
          : state.skillEvents?.map((e, i) => (
              <div key={i}>{skillEventText(e, mySide, myCharacter, oppCharacter, t, lang)}</div>
            ))}
      </div>

      {me.peekInfo && !revealed && (
        <div className="mx-2.5 mt-2 p-2 px-3 border border-accent-green text-accent-green text-[11px] text-center">
          {t.youSee}: {me.peekInfo.map((c) => t.cardLabels[c.type]).join(', ')}
        </div>
      )}

      {!revealed && (
        <>
          <div className="bg-gradient-to-b from-panel-bot to-bg border-t-2 border-border-dim2 px-2 sm:px-3.5 py-2.5 sm:py-3 flex justify-center items-end gap-2 sm:gap-3 flex-wrap shrink-0">
            {me.hand.map((c) => (
              <CardIcon
                key={c.id}
                type={c.type}
                selected={me.selectedCardId === c.id}
                disabled={state.phase !== PHASES.CHOOSE || me.ready || c.id === me.lockedCardId}
                locked={c.id === me.lockedCardId}
                justDrawn={justDrawnIds.has(c.id)}
                onClick={() => {
                  sfx.select();
                  dispatch({ type: 'SELECT_CARD', side: mySide, cardId: c.id });
                }}
              />
            ))}
          </div>

          <div className="flex justify-center gap-2 sm:gap-3.5 my-3 flex-wrap px-2">
            {state.phase === PHASES.SKILL && me.skillDeclaredThisTurn === null && (
              <>
                {!me.skillUsed && (
                  <Button
                    variant="primary"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      sfx.skill();
                      dispatch({ type: 'DECLARE_SKILL', side: mySide, use: true });
                    }}
                  >
                    {t.useSkill(SKILLS[myCharacter.skillId].name[lang])}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    sfx.click();
                    dispatch({ type: 'DECLARE_SKILL', side: mySide, use: false });
                  }}
                >
                  {me.skillUsed ? t.skillUsedContinue : t.skip}
                </Button>
              </>
            )}

            {state.phase === PHASES.CHOOSE && !me.ready && (
              <Button
                variant="outline"
                disabled={!me.selectedCardId}
                onClick={() => {
                  sfx.ready();
                  dispatch({ type: 'READY', side: mySide });
                }}
              >
                {t.ready}
              </Button>
            )}

            {state.phase === PHASES.CHOOSE && me.ready && (
              <span className="text-text-dim text-xs self-center">{t.waitingOpponent}</span>
            )}
          </div>
        </>
      )}

      {state.phase === PHASES.FINISHED && state.result && (
        <>
          {state.result.winner === mySide && <WinConfetti />}
          <ResultOverlay result={state.result} player={me} npc={opp} onExit={onExit} />
        </>
      )}
    </div>
  );
}
