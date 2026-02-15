import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { UserRole } from '@quizier/shared';

import { authCookieNames } from './auth.service.js';

type AuthTokenPayload = {
  id: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.cookies[authCookieNames.access];

  if (!token) {
    throw createHttpError(401, 'Authentication required');
  }

  let payload: AuthTokenPayload;
  try {
    payload = request.server.jwt.verify<AuthTokenPayload>(token, {
      key: process.env.JWT_SECRET,
    });
  } catch {
    throw createHttpError(401, 'Invalid authentication token');
  }

  if (payload.type !== 'access') {
    throw createHttpError(401, 'Invalid authentication token');
  }

  request.user = payload;
  return reply;
};

export const authorize = (roles: UserRole[]): preHandlerHookHandler => {
  return async (request, _reply) => {
    if (!request.user) {
      throw createHttpError(401, 'Authentication required');
    }

    if (!roles.includes(request.user.role)) {
      throw createHttpError(403, 'Insufficient permissions');
    }
  };
};
