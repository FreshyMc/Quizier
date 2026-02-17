import { Suspense, lazy } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { GameProvider } from '../contexts/GameContext';

const AdminGuard = lazy(() =>
  import('../guards/AdminGuard').then((m) => ({ default: m.AdminGuard })),
);
const AuthGuard = lazy(() => import('../guards/AuthGuard').then((m) => ({ default: m.AuthGuard })));
const Layout = lazy(() => import('../components/Layout').then((m) => ({ default: m.Layout })));

const LandingPage = lazy(() =>
  import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const GameCreatePage = lazy(() =>
  import('../pages/GameCreatePage').then((m) => ({ default: m.GameCreatePage })),
);
const GameJoinPage = lazy(() =>
  import('../pages/GameJoinPage').then((m) => ({ default: m.GameJoinPage })),
);
const GameRoomPage = lazy(() =>
  import('../pages/GameRoomPage').then((m) => ({ default: m.GameRoomPage })),
);
const QuestionSubmitPage = lazy(() =>
  import('../pages/QuestionSubmitPage').then((m) => ({
    default: m.QuestionSubmitPage,
  })),
);
const MySubmissionsPage = lazy(() =>
  import('../pages/MySubmissionsPage').then((m) => ({
    default: m.MySubmissionsPage,
  })),
);
const LeaderboardPage = lazy(() =>
  import('../pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);
const NotificationsPage = lazy(() =>
  import('../pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import('../pages/AdminCategoriesPage').then((m) => ({
    default: m.AdminCategoriesPage,
  })),
);
const AdminQuestionsPage = lazy(() =>
  import('../pages/AdminQuestionsPage').then((m) => ({
    default: m.AdminQuestionsPage,
  })),
);

function suspense(element: JSX.Element) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-6 text-sm opacity-70">Loading…</div>
      }
    >
      {element}
    </Suspense>
  );
}

function GameLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export const appRouter = createBrowserRouter([
  { path: '/', element: suspense(<LandingPage />) },
  { path: '/login', element: suspense(<LoginPage />) },
  { path: '/register', element: suspense(<RegisterPage />) },
  {
    element: suspense(<AuthGuard />),
    children: [
      {
        element: suspense(<Layout />),
        children: [
          { path: '/dashboard', element: suspense(<DashboardPage />) },
          { path: '/game/create', element: suspense(<GameCreatePage />) },
          { path: '/game/join', element: suspense(<GameJoinPage />) },
          {
            element: <GameLayout />,
            children: [{ path: '/game/:gameId', element: suspense(<GameRoomPage />) }],
          },
          { path: '/questions/submit', element: suspense(<QuestionSubmitPage />) },
          {
            path: '/questions/my-submissions',
            element: suspense(<MySubmissionsPage />),
          },
          { path: '/leaderboard', element: suspense(<LeaderboardPage />) },
          { path: '/notifications', element: suspense(<NotificationsPage />) },
          {
            element: suspense(<AdminGuard />),
            children: [
              {
                path: '/admin/categories',
                element: suspense(<AdminCategoriesPage />),
              },
              {
                path: '/admin/questions',
                element: suspense(<AdminQuestionsPage />),
              },
            ],
          },
        ],
      },
    ],
  },
]);
