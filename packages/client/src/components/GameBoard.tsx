import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { TimerBar } from './TimerBar';
import { QuestionCard } from './QuestionCard';
import { PlayerList } from './PlayerList';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

export function GameBoard({ socket }: { socket: Socket | null }) {
  const { state } = useGame();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const activePlayerId =
    state.gameSession?.players[state.gameSession.currentTurnPlayerIndex]?.userId;
  const canAnswer = state.status === 'IN_PROGRESS' && activePlayerId === user?.id;

  useEffect(() => {
    setSelectedOption(null);
  }, [state.currentQuestion?.id, activePlayerId]);

  const chooseAnswer = (option: number) => {
    setSelectedOption(option);
  };

  const submitAnswer = () => {
    if (selectedOption === null) {
      return;
    }

    const roomCode = state.gameSession?.roomCode;
    if (!socket || !roomCode) {
      return;
    }

    socket.emit('game:answer', {
      roomCode,
      option: selectedOption,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <section className="space-y-4">
        <TimerBar
          secondsLeft={state.timer}
          total={state.gameSession?.settings?.timePerTurn ?? 30}
        />
        {state.currentQuestion ? (
          <QuestionCard
            text={state.currentQuestion.text}
            options={state.currentQuestion.options}
            selectedOption={selectedOption}
            disabled={!canAnswer}
            onSelect={chooseAnswer}
            onSubmit={submitAnswer}
          />
        ) : (
          <div className="rounded border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
            Waiting for next turn...
          </div>
        )}
      </section>
      <PlayerList players={state.gameSession?.players ?? []} activePlayerId={activePlayerId} />
    </div>
  );
}
