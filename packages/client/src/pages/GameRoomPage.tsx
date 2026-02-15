import { useEffect } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import { GameBoard } from '../components/GameBoard';

export function GameRoomPage() {
  const socket = useSocket();
  const { roomCode = '' } = useParams();
  const { state } = useGame();

  useEffect(() => {
    if (!socket || !roomCode) {
      return;
    }

    socket.emit('game:join', { roomCode: roomCode.toUpperCase() });

    void api.get(`/api/games/${roomCode.toUpperCase()}`);

    return () => {
      socket.emit('game:leave', { roomCode: roomCode.toUpperCase() });
    };
  }, [roomCode, socket]);

  const startGame = () => {
    if (!socket) {
      return;
    }

    socket.emit('game:start', { roomCode: roomCode.toUpperCase() });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-4 py-3">
        <h1 className="text-lg font-semibold">Game Room {roomCode.toUpperCase()}</h1>
        {state.status === 'WAITING' ? (
          <button className="rounded bg-emerald-600 px-3 py-1 text-sm" onClick={startGame}>
            Start game
          </button>
        ) : null}
      </div>
      <GameBoard socket={socket} />
    </section>
  );
}
