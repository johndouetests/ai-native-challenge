import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { createValidationPipe } from './common/validation';
import type { AppConfig } from './config/app-config';
import { SqlStats, sqlStatsStorage } from './lib/request-context';

/** Builds the application without listening. Used by main.ts and by tests. */
export async function createApp(config: AppConfig): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(config), new FastifyAdapter(), {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  if (config.sqlLogging) registerSqlCounter(app.getHttpAdapter().getInstance());
  return app;
}

/** With DEBUG_SQL=1 every response carries `X-Sql-Queries`: the number of SQL statements it ran. */
function registerSqlCounter(fastify: FastifyInstance): void {
  const statsOf = new WeakMap<FastifyRequest, SqlStats>();
  fastify.addHook('preHandler', (request, _reply, done) => {
    const stats: SqlStats = { queries: 0 };
    statsOf.set(request, stats);
    sqlStatsStorage.run(stats, done);
  });
  fastify.addHook('onSend', (request, reply, payload, done) => {
    const stats = statsOf.get(request);
    if (stats) void reply.header('X-Sql-Queries', String(stats.queries));
    done(null, payload);
  });
}
