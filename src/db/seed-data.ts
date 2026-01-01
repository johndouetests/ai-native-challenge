import { createHash } from 'node:crypto';
import { purchasePoints, type Tier } from '../lib/points';
import type { LedgerKind, LedgerRefType, RedemptionStatus, Role } from './entities';
import { formatLedgerId } from './id-generator';

/** Development credentials. They exist only in the local seed. */
export const DEV_TOKENS = {
  u_1: 'pts_dev_u1',
  u_2: 'pts_dev_u2',
  u_3: 'pts_dev_u3',
  u_4: 'pts_dev_u4',
  u_5: 'pts_dev_u5',
  u_admin: 'pts_dev_admin',
  u_orphan: 'pts_dev_orphan',
} as const;

export type DevUserId = keyof typeof DEV_TOKENS;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface SeedUser {
  id: DevUserId;
  email: string;
  displayName: string;
  role: Role;
  tier: Tier;
  hasAccount: boolean;
}

const USERS: SeedUser[] = [
  { id: 'u_1', email: 'ana.novak@pointshub.test', displayName: 'Ana Novak', role: 'user', tier: 'silver', hasAccount: true },
  { id: 'u_2', email: 'ben.okafor@pointshub.test', displayName: 'Ben Okafor', role: 'user', tier: 'bronze', hasAccount: true },
  { id: 'u_3', email: 'cleo.marsh@pointshub.test', displayName: 'Cleo Marsh', role: 'user', tier: 'gold', hasAccount: true },
  { id: 'u_4', email: 'dan.reyes@pointshub.test', displayName: 'Dan Reyes', role: 'user', tier: 'bronze', hasAccount: true },
  { id: 'u_5', email: 'eva.lind@pointshub.test', displayName: 'Eva Lind', role: 'user', tier: 'silver', hasAccount: true },
  { id: 'u_admin', email: 'ops@pointshub.test', displayName: 'Operations', role: 'admin', tier: 'gold', hasAccount: true },
  // Simulates damaged data: a user without an accounts row.
  { id: 'u_orphan', email: 'orphan@pointshub.test', displayName: 'Orphan Profile', role: 'user', tier: 'bronze', hasAccount: false },
];

export const SEED_REWARDS = [
  { id: 'rw_1', name: 'Coffee voucher', costPoints: 300, stock: 100, active: true },
  { id: 'rw_2', name: 'Cinema ticket', costPoints: 1200, stock: 40, active: true },
  { id: 'rw_3', name: 'Wireless earbuds', costPoints: 6000, stock: 5, active: true },
  { id: 'rw_4', name: 'Limited art print', costPoints: 500, stock: 1, active: true },
  { id: 'rw_5', name: 'Gift card', costPoints: 2500, stock: 20, active: true },
  { id: 'rw_6', name: 'Classic mug', costPoints: 200, stock: 25, active: false },
];

export interface SeedLedgerRow {
  id: string;
  accountId: string;
  kind: LedgerKind;
  points: number;
  balanceAfter: number;
  refType: LedgerRefType;
  refId: string;
  createdAt: string;
}

export interface SeedData {
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    role: Role;
    tier: Tier;
    tokenHash: string;
    createdAt: string;
  }>;
  accounts: Array<{ userId: string; balance: number; updatedAt: string }>;
  ledger: SeedLedgerRow[];
  rewards: typeof SEED_REWARDS;
  redemptions: Array<{
    id: string;
    userId: string;
    rewardId: string;
    points: number;
    status: RedemptionStatus;
    createdAt: string;
    updatedAt: string;
  }>;
  transfers: Array<{ id: string; fromUserId: string; toUserId: string; points: number; createdAt: string }>;
}

