import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LoadingButton } from './LoadingButton';

export function ModerationQueue() {
  const [pendingAction, setPendingAction] = useState<{
    submissionId: string;
    action: 'approve' | 'reject';
  } | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['moderation-pending'],
    queryFn: () =>
      api.get<{ submissions: Array<{ id: string; question?: { text?: string } }> }>(
        '/api/admin/questions/pending',
      ),
  });

  const approve = async (id: string) => {
    setPendingAction({ submissionId: id, action: 'approve' });
    try {
      await api.patch(`/api/admin/questions/${id}/approve`);
      await refetch();
    } finally {
      setPendingAction(null);
    }
  };

  const reject = async (id: string) => {
    setPendingAction({ submissionId: id, action: 'reject' });
    try {
      await api.patch(`/api/admin/questions/${id}/reject`, { reason: 'Needs improvement' });
      await refetch();
    } finally {
      setPendingAction(null);
    }
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
              {(() => {
                const isApproving =
                  pendingAction?.submissionId === submission.id &&
                  pendingAction.action === 'approve';
                const isRejecting =
                  pendingAction?.submissionId === submission.id &&
                  pendingAction.action === 'reject';
                const isBusy = pendingAction?.submissionId === submission.id;

                return (
                  <>
                    <LoadingButton
                      variant="primary"
                      onClick={() => void approve(submission.id)}
                      disabled={isBusy}
                      isLoading={isApproving}
                      loadingText="Approving..."
                      spinnerClassName="h-3 w-3"
                    >
                      Approve
                    </LoadingButton>
                    <LoadingButton
                      variant="danger"
                      onClick={() => void reject(submission.id)}
                      disabled={isBusy}
                      isLoading={isRejecting}
                      loadingText="Rejecting..."
                      spinnerClassName="h-3 w-3"
                    >
                      Reject
                    </LoadingButton>
                  </>
                );
              })()}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
