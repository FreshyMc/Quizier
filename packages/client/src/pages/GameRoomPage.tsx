import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { GameBoard } from '../components/GameBoard';
import { GameOverScreen } from '../components/GameOverScreen';
import type { GameSessionDto } from '../types/app';

export function GameRoomPage() {
  const socket = useSocket();
  const { gameId = '' } = useParams();
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const normalizedGameId = useMemo(() => gameId.trim(), [gameId]);
  const isHost = state.gameSession?.hostId === user?.id;

  useEffect(() => {
    if (!socket || !normalizedGameId) {
      return;
    }

    let isCancelled = false;
    let joinedRoomCode: string | null = null;

    const loadGameState = async () => {
      const maxAttempts = 4;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await api.get<{ game: GameSessionDto }>(
            `/api/games/${normalizedGameId}`,
          );
          if (isCancelled) {
            return;
          }

          const roomCode = response.game.roomCode.trim().toUpperCase();
          if (!roomCode) {
            throw new Error('Unable to load game room code');
          }

          joinedRoomCode = roomCode;
          socket.emit('game:join', { roomCode });

          dispatch({ type: 'SET_GAME_STATE', payload: response.game });
          setError(null);
          return;
        } catch (requestError) {
          const message =
            requestError instanceof Error ? requestError.message : 'Unable to load game session';

          const canRetry = attempt < maxAttempts && message.toLowerCase().includes('not found');

          if (!canRetry) {
            if (!isCancelled) {
              setError(message);
            }
            return;
          }

          await new Promise((resolve) => {
            setTimeout(resolve, attempt * 250);
          });

          if (isCancelled) {
            return;
          }
        }
      }
    };

    void loadGameState();

    return () => {
      isCancelled = true;
      if (joinedRoomCode) {
        socket.emit('game:leave', { roomCode: joinedRoomCode });
      }
    };
  }, [dispatch, normalizedGameId, socket]);

  const startGame = () => {
    const roomCode = state.gameSession?.roomCode?.trim().toUpperCase();
    if (!socket || !roomCode) {
      return;
    }

    socket.emit('game:start', { roomCode });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-4 py-3">
        <h1 className="text-lg font-semibold">
          Game Room {state.gameSession?.roomCode ?? normalizedGameId}
        </h1>
        {state.status === 'WAITING' && isHost ? (
          <button className="rounded bg-emerald-600 px-3 py-1 text-sm" onClick={startGame}>
            Start game
          </button>
        ) : null}
      </div>
      {error ? (
        <div className="rounded border border-rose-700 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {state.status === 'FINISHED' && state.gameSession ? (
        <GameOverScreen
          players={state.gameSession.players}
          scores={state.scores}
          winnerId={state.gameSession.winnerId}
        />
      ) : (
        <GameBoard socket={socket} />
      )}
    </section>
  );
}
