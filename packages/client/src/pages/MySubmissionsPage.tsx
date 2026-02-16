import { useMySubmissions } from '../hooks/queries';

export function MySubmissionsPage() {
  const { data, isLoading } = useMySubmissions();

  if (isLoading) {
    return <div className="text-sm text-slate-300">Loading submissions...</div>;
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h1 className="text-lg font-semibold">My Submissions</h1>
      <ul className="space-y-2 text-sm">
        {(data?.submissions ?? []).map((submission, index) => (
          <li key={index} className="rounded bg-slate-800 p-2 text-slate-200">
            {JSON.stringify(submission)}
          </li>
        ))}
      </ul>
    </section>
  );
}
