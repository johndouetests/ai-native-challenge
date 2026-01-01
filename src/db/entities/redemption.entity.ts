import { Column, Entity, PrimaryColumn } from 'typeorm';

export type RedemptionStatus = 'pending' | 'fulfilled' | 'cancelled';

@Entity({ name: 'redemptions' })
export class RedemptionEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ name: 'reward_id', type: 'text' })
  rewardId!: string;

  @Column({ type: 'integer' })
  points!: number;

  @Column({ type: 'text' })
  status!: RedemptionStatus;

  @Column({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'text' })
  updatedAt!: string;
}
