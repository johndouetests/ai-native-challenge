import { createTestApp, TestApp } from './helpers/app';

describe('accounts', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('returns the balance of the current user', async () => {
    const res = await t.http.get('/v1/accounts/u_1/balance').set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u_1');
    expect(Number.isInteger(res.body.balance)).toBe(true);
    expect(typeof res.body.updatedAt).toBe('string');
  });

  it('lets the admin read any balance', async () => {
    const res = await t.http.get('/v1/accounts/u_3/balance').set('Authorization', t.auth('u_admin'));
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(5000);
  });

  it('returns the first ledger page with a cursor', async () => {
    const res = await t.http.get('/v1/accounts/u_1/ledger').set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(20);
    expect(typeof res.body.nextCursor).toBe('string');
    const balance = await t.http.get('/v1/accounts/u_1/balance').set('Authorization', t.auth('u_1'));
    expect(res.body.items[0].balanceAfter).toBe(balance.body.balance);
  });

  it('returns the next page for a cursor', async () => {
    const first = await t.http.get('/v1/accounts/u_1/ledger?limit=5').set('Authorization', t.auth('u_1'));
    const second = await t.http
      .get(`/v1/accounts/u_1/ledger?limit=5&cursor=${first.body.nextCursor as string}`)
      .set('Authorization', t.auth('u_1'));
    expect(second.status).toBe(200);
    expect(second.body.items).toHaveLength(5);
    const ids = new Set([...first.body.items, ...second.body.items].map((e: { id: string }) => e.id));
    expect(ids.size).toBe(10);
  });

  it('filters the ledger by kind', async () => {
    const res = await t.http.get('/v1/accounts/u_1/ledger?kind=redeem&limit=10').set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items as Array<{ kind: string; rewardName: string | null }>) {
      expect(item.kind).toBe('redeem');
      expect(typeof item.rewardName).toBe('string');
    }
  });
});
