import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'idempotency_keys' })
export class IdempotencyKeyEntity {
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId!: string;

  @PrimaryColumn({ type: 'text' })
  method!: string;

  @PrimaryColumn({ type: 'text' })
  path!: string;

  @PrimaryColumn({ type: 'text' })
  key!: string;

  @Column({ name: 'request_hash', type: 'text' })
  requestHash!: string;

  @Column({ name: 'response_status', type: 'integer' })
  responseStatus!: number;

  /** JSON-encoded response body. */
  @Column({ name: 'response_body', type: 'text' })
  responseBody!: string;

  @Column({ name: 'created_at', type: 'text' })
  createdAt!: string;
}
