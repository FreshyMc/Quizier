import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { UserRole } from '@shared/enums';
import { LoadingButton } from './LoadingButton';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <h1 className="text-2xl font-bold">
            <Link to="/dashboard">Quizier</Link>
          </h1>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
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
            {user?.role === UserRole.ADMIN ? (
              <>
                <Link to="/admin/categories" className="hover:text-blue-300">
                  Admin Categories
                </Link>
                <Link to="/admin/questions" className="hover:text-blue-300">
                  Admin Questions
                </Link>
              </>
            ) : null}
          </nav>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-slate-300">{user?.username}</span>
            <LoadingButton
              type="button"
              onClick={() => void onLogout()}
              variant="logout"
              isLoading={isLoggingOut}
              loadingText="Logging out..."
            >
              Logout
            </LoadingButton>
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
