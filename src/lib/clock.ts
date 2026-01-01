/**
 * Single source of "current time" for business logic.
 *
 * Set POINTSHUB_NOW to an ISO 8601 timestamp (for example 2026-04-01T23:59:30Z)
 * to freeze the clock. Useful for testing UTC day boundaries.
 */
export function now(): Date {
  const frozen = process.env.POINTSHUB_NOW;
  if (frozen) {
    const parsed = new Date(frozen);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`POINTSHUB_NOW is not a valid ISO date: ${frozen}`);
    }
    return parsed;
  }
  return new Date();
}

export function nowIso(): string {
  return now().toISOString();
}

export function nowUnixSeconds(): number {
  return Math.floor(now().getTime() / 1000);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start (inclusive) and end (exclusive) of the UTC calendar day containing `at`. */
export function utcDayBounds(at: Date): { start: string; end: string } {
  const start = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + DAY_MS).toISOString(),
  };
}
