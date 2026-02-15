import { createBrowserRouter, Outlet } from 'react-router';
import { GameProvider } from '../contexts/GameContext';
import { AdminGuard } from '../guards/AdminGuard';
import { AuthGuard } from '../guards/AuthGuard';
import { Layout } from '../components/Layout';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { GameCreatePage } from '../pages/GameCreatePage';
import { GameJoinPage } from '../pages/GameJoinPage';
import { GameRoomPage } from '../pages/GameRoomPage';
import { QuestionSubmitPage } from '../pages/QuestionSubmitPage';
import { MySubmissionsPage } from '../pages/MySubmissionsPage';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AdminCategoriesPage } from '../pages/AdminCategoriesPage';
import { AdminQuestionsPage } from '../pages/AdminQuestionsPage';

function GameLayout() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export const appRouter = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/game/create', element: <GameCreatePage /> },
          { path: '/game/join', element: <GameJoinPage /> },
          {
            element: <GameLayout />,
            children: [{ path: '/game/:gameId', element: <GameRoomPage /> }],
          },
          { path: '/questions/submit', element: <QuestionSubmitPage /> },
          { path: '/questions/my-submissions', element: <MySubmissionsPage /> },
          { path: '/leaderboard', element: <LeaderboardPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          {
            element: <AdminGuard />,
            children: [
              { path: '/admin/categories', element: <AdminCategoriesPage /> },
              { path: '/admin/questions', element: <AdminQuestionsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
