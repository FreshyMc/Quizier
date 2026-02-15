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

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

const port = env.port;
const host = '0.0.0.0';

const mongodbUri = env.mongodbUri;
const jwtSecret = env.jwtSecret;
const allowedOrigins = new Set([...(env.clientUrl ? [env.clientUrl] : []), ...env.clientUrls]);

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

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`Server listening on ${host}:${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
