import type { GamePlayer } from '../types/app';

type Props = {
  players: GamePlayer[];
  scores: Record<string, number>;
  winnerId?: string | null;
};

export function GameOverScreen({ players, scores, winnerId }: Props) {
  const rankedPlayers = [...players]
    .map((player) => ({
      ...player,
      finalScore: scores[player.userId] ?? player.score,
    }))
    .sort((first, second) => second.finalScore - first.finalScore);

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-xl font-semibold text-white">Game Over</h2>
      {winnerId ? (
        <p className="text-sm text-emerald-300">
          Winner:{' '}
          {rankedPlayers.find((player) => player.userId === winnerId)?.username ?? 'Unknown'}
        </p>
      ) : null}
      <div className="rounded border border-slate-700 bg-slate-950/40">
        <ul className="divide-y divide-slate-700">
          {rankedPlayers.map((player, index) => (
            <li key={player.userId} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 text-slate-400">#{index + 1}</span>
                <span className="text-slate-100">{player.username}</span>
              </div>
              <span className="font-semibold text-slate-100">{player.finalScore}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
