import { Link } from 'react-router';
import { useNotifications, useUnreadNotificationCount } from '../hooks/queries';

export function NotificationBell() {
  const { data: unread } = useUnreadNotificationCount();
  const { data } = useNotifications(1);

  return (
    <div className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <span>Notifications</span>
        <span className="rounded bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
          {unread?.unreadCount ?? 0}
        </span>
      </div>
      <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-slate-300">
        {(data?.notifications ?? []).slice(0, 5).map((item) => (
          <li key={item.id} className="rounded bg-slate-800 px-2 py-1">
            {item.title}
          </li>
        ))}
      </ul>
      <Link
        to="/notifications"
        className="mt-2 inline-block text-xs text-blue-300 hover:text-blue-200"
      >
        View all
      </Link>
    </div>
  );
}
