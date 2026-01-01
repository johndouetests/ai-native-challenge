import { createHmac, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Errors } from '../common/api.exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';

export const TIMESTAMP_TOLERANCE_SECONDS = 300;

export type PartnerRequest = RawBodyRequest<FastifyRequest> & { partnerId?: string };

function header(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function signPartnerPayload(secret: string, timestamp: string, rawBody: Buffer | string): string {
  return createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
}

/**
 * Verifies `X-Signature = hex(HMAC-SHA256(secret, X-Timestamp + "." + rawBody))`
 * over the exact bytes received, then checks the timestamp window.
 */
@Injectable()
export class PartnerSignatureGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PartnerRequest>();
    const partnerId = header(request, 'x-partner-id');
    const timestamp = header(request, 'x-timestamp');
    const signature = header(request, 'x-signature');
    const secret = partnerId ? this.config.partnerSecrets[partnerId] : undefined;
    if (!secret || !timestamp || !signature) throw Errors.unauthorized('Missing or unknown partner credentials');

    const expected = Buffer.from(signPartnerPayload(secret, timestamp, JSON.stringify(request.body)), 'hex');
    const provided = /^[0-9a-f]{64}$/i.test(signature) ? Buffer.from(signature, 'hex') : Buffer.alloc(0);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw Errors.unauthorized('Invalid signature');
    }

    if (!/^\d{1,12}$/.test(timestamp)) throw Errors.staleTimestamp();

    request.partnerId = partnerId;
    return true;
  }
}
