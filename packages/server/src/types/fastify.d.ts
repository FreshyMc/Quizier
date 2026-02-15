import 'fastify';
import '@fastify/jwt';
import type { UserRole } from '@quizier/shared';

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
  interface FastifyRequest {
    user: AuthTokenUser;
  }
}
