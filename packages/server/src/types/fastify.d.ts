import 'fastify';
import '@fastify/jwt';
import type { UserRole } from '@quizier/shared';
import type { Server as SocketIOServer } from 'socket.io';

type AuthTokenUser = {
  id: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenUser;
    user: AuthTokenUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }

  interface FastifyRequest {
    user: AuthTokenUser;
  }
}
