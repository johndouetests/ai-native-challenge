import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'rewards' })
export class RewardEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'cost_points', type: 'integer' })
  costPoints!: number;

  @Column({ type: 'integer' })
  stock!: number;

  @Column({ type: 'boolean' })
  active!: boolean;
}
