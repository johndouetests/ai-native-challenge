import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Errors } from '../common/api.exception';

const KEY_PATTERN = /^[A-Za-z0-9._:-]{1,255}$/;

/** Reads the mandatory `Idempotency-Key` header. */
export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<FastifyRequest>();
  const raw = request.headers['idempotency-key'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') throw Errors.idempotencyKeyRequired();
  if (!KEY_PATTERN.test(value)) {
    throw Errors.invalidBody('Invalid Idempotency-Key header', [
      { field: 'Idempotency-Key', messages: ['must be 1-255 characters of A-Z a-z 0-9 . _ : -'] },
    ]);
  }
  return value;
});
