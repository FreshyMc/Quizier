import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

export function GameJoinPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/game/${roomCode.trim().toUpperCase()}`);
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
        onChange={(event) => setRoomCode(event.target.value)}
        maxLength={6}
        placeholder="ROOM CODE"
      />
      <button
        className="rounded bg-blue-600 px-4 py-2 text-sm"
        disabled={roomCode.trim().length !== 6}
      >
        Join
      </button>
    </form>
  );
}
