import { useState } from 'react';
import { LoadingButton } from '../components/LoadingButton';
import { useNotifications, useMarkNotificationReadMutation } from '../hooks/queries';

export function NotificationsPage() {
  const { data } = useNotifications(1);
  const markRead = useMarkNotificationReadMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onMarkRead = async (notificationId: string) => {
    setPendingId(notificationId);
    try {
      await markRead.mutateAsync(notificationId);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h1 className="text-lg font-semibold">Notifications</h1>
      <ul className="space-y-2">
        {(data?.notifications ?? []).map((item) => (
          <li key={item.id} className="rounded bg-slate-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-100">{item.title}</p>
              {!item.isRead ? (
                <LoadingButton
                  className="inline-flex items-center gap-1 text-xs text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void onMarkRead(item.id)}
                  disabled={pendingId === item.id}
                  isLoading={pendingId === item.id}
                  loadingText="Marking..."
                  spinnerClassName="h-3 w-3"
                >
                  Mark read
                </LoadingButton>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-300">{item.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
