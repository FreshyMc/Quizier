import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/socket';
import { queryClient } from '../lib/query-client';
import { queryKeys } from '../hooks/queries';
import { useAuth } from './AuthContext';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<AppSocket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<AppSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket((previous) => {
        previous?.disconnect();
        return null;
      });
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
    const nextSocket: AppSocket = io(baseUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    nextSocket.on('notification:new', () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(1) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated]);

  const value = useMemo(() => socket, [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
