import { useEffect } from 'react';
import type { ServerToClientEvents } from '@shared/socket';
import { useSocket } from '../contexts/SocketContext';

export const useSocketEvent = <TEvent extends keyof ServerToClientEvents>(
  event: TEvent,
  handler: ServerToClientEvents[TEvent],
) => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler, socket]);
};
