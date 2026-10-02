import { useContext, useEffect, useRef, useState } from 'react';
import { PHASES, WIN_SCORE, SKILL_PHASE_SECONDS, CHOOSE_PHASE_SECONDS, otherSide } from '../engine/constants.js';
import { SKILLS } from '../data/skills.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';
import { Sprite } from './Sprite.jsx';
import { CardIcon } from './CardIcon.jsx';
import { ResultOverlay } from './ResultOverlay.jsx';
import { WinConfetti } from './WinConfetti.jsx';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';
import { Hearts } from './Hearts.jsx';
import { DeckTrack } from './DeckTrack.jsx';
import { RoundEffect, SkillBanners } from './MatchEffects.jsx';
import { MatchSceneContext } from '../scene/MatchSceneContext.js';
import { STAGES } from '../data/stages.js';

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
  myComposition,
  stageId,
  notice,
  secondsLeft,
  onExit,
}) {
  const { t, lang } = useT();
  const oppSide = otherSide(mySide);
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
    const timeout = setTimeout(() => setFlashSides(new Set()), 1800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.phase]);

  // Round-result sting — same reasoning: key on primitives, not state.lastRound.
  // Only on RESOLVED: lastRound is still set in FINISHED, which would replay it.
  useEffect(() => {
    if (state.phase !== PHASES.RESOLVED || !state.lastRound) return;
    if (state.lastRound.winnerSide === null) sfx.drawRound();
    else if (state.lastRound.winnerSide === mySide) sfx.winRound();
    else sfx.loseRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.phase]);

  // Match-end fanfare — same reasoning: key on primitives, not state.result.
  // Only on FINISHED: a 5-point win already has `result` set during RESOLVED.
  useEffect(() => {
    if (state.phase !== PHASES.FINISHED || !state.result) return;
    if (state.result.winner === mySide) sfx.matchWin();
    else if (state.result.winner === oppSide) sfx.matchLose();
    else sfx.drawRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.phase]);

  const oppSprite = CHARACTER_SPRITES[oppCharacter.id];
  const mySprite = CHARACTER_SPRITES[myCharacter.id];

  const phaseLabel =
    state.phase === PHASES.SKILL ? t.phaseSkill : state.phase === PHASES.CHOOSE ? t.phaseChoose : t.phaseResult;

  const revealed = (state.phase === PHASES.RESOLVED || state.phase === PHASES.FINISHED) && state.lastRound;
  const myCard = mySide === 'player' ? state.lastRound?.playerCard : state.lastRound?.npcCard;
  const oppCard = mySide === 'player' ? state.lastRound?.npcCard : state.lastRound?.playerCard;

  // Tell the 3D world what to show for this round (WG-03). Keyed on primitives
  // for the same reason as the effects above.
  const scene = useContext(MatchSceneContext);
  const roundWinner = revealed ? (state.lastRound.winnerSide === null ? null : state.lastRound.winnerSide === mySide ? 'me' : 'opp') : null;
  const { publish } = scene;
  const skillCount = state.skillEvents?.length ?? 0;
  const resultFor = state.result ? (state.result.winner === mySide ? 'me' : state.result.winner === oppSide ? 'opp' : 'draw') : null;
  useEffect(() => {
    publish({
      myId: myCharacter.id,
      oppId: oppCharacter.id,
      skills: (state.skillEvents ?? []).map((e) => ({
        by: e.by === mySide ? 'me' : 'opp',
        type: e.type,
        color: (e.by === mySide ? myCharacter : oppCharacter).color,
      })),
      skillKey: `${state.turnNumber}-${state.phase}`,
      result: resultFor,
      turnNumber: state.turnNumber,
      revealed: Boolean(revealed),
      myReady: me.ready,
      oppReady: opp.ready,
      myType: revealed ? myCard.type : null,
      oppType: revealed ? oppCard.type : null,
      winner: roundWinner,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish, state.turnNumber, state.phase, skillCount, resultFor, Boolean(revealed), me.ready, opp.ready, myCard?.type, oppCard?.type, roundWinner, myCharacter.id, oppCharacter.id]);
  useEffect(() => () => publish(null), [publish]);

  const stageName = stageId ? STAGES[stageId]?.name[lang] : null;
  const phaseSeconds = state.phase === PHASES.SKILL ? SKILL_PHASE_SECONDS : CHOOSE_PHASE_SECONDS;
  const outcome = { me: 'win', opp: 'lose', draw: 'draw' }[resultFor] ?? null;
  const statusLines = revealed
    ? [
        state.lastRound.winnerSide === null
          ? t.drawRound
          : t.winRound(state.lastRound.winnerSide === mySide ? t.you : t.npc, state.lastRound.pointsAwarded),
      ]
    : (state.skillEvents ?? []).map((e) => skillEventText(e, mySide, myCharacter, oppCharacter, t, lang));
  const glow = (side, color) =>
    flashSides.has(side) ? { boxShadow: `0 0 0 3px #2a1a10, 0 0 22px 6px ${color}`, animation: 'skillPulse 1.1s ease-out' } : undefined;

  // Full-screen HUD over the 3D arena (design board 04): opponent panel top-left,
  // phase + timer top-centre, opponent's face-down hand top-right; own panel
  // bottom-left, hand bottom-centre, Skill/Ready bottom-right.
  return (
    <div className="fixed inset-0 z-10 flex flex-col gap-2 px-3 pt-14 pb-3 sm:px-6 sm:pt-5 sm:pb-5 pointer-events-none">
      {/* top row */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
        <section
          className="pointer-events-auto bg-gradient-to-b from-panel-top to-panel-bot pixel-panel px-3 py-2 sm:w-[360px] flex flex-col gap-1.5"
          style={glow(oppSide, oppCharacter.color)}
        >
          <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
            <span className="text-xl sm:text-2xl leading-none truncate" style={{ color: oppCharacter.color }}>
              {oppCharacter.name[lang]} · {t.oppTag}
            </span>
            {stageName && <span className="text-[13px] text-text-dim">{stageName}</span>}
          </div>
          <Hearts opponentScore={me.score} label={t.heartsLabel(oppCharacter.name[lang], Math.max(0, WIN_SCORE - me.score))} />
          <DeckTrack composition={oppComposition} log={state.log} side={oppSide} size={24} align="start" />
        </section>

        <div className="flex-1 flex flex-col items-center gap-1.5 [text-shadow:2px_2px_0_#2a1a10]">
          <div className="flex flex-wrap justify-center items-center gap-x-2.5 text-lg sm:text-2xl">
            <span className="text-accent-blue whitespace-nowrap">{phaseLabel}</span>
            <span className="whitespace-nowrap">
              · {t.turn} {state.turnNumber}/7 ·
            </span>
            {state.phase !== PHASES.RESOLVED && state.phase !== PHASES.FINISHED && (
              <span className={`whitespace-nowrap ${secondsLeft <= 5 ? 'text-danger' : ''}`}>
                <span aria-hidden="true">⏳</span> {secondsLeft}s
              </span>
            )}
          </div>
          {(state.phase === PHASES.SKILL || state.phase === PHASES.CHOOSE) && (
            <div className="w-56 sm:w-72 h-2.5 bg-[#2a1a10] shadow-[0_0_0_3px_#2a1a10]">
              <div
                className="h-full bg-accent-blue transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(0, (secondsLeft / phaseSeconds) * 100)}%` }}
              />
            </div>
          )}
          {state.log.length > 0 && (
            <div className="flex gap-1" title={t.turnHistory}>
              {state.log.map((round, i) => (
                <div
                  key={i}
                  title={`#${round.turnNumber}: ${t.cardLabels[round.playerCard.type]} vs ${t.cardLabels[round.npcCard.type]}`}
                  className="w-2.5 h-2.5"
                  style={{
                    background:
                      round.winnerSide === mySide ? 'var(--color-accent-green)' : round.winnerSide === oppSide ? 'var(--color-danger)' : '#8a5a34',
                  }}
                />
              ))}
            </div>
          )}
          {notice && state.turnNumber === 1 && (
            <div className="pointer-events-auto px-3 py-1 bg-[#e8d3a0] text-[#2a1a10] shadow-[0_0_0_3px_#2a1a10] text-[15px] [text-shadow:none]">
              {notice}
            </div>
          )}
        </div>

        <div className="hidden sm:flex sm:w-[330px] justify-end gap-1.5 pt-12" aria-hidden="true">
          {opp.hand.map((c) => (
            <div key={c.id} className="w-[46px] h-[64px] flex items-center justify-center bg-[#2d2250] shadow-[0_0_0_3px_#120d26,inset_0_0_0_3px_#4b3a7a]">
              <div className="w-3.5 h-3.5 rotate-45 bg-accent-blue" />
            </div>
          ))}
        </div>
      </div>

      {/* middle: the 3D arena shows through */}
      <div className="flex-1 relative min-h-[140px]">
        {flashSides.size > 0 && state.skillEvents?.length > 0 && (
          <SkillBanners events={state.skillEvents} mySide={mySide} myCharacter={myCharacter} oppCharacter={oppCharacter} lang={lang} />
        )}

        {!scene.active && (
          <>
            <div className="absolute left-[4%] bottom-2" style={glow(mySide, myCharacter.color)}>
              <Sprite grid={mySprite.grid} pal={mySprite.pal} rects={mySprite.rects} size={110} />
            </div>
            <div className="absolute right-[4%] bottom-2" style={glow(oppSide, oppCharacter.color)}>
              <Sprite grid={oppSprite.grid} pal={oppSprite.pal} rects={oppSprite.rects} size={110} flip />
            </div>
            {!revealed && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2a1a10] px-3.5 py-1 shadow-[0_0_0_3px_#8a5a34]">
                <span className="text-accent-blue text-2xl tracking-[6px]">VS</span>
              </div>
            )}
          </>
        )}

        {revealed && (
          <div className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-[6] ${scene.active ? 'top-[88%]' : 'top-1/2'}`}>
            <RoundEffect
              key={state.turnNumber}
              myType={myCard.type}
              oppType={oppCard.type}
              winnerSide={state.lastRound.winnerSide}
              mySide={mySide}
              cardsIn3D={scene.active}
              caption={
                state.lastRound.winnerSide === null
                  ? t.fxDraw
                  : t.fxWin[state.lastRound.winnerSide === mySide ? `${myCard.type}-${oppCard.type}` : `${oppCard.type}-${myCard.type}`]
              }
            />
          </div>
        )}
      </div>

      {/* bottom row */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <section
          className="pointer-events-auto order-2 sm:order-1 bg-gradient-to-b from-panel-top to-panel-bot pixel-panel px-3 py-2 sm:w-[360px] flex flex-col gap-1.5"
          style={glow(mySide, myCharacter.color)}
        >
          <span className="text-xl sm:text-2xl leading-none whitespace-nowrap" style={{ color: myCharacter.color }}>
            {myCharacter.name[lang]} · {t.you}
          </span>
          <Hearts opponentScore={opp.score} label={t.heartsLabel(myCharacter.name[lang], Math.max(0, WIN_SCORE - opp.score))} />
          {myComposition && <DeckTrack composition={myComposition} log={state.log} side={mySide} size={24} align="start" />}
        </section>

        <div className="order-1 sm:order-2 flex-1 flex flex-col items-center gap-3">
          <div className="text-center text-[15px] sm:text-base text-accent-blue [text-shadow:2px_2px_0_#2a1a10] min-h-5" aria-live="polite">
            {statusLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {state.phase === PHASES.CHOOSE && me.ready && <div className="text-text">{t.waitingOpponent}</div>}
          </div>
          {me.peekInfo && !revealed && (
            <div className="px-3 py-1 bg-[#2a1a10] text-accent-green text-[15px] shadow-[0_0_0_2px_#3f9c8c]">
              {t.youSee}: {me.peekInfo.map((c) => t.cardLabels[c.type]).join(', ')}
            </div>
          )}
          {!revealed && (
            <div className="pointer-events-auto flex justify-center items-end gap-3 sm:gap-5 pt-3">
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
          )}
        </div>

        <div className="order-3 pointer-events-auto flex sm:flex-col gap-3 sm:w-[330px] sm:items-end">
          {!revealed && state.phase === PHASES.SKILL && me.skillDeclaredThisTurn === null && (
            <>
              {!me.skillUsed && (
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none sm:w-[280px]"
                  onClick={() => {
                    sfx.skill();
                    dispatch({ type: 'DECLARE_SKILL', side: mySide, use: true });
                  }}
                >
                  ✦ {t.useSkill(SKILLS[myCharacter.skillId].name[lang])}
                </Button>
              )}
              <Button
                variant="ghost"
                className="flex-1 sm:flex-none sm:w-[280px]"
                onClick={() => {
                  sfx.click();
                  dispatch({ type: 'DECLARE_SKILL', side: mySide, use: false });
                }}
              >
                {me.skillUsed ? t.skillUsedContinue : t.skip}
              </Button>
            </>
          )}
          {!revealed && state.phase === PHASES.CHOOSE && !me.ready && (
            <Button
              variant="primary"
              size="lg"
              className="flex-1 sm:flex-none sm:w-[280px]"
              disabled={!me.selectedCardId}
              onClick={() => {
                sfx.ready();
                dispatch({ type: 'READY', side: mySide });
              }}
            >
              {t.ready}
            </Button>
          )}
        </div>
      </div>

      {state.phase === PHASES.FINISHED && state.result && (
        <div className="pointer-events-auto">
          {outcome === 'win' && <WinConfetti />}
          <ResultOverlay result={state.result} outcome={outcome} player={me} npc={opp} onExit={onExit} />
        </div>
      )}
    </div>
  );
}
