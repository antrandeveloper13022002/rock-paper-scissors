import { useState } from 'react';
import { useT } from '../i18n/strings.js';
import { sfx } from '../audio/sfx.js';
import { Button } from './Button.jsx';

export function OnlineLobby({ status, roomCode, errorMessage, onCreateRoom, onJoinRoom, onBack }) {
  const { t } = useT();
  const [codeInput, setCodeInput] = useState('');

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-panel-top to-panel-bot border-2 border-border-dim p-4 sm:p-6 text-center">
      {status === 'idle' && (
        <>
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

          <div className="text-text-dim text-xs uppercase tracking-wide mb-2">{t.roomCode}</div>
          <div className="flex gap-2 justify-center">
            <input
              className="bg-transparent border-2 border-border-dim text-text font-mono text-center uppercase tracking-[3px] px-3 py-2 w-32"
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
          <div className="text-3xl font-extrabold tracking-[6px] text-accent-blue mb-3">{roomCode}</div>
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
