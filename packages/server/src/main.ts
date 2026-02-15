import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import mongoose from 'mongoose';

import authRoutes from './modules/auth/auth.routes.js';
import categoryRoutes from './modules/category/category.routes.js';
import gameRoutes from './modules/game/game.routes.js';
import { setupGameSocket } from './modules/game/game.socket.js';
import { notificationRoutes, setupNotificationSocket } from './modules/notification/index.js';
import questionRoutes from './modules/question/question.routes.js';
import { env } from './config/env.js';
import { normalizeHttpError } from './utils/error.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

const port = env.port;
const host = '0.0.0.0';

const mongodbUri = env.mongodbUri;
const jwtSecret = env.jwtSecret;
const allowedOrigins = new Set([...(env.clientUrl ? [env.clientUrl] : []), ...env.clientUrls]);
let isShuttingDown = false;

const shutdown = async (reason: string, error?: unknown) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (error) {
    app.log.error({ err: error, reason }, 'Starting graceful shutdown after fatal error');
  } else {
    app.log.info({ reason }, 'Starting graceful shutdown');
  }

  try {
    await app.close();
  } catch (closeError) {
    app.log.error({ err: closeError }, 'Failed to close Fastify cleanly');
  }

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    app.log.error({ err: disconnectError }, 'Failed to disconnect MongoDB cleanly');
  }

  process.exit(error ? 1 : 0);
};

app.setErrorHandler((error, request, reply) => {
  const normalized = normalizeHttpError(error);

  if (normalized.statusCode >= 500) {
    request.log.error(
      {
        err: normalized.error,
        statusCode: normalized.statusCode,
        method: request.method,
        url: request.url,
      },
      'Unhandled request error',
    );
  } else {
    request.log.warn(
      {
        err: normalized.error,
        statusCode: normalized.statusCode,
        method: request.method,
        url: request.url,
      },
      'Request failed',
    );
  }

  if (reply.sent) {
    return;
  }

  reply.status(normalized.statusCode).send({ message: normalized.message });
});

app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ message: `Route ${request.method} ${request.url} not found` });
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  void shutdown('uncaughtException', error);
});

const isAllowedCorsOrigin = (origin: string | undefined) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const bootstrap = async () => {
  await mongoose.connect(mongodbUri);

  await app.register(cookie);
  await app.register(cors, {
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(jwt, {
    secret: jwtSecret,
  });

  setupNotificationSocket(app);
  setupGameSocket(app);

  await app.register(authRoutes, {
    prefix: '/api/auth',
  });
  await app.register(categoryRoutes);
  await app.register(gameRoutes);
  await app.register(notificationRoutes);
  await app.register(questionRoutes);

  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
};

bootstrap().catch((error) => {
  void shutdown('bootstrap-failed', error);
});
