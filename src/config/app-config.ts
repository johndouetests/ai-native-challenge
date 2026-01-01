import { resolve } from 'node:path';

export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  port: number;
  host: string;
  dbPath: string;
  logLevel: string;
  sqlLogging: boolean;
  partnerSecrets: Record<string, string>;
  wsPingIntervalMs: number;
  wsPongTimeoutMs: number;
}

function intFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: env.PORT === undefined ? 4020 : Number(env.PORT),
    host: env.HOST ?? '127.0.0.1',
    dbPath: env.DB_PATH ? resolve(env.DB_PATH) : resolve('data', 'pointshub.db'),
    logLevel: env.LOG_LEVEL ?? 'info',
    sqlLogging: env.DEBUG_SQL === '1' || env.DEBUG_SQL === 'true',
    partnerSecrets: {
      partner_demo: env.PARTNER_DEMO_SECRET ?? 'pd_dev_secret_2b7e151628aed2a6',
    },
    wsPingIntervalMs: intFromEnv(env.WS_PING_INTERVAL_MS, 20_000),
    wsPongTimeoutMs: intFromEnv(env.WS_PONG_TIMEOUT_MS, 45_000),
  };
}
