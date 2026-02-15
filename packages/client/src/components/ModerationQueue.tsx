import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function ModerationQueue() {
  const { data, refetch } = useQuery({
    queryKey: ['moderation-pending'],
    queryFn: () =>
      api.get<{ submissions: Array<{ id: string; question?: { text?: string } }> }>(
        '/api/admin/questions/pending',
      ),
  });

  const approve = async (id: string) => {
    await api.patch(`/api/admin/questions/${id}/approve`);
    await refetch();
  };

  const reject = async (id: string) => {
    await api.patch(`/api/admin/questions/${id}/reject`, { reason: 'Needs improvement' });
    await refetch();
  };

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Moderation Queue</h2>
      <ul className="space-y-2">
        {(data?.submissions ?? []).map((submission) => (
          <li key={submission.id} className="rounded bg-slate-800 p-3">
            <p className="text-sm text-slate-200">
              {submission.question?.text ?? 'Pending question'}
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <button
                className="rounded bg-emerald-700 px-2 py-1"
                onClick={() => void approve(submission.id)}
              >
                Approve
              </button>
              <button
                className="rounded bg-rose-700 px-2 py-1"
                onClick={() => void reject(submission.id)}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
