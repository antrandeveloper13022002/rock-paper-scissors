import { useEffect, useMemo, useRef, useState, useReducer } from 'react';
import { matchReducer, createMatch } from '../engine/reducer.js';
import { PHASES, CARD_TYPES, WIN_SCORE } from '../engine/constants.js';
import { SKILLS } from '../data/skills.js';
import { CHARACTER_SPRITES } from '../data/characterSprites.js';
import { CARD_SPRITES } from '../data/cardSprites.js';
import { useNpcController } from '../ai/useNpcController.js';
import { useTurnTimer } from './useTurnTimer.js';
import { Sprite } from './Sprite.jsx';
import { CardIcon } from './CardIcon.jsx';
import { ResultOverlay } from './ResultOverlay.jsx';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

function npcDeckSummary(composition, cardLabels) {
  return CARD_TYPES.filter((ty) => composition[ty] > 0)
    .map((ty) => `${cardLabels[ty]}x${composition[ty]}`)
    .join(' ');
}

function skillEventText(event, playerCharacter, npcCharacter, t, lang) {
  const actorName = event.by === 'player' ? playerCharacter.name[lang] : npcCharacter.name[lang];
  const skill = SKILLS[event.type];
  if (event.type === 'forceRedraw') {
    const targetName = event.by === 'player' ? npcCharacter.name[lang] : playerCharacter.name[lang];
    return t.skillForceRedraw(actorName, targetName, skill.name[lang]);
  }
  if (event.type === 'peek') {
    return t.skillPeek(actorName, skill.name[lang]);
  }
  if (event.type === 'cardLock') {
    const targetName = event.by === 'player' ? npcCharacter.name[lang] : playerCharacter.name[lang];
    return t.skillCardLock(actorName, targetName, skill.name[lang]);
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

export function MatchScreen({ playerCharacter, playerComposition, npcCharacter, npcComposition, onExit }) {
  const { t, lang } = useT();
  const [state, dispatch] = useReducer(
    matchReducer,
    { playerCharacter, playerComposition, npcCharacter, npcComposition },
    createMatch
  );

  useNpcController(state, dispatch);
  const secondsLeft = useTurnTimer(state.phase, state.turnNumber, dispatch);

  const player = state.players.player;
  const npc = state.players.npc;

  useEffect(() => {
    if (state.phase !== PHASES.RESOLVED) return undefined;
    const timeout = setTimeout(() => dispatch({ type: 'NEXT_TURN' }), 3000);
    return () => clearTimeout(timeout);
  }, [state.phase, state.result]);

  // Track newly-drawn cards for the draw-in animation
  const prevHandIds = useRef(new Set());
  const [justDrawnIds, setJustDrawnIds] = useState(new Set());
  useEffect(() => {
    const currentIds = new Set(player.hand.map((c) => c.id));
    const fresh = [...currentIds].filter((id) => !prevHandIds.current.has(id));
    prevHandIds.current = currentIds;
    if (fresh.length === 0) return undefined;
    setJustDrawnIds(new Set(fresh));
    sfx.draw();
    const timeout = setTimeout(() => setJustDrawnIds(new Set()), 400);
    return () => clearTimeout(timeout);
  }, [player.hand]);

  // Flash the portrait of whoever used a skill this turn
  const [flashSides, setFlashSides] = useState(new Set());
  useEffect(() => {
    if (!state.skillEvents || state.skillEvents.length === 0) return undefined;
    setFlashSides(new Set(state.skillEvents.map((e) => e.by)));
    sfx.skill();
    const timeout = setTimeout(() => setFlashSides(new Set()), 1100);
    return () => clearTimeout(timeout);
  }, [state.skillEvents]);

  // Round-result sting
  useEffect(() => {
    if (!state.lastRound) return;
    if (state.lastRound.winnerSide === null) sfx.drawRound();
    else if (state.lastRound.winnerSide === 'player') sfx.winRound();
    else sfx.loseRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastRound]);

  // Match-end fanfare
  useEffect(() => {
    if (!state.result) return;
    if (state.result.winner === 'player') sfx.matchWin();
    else if (state.result.winner === 'npc') sfx.matchLose();
    else sfx.drawRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);

  const npcDeckLabel = useMemo(() => npcDeckSummary(npcComposition, t.cardLabels), [npcComposition, t]);
  const npcCardsLeft = npc.hand.length + npc.deckRemaining.length;
  const npcSprite = CHARACTER_SPRITES[npcCharacter.id];
  const playerSprite = CHARACTER_SPRITES[playerCharacter.id];

  const phaseLabel =
    state.phase === PHASES.SKILL ? t.phaseSkill : state.phase === PHASES.CHOOSE ? t.phaseChoose : t.phaseResult;

  const revealed = (state.phase === PHASES.RESOLVED || state.phase === PHASES.FINISHED) && state.lastRound;

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
          <span className="text-accent-red text-[15px] sm:text-lg font-extrabold">{player.score}</span>
          <span className="text-border-dim2 text-sm">—</span>
          <span className="text-accent-blue text-[15px] sm:text-lg font-extrabold">{npc.score}</span>
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

      <div className="flex-1 min-h-[220px] sm:min-h-[190px] [@media(max-height:520px)]:min-h-[140px] relative overflow-hidden">
        <div className="scanlines absolute inset-0 pointer-events-none z-10" />
        <div className="absolute top-2 left-2 w-5 h-5 border-t border-l border-border-dim" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t border-r border-border-dim" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b border-l border-border-dim" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b border-r border-border-dim" />

        <div
          className="absolute top-[4%] right-[3%] sm:top-[6%] sm:right-[4%] flex flex-col items-center gap-1.5 z-[2]"
          style={{ '--accent-color': npcCharacter.color }}
        >
          <ScoreProgress score={npc.score} color={npcCharacter.color} />
          <div
            className="border bg-gradient-to-b from-panel-top to-panel-bot p-1.5 transition-shadow"
            style={{
              borderColor: npcCharacter.color,
              boxShadow: flashSides.has('npc') ? `0 0 4px ${npcCharacter.color}, 0 0 22px ${npcCharacter.color}, 0 0 40px ${npcCharacter.color}` : undefined,
              animation: flashSides.has('npc') ? 'skillPulse 1.1s ease-out' : undefined,
            }}
          >
            <Sprite grid={npcSprite.grid} pal={npcSprite.pal} rects={npcSprite.rects} size={60} flip />
          </div>
          <span className="text-[8px] sm:text-[9px] tracking-[1px] sm:tracking-[3px]" style={{ color: npcCharacter.color }}>
            {npcCharacter.name[lang]}
          </span>
          <span className="text-[9px] text-text-dim2 max-w-[100px] sm:max-w-[160px] text-center leading-tight">
            {t.deckRemaining(npcDeckLabel, npcCardsLeft)}
          </span>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] border-2 border-text-dim2 bg-bg px-3.5 py-1.5">
          <span className="text-text-dim3 text-lg tracking-[6px] font-extrabold">VS</span>
        </div>

        <div
          className="absolute bottom-[4%] left-[3%] sm:bottom-[6%] sm:left-[4%] flex flex-col items-center gap-1.5 z-[2]"
          style={{ '--accent-color': playerCharacter.color }}
        >
          <div
            className="border bg-gradient-to-b from-panel-top to-panel-bot p-1.5 transition-shadow"
            style={{
              borderColor: playerCharacter.color,
              boxShadow: flashSides.has('player') ? `0 0 4px ${playerCharacter.color}, 0 0 22px ${playerCharacter.color}, 0 0 40px ${playerCharacter.color}` : undefined,
              animation: flashSides.has('player') ? 'skillPulse 1.1s ease-out' : undefined,
            }}
          >
            <Sprite grid={playerSprite.grid} pal={playerSprite.pal} rects={playerSprite.rects} size={60} />
          </div>
          <span className="text-[8px] sm:text-[9px] tracking-[1px] sm:tracking-[3px]" style={{ color: playerCharacter.color }}>
            {playerCharacter.name[lang]}
          </span>
          <ScoreProgress score={player.score} color={playerCharacter.color} />
        </div>

        {revealed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-6 sm:gap-10 z-[4] mt-10">
            <div
              className="w-[46px] h-[46px] sm:w-[60px] sm:h-[60px] border-2 border-dashed border-border-dim2 flex items-center justify-center"
              style={{
                borderColor:
                  state.lastRound.winnerSide === 'player'
                    ? 'var(--color-accent-green)'
                    : state.lastRound.winnerSide === 'npc'
                    ? 'var(--color-danger)'
                    : undefined,
              }}
            >
              <Sprite rects={CARD_SPRITES[state.lastRound.playerCard.type].rects} size={30} />
            </div>
            <div
              className="w-[46px] h-[46px] sm:w-[60px] sm:h-[60px] border-2 border-dashed border-border-dim2 flex items-center justify-center"
              style={{
                borderColor:
                  state.lastRound.winnerSide === 'npc'
                    ? 'var(--color-accent-green)'
                    : state.lastRound.winnerSide === 'player'
                    ? 'var(--color-danger)'
                    : undefined,
              }}
            >
              <Sprite rects={CARD_SPRITES[state.lastRound.npcCard.type].rects} size={30} />
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-accent-blue min-h-4 px-2.5 pt-1.5">
        {revealed
          ? state.lastRound.winnerSide === null
            ? t.drawRound
            : t.winRound(state.lastRound.winnerSide === 'player' ? t.you : t.npc, state.lastRound.pointsAwarded)
          : state.skillEvents?.map((e, i) => (
              <div key={i}>{skillEventText(e, playerCharacter, npcCharacter, t, lang)}</div>
            ))}
      </div>

      {player.peekInfo && !revealed && (
        <div className="mx-2.5 mt-2 p-2 px-3 border border-accent-green text-accent-green text-[11px] text-center">
          {t.youSee}: {player.peekInfo.map((c) => t.cardLabels[c.type]).join(', ')}
        </div>
      )}

      {!revealed && (
        <>
          <div className="bg-gradient-to-b from-panel-bot to-bg border-t-2 border-border-dim2 px-2 sm:px-3.5 py-2.5 sm:py-3 flex justify-center items-end gap-2 sm:gap-3 flex-wrap shrink-0">
            {player.hand.map((c) => (
              <CardIcon
                key={c.id}
                type={c.type}
                selected={player.selectedCardId === c.id}
                disabled={state.phase !== PHASES.CHOOSE || player.ready || c.id === player.lockedCardId}
                locked={c.id === player.lockedCardId}
                justDrawn={justDrawnIds.has(c.id)}
                onClick={() => {
                  sfx.select();
                  dispatch({ type: 'SELECT_CARD', side: 'player', cardId: c.id });
                }}
              />
            ))}
          </div>

          <div className="flex justify-center gap-2 sm:gap-3.5 my-3 flex-wrap px-2">
            {state.phase === PHASES.SKILL && player.skillDeclaredThisTurn === null && (
              <>
                {!player.skillUsed && (
                  <Button
                    variant="primary"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      sfx.skill();
                      dispatch({ type: 'DECLARE_SKILL', side: 'player', use: true });
                    }}
                  >
                    {t.useSkill(SKILLS[playerCharacter.skillId].name[lang])}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    sfx.click();
                    dispatch({ type: 'DECLARE_SKILL', side: 'player', use: false });
                  }}
                >
                  {player.skillUsed ? t.skillUsedContinue : t.skip}
                </Button>
              </>
            )}

            {state.phase === PHASES.CHOOSE && !player.ready && (
              <Button
                variant="outline"
                disabled={!player.selectedCardId}
                onClick={() => {
                  sfx.ready();
                  dispatch({ type: 'READY', side: 'player' });
                }}
              >
                {t.ready}
              </Button>
            )}

            {state.phase === PHASES.CHOOSE && player.ready && (
              <span className="text-text-dim text-xs self-center">{t.waitingOpponent}</span>
            )}
          </div>
        </>
      )}

      {state.phase === PHASES.FINISHED && state.result && (
        <ResultOverlay result={state.result} player={player} npc={npc} onExit={onExit} />
      )}
    </div>
  );
}
