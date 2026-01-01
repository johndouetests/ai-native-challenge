import { AsyncLocalStorage } from 'node:async_hooks';

export interface SqlStats {
  queries: number;
}

/** Per-request SQL statistics, populated when DEBUG_SQL=1. */
export const sqlStatsStorage = new AsyncLocalStorage<SqlStats>();
