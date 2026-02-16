import type { FastifyPluginAsync } from 'fastify';

import { loginSchema, registerSchema } from '@quizier/shared';
import { formatValidationErrorMessage } from '../../utils/validation.js';
import { authenticate } from './auth.middleware.js';
import { authCookieNames, login, logout, me, refresh, register } from './auth.service.js';

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createHttpError(400, formatValidationErrorMessage(parsed.error));
    }

    return register(fastify, parsed.data, reply);
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createHttpError(400, formatValidationErrorMessage(parsed.error));
    }

    return login(fastify, parsed.data, reply);
  });

  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies[authCookieNames.refresh];
    return refresh(fastify, refreshToken, reply);
  });

  fastify.post('/logout', async (_request, reply) => {
    return logout(reply);
  });

  fastify.get('/me', { preHandler: [authenticate] }, async (request) => {
    return me(fastify, request.user.id);
  });
};

export default authRoutes;
