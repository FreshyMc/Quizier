import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { queryClient } from './lib/query-client';
import { appRouter } from './routes/AppRouter';

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={appRouter} />
        </QueryClientProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
