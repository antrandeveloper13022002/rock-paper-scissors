import { useState } from 'react';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { STAGES } from '../data/stages.js';
import { Button } from './Button.jsx';

export function OnlineLobby({ status, roomCode, errorMessage, stageVote, onStageVote, onCreateRoom, onJoinRoom, onBack }) {
  const { t, lang } = useT();
  const [codeInput, setCodeInput] = useState('');

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot pixel-panel p-4 sm:p-6 text-center">
      {status === 'idle' && (
        <>
          <h2 className="mt-0 mb-1 uppercase tracking-[3px] text-base">{t.stageVoteTitle}</h2>
          <p className="mt-0 mb-3 text-text-dim text-[13px]">{t.stageVoteHint}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            {Object.entries(STAGES).map(([id, stage]) => {
              const on = id === stageVote;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  className="h-14 px-1 text-[13px] leading-tight cursor-pointer border-0 text-[#f3e2b8] [text-shadow:1px_1px_0_#000]"
                  style={{
                    background: `linear-gradient(180deg, ${stage.sky[2]}, ${stage.sky[6]} 70%, ${stage.floor} 70%)`,
                    boxShadow: on ? '0 0 0 3px #f2c14e, 0 0 0 6px #2a1a10' : '0 0 0 3px #2a1a10',
                  }}
                  onClick={() => {
                    sfx.click();
                    onStageVote(id);
                  }}
                >
                  {stage.name[lang]}
                </button>
              );
            })}
          </div>

          <Button
            variant="primary"
            className="w-full mb-4"
            onClick={() => {
              sfx.click();
              onCreateRoom();
            }}
          >
            {t.createRoom}
          </Button>

          <label htmlFor="room-code" className="block text-text-dim text-xs uppercase tracking-wide mb-2">
            {t.roomCode}
          </label>
          <div className="flex gap-2 justify-center">
            <input
              id="room-code"
              className="bg-[#2a1a10] border-0 text-text font-mono text-center uppercase tracking-[3px] px-3 py-2 w-32 shadow-[0_0_0_3px_#8a5a34]"
              maxLength={4}
              placeholder={t.enterRoomCode}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            />
            <Button
              variant="outline"
              disabled={codeInput.length !== 4}
              onClick={() => {
                sfx.click();
                onJoinRoom(codeInput);
              }}
            >
              {t.joinRoom}
            </Button>
          </div>
        </>
      )}

      {status === 'connecting' && <p className="text-text-dim">{t.connecting}</p>}

      {status === 'waiting' && (
        <>
          <div className="text-3xl tracking-[6px] text-accent-blue mb-3">{roomCode}</div>
          <p className="text-text-dim text-sm">{t.shareRoomCode(roomCode)}</p>
          <p className="text-text-dim text-xs mt-3 animate-pulse">{t.waitingForOpponent}</p>
        </>
      )}

      {status === 'error' && <p className="text-danger mb-4">{errorMessage || t.connectionError}</p>}

      <div className="flex justify-center mt-5">
        <Button
          variant="ghost"
          onClick={() => {
            sfx.click();
            onBack();
          }}
        >
          {t.back}
        </Button>
      </div>
    </div>
  );
}
