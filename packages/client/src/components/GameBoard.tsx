import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { TimerBar } from './TimerBar';
import { QuestionCard } from './QuestionCard';
import { PlayerList } from './PlayerList';
import { useGame } from '../contexts/GameContext';

export function GameBoard({ socket }: { socket: Socket | null }) {
  const { state, dispatch } = useGame();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const canAnswer =
    state.status === 'IN_PROGRESS' && state.currentQuestion !== null && !state.hasSubmitted;

  useEffect(() => {
    setSelectedOption(null);
  }, [state.currentQuestion?.id]);

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

    dispatch({ type: 'ANSWER_SUBMITTED' });
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
            Waiting for next question...
          </div>
        )}
      </section>
      <PlayerList players={state.gameSession?.players ?? []} />
    </div>
  );
}