/** Small deterministic PRNG (mulberry32) so every seed is identical. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3_600_000;

export function buildSeedData(): SeedData {
  const rand = prng(20260105);
  const pick = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  const balances = new Map<string, number>();
  const lastActivity = new Map<string, string>();
  const pending: Array<Omit<SeedLedgerRow, 'id'>> = [];
  const redemptions: SeedData['redemptions'] = [];
  const transfers: SeedData['transfers'] = [];
  let orderNo = 1000;

  const post = (accountId: string, kind: LedgerKind, points: number, refType: LedgerRefType, refId: string, at: Date) => {
    const balanceAfter = (balances.get(accountId) ?? 0) + points;
    if (balanceAfter < 0) throw new Error(`seed would overdraw ${accountId}`);
    balances.set(accountId, balanceAfter);
    const createdAt = at.toISOString();
    lastActivity.set(accountId, createdAt);
    pending.push({ accountId, kind, points, balanceAfter, refType, refId, createdAt });
  };

  const redeem = (userId: string, rewardId: string, status: RedemptionStatus, at: Date, closedAt?: Date) => {
    const reward = SEED_REWARDS.find((r) => r.id === rewardId)!;
    const id = `rd_${redemptions.length + 1}`;
    redemptions.push({
      id,
      userId,
      rewardId,
      points: reward.costPoints,
      status,
      createdAt: at.toISOString(),
      updatedAt: (closedAt ?? at).toISOString(),
    });
    post(userId, 'redeem', -reward.costPoints, 'redemption', id, at);
    if (status === 'cancelled') {
      post(userId, 'reversal', reward.costPoints, 'redemption', id, closedAt ?? at);
    }
  };

  const transfer = (from: string, to: string, points: number, at: Date) => {
    const id = `tr_${transfers.length + 1}`;
    transfers.push({ id, fromUserId: from, toUserId: to, points, createdAt: at.toISOString() });
    post(from, 'transfer_out', -points, 'transfer', id, at);
    post(to, 'transfer_in', points, 'transfer', id, at);
  };

  // Other accounts.
  post('u_5', 'earn', 4000, 'promo', 'cmp_welcome', new Date('2026-01-02T10:00:00.000Z'));
  post('u_2', 'earn', purchasePoints(150_000, 'bronze'), 'purchase', 'ord_0901', new Date('2026-01-10T15:20:00.000Z'));
  redeem('u_2', 'rw_1', 'pending', new Date('2026-02-01T11:00:00.000Z'));
  post('u_3', 'earn', 3000, 'promo', 'cmp_gold_launch', new Date('2026-01-12T09:00:00.000Z'));
  post('u_3', 'earn', purchasePoints(133_334, 'gold'), 'purchase', 'ord_0902', new Date('2026-01-12T18:45:00.000Z'));
  post('u_4', 'earn', 50, 'promo', 'cmp_welcome', new Date('2026-01-15T08:00:00.000Z'));
  lastActivity.set('u_admin', '2026-01-01T00:00:00.000Z');
  balances.set('u_admin', 0);

  // u_1: about 200 entries.
  let u1Count = 0;
  let redemptionNo = 0;
  let pendingLeft = 3;
  const u1Step = (at: Date) => {
    const roll = rand();
    const balance = balances.get('u_1') ?? 0;
    const affordable = ['rw_1', 'rw_2', 'rw_5', 'rw_6'].filter(
      (id) => SEED_REWARDS.find((r) => r.id === id)!.costPoints <= balance,
    );
    if (roll < 0.17 && affordable.length > 0 && u1Count < 198) {
      const rewardId = affordable[pick(0, affordable.length - 1)];
      redemptionNo += 1;
      let status: RedemptionStatus = 'fulfilled';
      if (redemptionNo % 5 === 3) status = 'cancelled';
      else if (redemptionNo % 7 === 5 && pendingLeft > 0) {
        status = 'pending';
        pendingLeft -= 1;
      }
      const closedAt = new Date(at.getTime() + 2 * HOUR);
      redeem('u_1', rewardId, status, at, closedAt);
      u1Count += status === 'cancelled' ? 2 : 1;
    } else if (roll < 0.25 && transfers.length < 8) {
      transfer('u_5', 'u_1', pick(5, 30) * 5, at);
      u1Count += 1;
    } else if (roll < 0.4) {
      post('u_1', 'earn', rand() < 0.5 ? 50 : 100, 'promo', `cmp_${pick(1, 9)}`, at);
      u1Count += 1;
    } else {
      orderNo += 1;
      post('u_1', 'earn', purchasePoints(pick(500, 40_000), 'silver'), 'purchase', `ord_${orderNo}`, at);
      u1Count += 1;
    }
  };

  let t = new Date('2026-01-05T08:15:00.000Z').getTime();
  while (u1Count < 100) {
    u1Step(new Date(t));
    t += 9 * HOUR;
  }
  // 35 entries sharing one timestamp (bulk promo import).
  const bulkAt = new Date('2026-02-14T12:00:00.000Z');
  for (let i = 1; i <= 35; i += 1) {
    post('u_1', 'earn', 10, 'promo', `cmp_bulk_${String(i).padStart(2, '0')}`, bulkAt);
    u1Count += 1;
  }
  t = new Date('2026-02-15T06:40:00.000Z').getTime();
  while (u1Count < 190) {
    u1Step(new Date(t));
    t += 7 * HOUR;
  }
  // Entries around UTC (and local) day boundaries of 2026-03-09.
  const boundary = [
    '2026-03-08T07:30:00.000Z',
    '2026-03-08T23:59:59.999Z',
    '2026-03-09T00:00:00.000Z',
    '2026-03-09T06:30:00.000Z',
    '2026-03-09T07:30:00.000Z',
    '2026-03-09T12:00:00.000Z',
    '2026-03-09T22:30:00.000Z',
    '2026-03-09T23:59:59.999Z',
    '2026-03-10T00:00:00.000Z',
    '2026-03-10T08:00:00.000Z',
  ];
  boundary.forEach((iso, i) => {
    orderNo += 1;
    post('u_1', 'earn', 20 + i, 'purchase', `ord_${orderNo}`, new Date(iso));
  });

  // Global ids follow (created_at, generation order).
  const ordered = pending
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.createdAt === b.row.createdAt ? a.index - b.index : a.row.createdAt < b.row.createdAt ? -1 : 1));
  const ledger: SeedLedgerRow[] = ordered.map(({ row }, i) => ({ id: formatLedgerId(i + 1), ...row }));

  const users = USERS.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    tier: u.tier,
    tokenHash: hashToken(DEV_TOKENS[u.id]),
    createdAt: '2025-12-01T09:00:00.000Z',
  }));
  const accounts = USERS.filter((u) => u.hasAccount).map((u) => ({
    userId: u.id,
    balance: balances.get(u.id) ?? 0,
    updatedAt: lastActivity.get(u.id) ?? '2026-01-01T00:00:00.000Z',
  }));

  return { users, accounts, ledger, rewards: SEED_REWARDS, redemptions, transfers };
}
