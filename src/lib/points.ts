export type Tier = 'bronze' | 'silver' | 'gold';

/** Tier multipliers in basis points of a point per currency unit (10000 = 1 point per 100 minor units). */
export const TIER_BASIS_POINTS: Record<Tier, number> = {
  bronze: 10_000,
  silver: 12_500,
  gold: 15_000,
};

export const DAILY_EARN_CAP = 5_000;

const DIVISOR = 1_000_000;

/** floor(amountMinor * tierBp / 1_000_000), computed with integers only. */
export function purchasePoints(amountMinor: number, tier: Tier): number {
  const product = amountMinor * TIER_BASIS_POINTS[tier];
  return (product - (product % DIVISOR)) / DIVISOR;
}
