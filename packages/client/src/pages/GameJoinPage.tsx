import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import type { GameSessionDto } from '../types/app';

export function GameJoinPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedRoomCode = roomCode.trim().toUpperCase();
    if (!normalizedRoomCode || normalizedRoomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ game: GameSessionDto }>(`/api/games/${normalizedRoomCode}`);
      const gameId = response.game.id?.trim();
      if (!gameId) {
        throw new Error('Unable to resolve game id');
      }

      navigate(`/game/${gameId}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Unable to join game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">Join Game</h1>
      <input
        className="w-full rounded bg-slate-800 p-2 text-sm uppercase"
        value={roomCode}
        onChange={(event) => {
          setRoomCode(event.target.value);
          if (error) {
            setError(null);
          }
        }}
        maxLength={6}
        placeholder="ROOM CODE"
      />
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <button
        className="rounded bg-blue-600 px-4 py-2 text-sm"
        disabled={roomCode.trim().length !== 6 || isLoading}
      >
        {isLoading ? 'Joining...' : 'Join'}
      </button>
    </form>
  );
}
