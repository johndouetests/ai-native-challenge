import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { DatabaseBootstrap } from './database-bootstrap';
import { ENTITIES } from './entities';
import { IdGenerator } from './id-generator';
import { InitSchema1767225600000 } from './migrations/1767225600000-InitSchema';
import { SqlLogger } from './sql-logger';
import { TransactionRunner } from './transaction-runner';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        if (config.dbPath !== ':memory:') mkdirSync(dirname(config.dbPath), { recursive: true });
        return {
          type: 'better-sqlite3' as const,
          database: config.dbPath,
          entities: ENTITIES,
          migrations: [InitSchema1767225600000],
          migrationsRun: true,
          synchronize: false,
          logger: new SqlLogger(config.sqlLogging),
          prepareDatabase: (db: { pragma: (sql: string) => unknown }) => {
            db.pragma('journal_mode = WAL');
            db.pragma('foreign_keys = ON');
            db.pragma('busy_timeout = 5000');
          },
        };
      },
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  providers: [TransactionRunner, IdGenerator, DatabaseBootstrap],
  exports: [TypeOrmModule, TransactionRunner, IdGenerator],
})
export class DatabaseModule {}
