import type { FastifyInstance } from 'fastify';
import type { UserRole } from '@quizier/shared';
import { Server as SocketIOServer } from 'socket.io';

import { authCookieNames } from '../auth/auth.service.js';

type AccessTokenPayload = {
  id: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

const parseCookieHeader = (cookieHeader: string | undefined) => {
  const cookieMap = new Map<string, string>();

  if (!cookieHeader) {
    return cookieMap;
  }

  for (const pair of cookieHeader.split(';')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    cookieMap.set(key, decodeURIComponent(value));
  }

  return cookieMap;
};

export const setupNotificationSocket = (fastify: FastifyInstance) => {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: process.env.CLIENT_URL ?? true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookieHeader(cookieHeader);
      const accessToken = cookies.get(authCookieNames.access);

      if (!accessToken) {
        return next(new Error('Unauthorized'));
      }

      const payload = fastify.jwt.verify<AccessTokenPayload>(accessToken, {
        key: process.env.JWT_SECRET,
      });

      if (payload.type !== 'access') {
        return next(new Error('Unauthorized'));
      }

      socket.data.userId = payload.id;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);
  });

  fastify.io = io;

  fastify.addHook('onClose', async () => {
    await io.close();
  });
};
