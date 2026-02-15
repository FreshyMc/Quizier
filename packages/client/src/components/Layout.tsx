import { Link, Outlet } from 'react-router';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link to="/dashboard" className="hover:text-blue-300">
              Dashboard
            </Link>
            <Link to="/game/create" className="hover:text-blue-300">
              Create Game
            </Link>
            <Link to="/game/join" className="hover:text-blue-300">
              Join Game
            </Link>
            <Link to="/questions/submit" className="hover:text-blue-300">
              Submit Question
            </Link>
            <Link to="/leaderboard" className="hover:text-blue-300">
              Leaderboard
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{user?.username}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1fr_260px]">
        <main>
          <Outlet />
        </main>
        <aside>
          <NotificationBell />
        </aside>
      </div>
    </div>
  );
}
