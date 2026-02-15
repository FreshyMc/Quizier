import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import mongoose from 'mongoose';

import authRoutes from './modules/auth/auth.routes.js';
import categoryRoutes from './modules/category/category.routes.js';
import questionRoutes from './modules/question/question.routes.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 4000);
const host = '0.0.0.0';

const mongodbUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongodbUri) {
  throw new Error('MONGODB_URI must be set');
}

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set');
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET must be set');
}

await mongoose.connect(mongodbUri);

await app.register(cookie);
await app.register(cors, {
  origin: process.env.CLIENT_URL ?? true,
  credentials: true,
});
await app.register(jwt, {
  secret: jwtSecret,
});

await app.register(authRoutes, {
  prefix: '/api/auth',
});
await app.register(categoryRoutes);
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
