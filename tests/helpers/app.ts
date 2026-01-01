import { createHmac, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createApp } from '../../src/app';
import { AppConfig, loadConfig } from '../../src/config/app-config';
import { DEV_TOKENS } from '../../src/db/seed-data';

export type Tokens = typeof DEV_TOKENS;

export interface TestApp {
  app: NestFastifyApplication;
  /** supertest client bound to the running server */
  http: ReturnType<typeof request>;
  baseUrl: string;
  wsUrl: string;
  tokens: Tokens;
  partner: { id: string; secret: string };
  /** `Authorization` header value for a seeded user */
  auth(userId: keyof Tokens): string;
  /** A fresh Idempotency-Key */
  key(): string;
  /** Headers for a signed partner webhook */
  signPartner(rawBody: string, timestamp?: number): Record<string, string>;
  close(): Promise<void>;
}

/**
 * Starts PointsHub on a temporary, freshly seeded database and a random port.
 * Pass `overrides` to change configuration (for example short WebSocket heartbeats).
 */
export async function createTestApp(overrides: Partial<AppConfig> = {}): Promise<TestApp> {
  const dir = mkdtempSync(join(tmpdir(), 'pointshub-test-'));
  const config: AppConfig = {
    ...loadConfig(),
    dbPath: join(dir, 'test.db'),
    port: 0,
    host: '127.0.0.1',
    logLevel: 'silent',
    ...overrides,
  };
  const app = await createApp(config);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const partner = { id: 'partner_demo', secret: config.partnerSecrets.partner_demo };

  return {
    app,
    http: request(baseUrl),
    baseUrl,
    wsUrl: `ws://127.0.0.1:${port}`,
    tokens: DEV_TOKENS,
    partner,
    auth: (userId) => `Bearer ${DEV_TOKENS[userId]}`,
    key: () => `test-${randomUUID()}`,
    signPartner(rawBody, timestamp = Math.floor(Date.now() / 1000)) {
      const ts = String(timestamp);
      const signature = createHmac('sha256', partner.secret).update(`${ts}.${rawBody}`).digest('hex');
      return {
        'content-type': 'application/json',
        'x-partner-id': partner.id,
        'x-timestamp': ts,
        'x-signature': signature,
      };
    },
    async close() {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Asserts a 2xx response. */
export function expectSuccess(res: { status: number; text: string }): void {
  if (res.status < 200 || res.status > 299) {
    throw new Error(`expected 2xx, got ${res.status}: ${res.text}`);
  }
}
