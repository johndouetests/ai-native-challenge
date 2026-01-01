import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export type AfterCommit = (callback: () => void) => void;

/**
 * Runs database transactions one at a time.
 *
 * The better-sqlite3 driver uses a single connection, so two overlapping
 * `dataSource.transaction()` calls would end up nested in each other. Every write
 * goes through this runner, which queues transactions and executes them in order.
 * Callbacks registered with `afterCommit` run only once the transaction has committed.
 */
@Injectable()
export class TransactionRunner {
  private readonly logger = new Logger(TransactionRunner.name);
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (manager: EntityManager, afterCommit: AfterCommit) => Promise<T>): Promise<T> {
    const execute = async (): Promise<T> => {
      const callbacks: Array<() => void> = [];
      const result = await this.dataSource.transaction((manager) =>
        work(manager, (callback) => callbacks.push(callback)),
      );
      for (const callback of callbacks) {
        try {
          callback();
        } catch (error) {
          this.logger.error(error instanceof Error ? error : String(error));
        }
      }
      return result;
    };
    const next = this.tail.then(execute, execute);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
