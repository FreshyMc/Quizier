import type { GamePlayer } from '../types/app';

export function PlayerList({
  players,
  activePlayerId,
}: {
  players: GamePlayer[];
  activePlayerId?: string;
}) {
  return (
    <aside className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Players</h3>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.userId}
            className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
              player.userId === activePlayerId ? 'bg-blue-500/20 text-blue-100' : 'text-slate-200'
            }`}
          >
            <span>{player.username}</span>
            <span>{player.score}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
