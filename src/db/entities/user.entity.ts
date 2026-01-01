import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { Tier } from '../../lib/points';

export type Role = 'user' | 'admin';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ type: 'text' })
  role!: Role;

  @Column({ type: 'text' })
  tier!: Tier;

  @Column({ name: 'token_hash', type: 'text' })
  tokenHash!: string;

  @Column({ name: 'created_at', type: 'text' })
  createdAt!: string;
}
