import { useNotifications, useMarkNotificationReadMutation } from '../hooks/queries';

export function NotificationsPage() {
  const { data } = useNotifications(1);
  const markRead = useMarkNotificationReadMutation();

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h1 className="text-lg font-semibold">Notifications</h1>
      <ul className="space-y-2">
        {(data?.notifications ?? []).map((item) => (
          <li key={item.id} className="rounded bg-slate-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-100">{item.title}</p>
              {!item.isRead ? (
                <button
                  className="text-xs text-blue-300"
                  onClick={() => void markRead.mutateAsync(item.id)}
                >
                  Mark read
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-300">{item.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
