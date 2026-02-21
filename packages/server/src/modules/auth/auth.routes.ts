import type { FastifyPluginAsync } from 'fastify';

import { loginSchema, registerSchema } from '@quizier/shared';
import { createHttpValidationError } from '../../utils/error.js';
import { formatValidationErrors } from '../../utils/validation.js';
import { authenticate } from './auth.middleware.js';
import { authCookieNames, login, logout, me, refresh, register } from './auth.service.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createHttpValidationError(400, formatValidationErrors(parsed.error));
    }

    return register(fastify, parsed.data, reply);
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createHttpValidationError(400, formatValidationErrors(parsed.error));
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
