import type { Params } from 'nestjs-pino';
import type { AppConfig } from '../config/app-config';

/** Secrets and personal data never reach the logs. */
export const REDACTED_PATHS = [
  'req.headers.Authorization',
  'req.headers.cookie',
  'req.headers["x-signature"]',
  'req.query.token',
  'token',
  '*.token',
  'email',
  '*.email',
  'err.parameters',
  '*.parameters',
];

export function loggerOptions(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.logLevel,
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    },
  };
}
