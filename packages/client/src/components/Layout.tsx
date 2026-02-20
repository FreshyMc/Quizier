import { useCallback, useState } from 'react';
import { Link, Outlet } from 'react-router';
import { UserRole } from '@shared/enums';
import { LoadingButton } from './LoadingButton';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const onLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-slate-800 text-white relative">
      <header className="border-b border-slate-800  bg-slate-950 h-15 flex justify-center items-stretch sticky top-0 z-50">
        <div className="flex max-w-6xl items-center gap-4 px-4 py-3 mx-auto w-full">
          <h1 className="text-2xl font-bold">
            <Link to="/dashboard">Quizier</Link>
          </h1>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-slate-300">{user?.username}</span>
            <button
              className="ml-2 rounded-full hover:bg-slate-700 p-2 cursor-pointer"
              onClick={toggleMenu}
            >
              <i className="fa-solid fa-bars fa-lg" />
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
      <div
        className={`sidebar-menu fixed top-15 right-0 w-80 h-[calc(100vh-3.75rem)] border-l border-slate-800 bg-slate-950 flex flex-col ${isMenuOpen ? 'block' : 'hidden'}`}
      >
        <ul className="list-none w-full flex flex-col">
          <li>
            <Link
              to="/game/create"
              className="hover:text-white hover:bg-blue-500 flex items-center py-2 px-4"
            >
              Create Game
            </Link>
          </li>
          <li>
            <Link
              to="/game/join"
              className="hover:text-white hover:bg-blue-500 flex items-center py-2 px-4"
            >
              Join Game
            </Link>
          </li>
          <li>
            <Link
              to="/questions/submit"
              className="hover:text-white hover:bg-blue-500 flex items-center py-2 px-4"
            >
              Submit Question
            </Link>
          </li>
          <li>
            <Link
              to="/leaderboard"
              className="hover:text-white hover:bg-blue-500 flex items-center py-2 px-4"
            >
              Leaderboard
            </Link>
          </li>
        </ul>
        {user?.role === UserRole.ADMIN ? (
          <>
            <p className="mt-2 py-2 px-4 bg-slate-700/50">Admin Options</p>
            <ul className="list-none w-full flex flex-col">
              <Link
                to="/admin/categories"
                className="hover:text-white hover:bg-blue-500 flex items-center py-2 px-4"
              >
                Category Management
              </Link>
              <Link
                to="/admin/questions"
                className="hover:text-white hover:bg-blue-500 flex items-center py-2 px-4"
              >
                Questions Moderation
              </Link>
            </ul>
          </>
        ) : null}
        <div className="mt-auto p-4">
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
    </div>
  );
}
