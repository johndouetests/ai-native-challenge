import { createTestApp, expectSuccess, TestApp } from './helpers/app';

describe('earn', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('credits promo points', async () => {
    const res = await t.http
      .post('/v1/accounts/u_4/earn')
      .set('Authorization', t.auth('u_admin'))
      .set('Idempotency-Key', t.key())
      .send({ type: 'promo', points: 150, campaignId: 'cmp_spring' });
    expectSuccess(res);
    expect(res.body.entry).toMatchObject({ accountId: 'u_4', kind: 'earn', points: 150, refType: 'promo' });
    expect(res.body.balance).toBe(200);
  });

  it('credits purchase points by tier', async () => {
    const bronze = await t.http
      .post('/v1/accounts/u_2/earn')
      .set('Authorization', t.auth('u_admin'))
      .set('Idempotency-Key', t.key())
      .send({ type: 'purchase', amountMinor: 10_000, orderId: 'ord_a1' });
    expectSuccess(bronze);
    expect(bronze.body.entry.points).toBe(100);

    const gold = await t.http
      .post('/v1/accounts/u_3/earn')
      .set('Authorization', t.auth('u_admin'))
      .set('Idempotency-Key', t.key())
      .send({ type: 'purchase', amountMinor: 10_000, orderId: 'ord_a2' });
    expectSuccess(gold);
    expect(gold.body.entry.points).toBe(150);
  });

  it('replays a repeated request with the same key', async () => {
    const key = t.key();
    const send = () =>
      t.http
        .post('/v1/accounts/u_5/earn')
        .set('Authorization', t.auth('u_admin'))
        .set('Idempotency-Key', key)
        .send({ type: 'promo', points: 40, campaignId: 'cmp_replay' });
    const first = await send();
    const second = await send();
    expectSuccess(second);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body).toEqual(first.body);
  });

  it('adds the entry to the ledger', async () => {
    const res = await t.http.get('/v1/accounts/u_4/ledger?limit=1').set('Authorization', t.auth('u_4'));
    expect(res.body.items[0]).toMatchObject({ kind: 'earn', points: 150 });
  });
});
