export function TimerBar({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const percent = total > 0 ? Math.max(0, Math.min(100, (secondsLeft / total) * 100)) : 0;

  return (
    <div className="h-3 w-full overflow-hidden rounded bg-slate-700">
      <div
        className="h-3 bg-emerald-500 transition-all duration-1000"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
