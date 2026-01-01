import 'reflect-metadata';
import { Logger } from 'nestjs-pino';
import { createApp } from './app';
import { loadConfig } from './config/app-config';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);
  const logger = app.get(Logger);

  process.on('uncaughtException', (error) => {
    logger.error(error, 'uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(reason instanceof Error ? reason : String(reason), 'unhandled rejection');
  });

  // Graceful shutdown: stop accepting connections, close WebSocket clients, close the database.
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`${signal} received, shutting down`);
    app
      .close()
      .then(() => {
        logger.log('shutdown complete');
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error(error instanceof Error ? error : String(error), 'shutdown failed');
        process.exit(1);
      });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  await app.listen({ port: config.port, host: config.host });
  logger.log(`PointsHub listening on http://${config.host}:${config.port}`);
}

void bootstrap();
