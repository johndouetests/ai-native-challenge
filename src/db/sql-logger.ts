import { Logger as NestLogger } from '@nestjs/common';
import type { Logger as TypeOrmLogger } from 'typeorm';
import { sqlStatsStorage } from '../lib/request-context';

/**
 * Counts SQL statements per request and, with DEBUG_SQL=1, logs them.
 * Parameters are never logged: they may contain personal data.
 */
export class SqlLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('SQL');

  constructor(private readonly logStatements: boolean) {}

  logQuery(query: string): void {
    const stats = sqlStatsStorage.getStore();
    if (stats) stats.queries += 1;
    if (this.logStatements) this.logger.log(query);
  }

  logQueryError(error: string | Error, query: string): void {
    this.logger.warn(`${error instanceof Error ? error.message : error} -- ${query}`);
  }

  logQuerySlow(time: number, query: string): void {
    this.logger.warn(`slow query (${time} ms): ${query}`);
  }

  logSchemaBuild(): void {}

  logMigration(message: string): void {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') this.logger.warn(String(message));
  }
}
