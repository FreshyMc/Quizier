import { useLeaderboard } from '../hooks/queries';

export function LeaderboardPage() {
  const { data } = useLeaderboard();

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h1 className="text-lg font-semibold">Leaderboard</h1>
      <ol className="space-y-2 text-sm">
        {(data?.leaderboard ?? []).map((entry, index) => (
          <li key={index} className="flex items-center justify-between rounded bg-slate-800 p-2">
            <span>{String((entry as { username?: unknown }).username ?? 'Unknown')}</span>
            <span>{Number((entry as { winRate?: unknown }).winRate ?? 0).toFixed(1)}%</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
