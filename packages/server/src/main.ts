import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 4000);
const host = '0.0.0.0';

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`Server listening on ${host}:${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
