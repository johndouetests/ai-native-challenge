import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { EntityManager, Repository } from 'typeorm';
import { Errors } from '../common/api.exception';
import { IdempotencyKeyEntity } from '../db/entities';
import { nowIso } from '../lib/clock';
import { canonicalJson, sha256Hex } from '../lib/json';

export interface IdempotencyScope {
  userId: string;
  method: string;
  path: string;
  key: string;
  requestHash: string;
}

/** Stores the response of an operation inside the operation's own transaction. */
export interface IdempotencyRecorder {
  record(manager: EntityManager, status: number, body: unknown): Promise<void>;
}

export const REPLAY_HEADER = 'Idempotent-Replayed';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private readonly keys: Repository<IdempotencyKeyEntity>,
  ) {}

  scope(userId: string, request: FastifyRequest, key: string, body: unknown): IdempotencyScope {
    return {
      userId,
      method: request.method.toUpperCase(),
      path: request.url.split('?')[0],
      key,
      requestHash: sha256Hex(canonicalJson(body ?? null)),
    };
  }

  /**
   * Executes `operation` at most once per (user, method, path, key).
   * A completed key replays the stored response; a key that is still running gives 409.
   */
  async execute<T>(
    scope: IdempotencyScope,
    reply: FastifyReply,
    operation: (recorder: IdempotencyRecorder) => Promise<T>,
  ): Promise<unknown> {
    const stored = await this.find(scope);
    if (stored) return this.replay(stored, scope, reply);

    return operation(this.recorder(scope));
  }

  private recorder(scope: IdempotencyScope): IdempotencyRecorder {
    return {
      record: async (manager, status, body) => {
        await manager.save(IdempotencyKeyEntity, {
          ...this.where(scope),
          requestHash: scope.requestHash,
          responseStatus: status,
          responseBody: JSON.stringify(body),
          createdAt: nowIso(),
        });
      },
    };
  }

  private find(scope: IdempotencyScope): Promise<IdempotencyKeyEntity | null> {
    return this.keys.findOneBy(this.where(scope));
  }

  private replay(stored: IdempotencyKeyEntity, scope: IdempotencyScope, reply: FastifyReply): unknown {
    if (stored.requestHash !== scope.requestHash) throw Errors.idempotencyKeyReuse();
    void reply.status(stored.responseStatus).header(REPLAY_HEADER, 'true');
    return JSON.parse(stored.responseBody) as unknown;
  }

  private where(scope: IdempotencyScope) {
    return { userId: scope.userId, method: scope.method, path: scope.path, key: scope.key };
  }
}
