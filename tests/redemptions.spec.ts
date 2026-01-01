import { createTestApp, expectSuccess, TestApp } from './helpers/app';

describe('redemptions', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  async function redeem(rewardId: string) {
    return t.http
      .post('/v1/redemptions')
      .set('Authorization', t.auth('u_1'))
      .set('Idempotency-Key', t.key())
      .send({ rewardId });
  }

  it('redeems a reward and charges points', async () => {
    const before = await t.http.get('/v1/accounts/u_1/balance').set('Authorization', t.auth('u_1'));
    const res = await redeem('rw_1');
    expectSuccess(res);
    expect(res.body.redemption).toMatchObject({ userId: 'u_1', rewardId: 'rw_1', points: 300, status: 'pending' });
    expect(res.body.balance).toBe(before.body.balance - 300);
  });

  it('reduces the reward stock', async () => {
    const res = await t.http.get('/v1/rewards').set('Authorization', t.auth('u_1'));
    const coffee = (res.body.items as Array<{ id: string; stock: number }>).find((r) => r.id === 'rw_1');
    expect(coffee?.stock).toBe(99);
  });

  it('reads an own redemption', async () => {
    const created = await redeem('rw_1');
    const res = await t.http.get(`/v1/redemptions/${created.body.redemption.id as string}`).set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body.redemption.id).toBe(created.body.redemption.id);
  });

  it('cancels a pending redemption', async () => {
    const created = await redeem('rw_2');
    const res = await t.http
      .post(`/v1/redemptions/${created.body.redemption.id as string}/cancel`)
      .set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body.redemption.status).toBe('cancelled');
  });

  it('lets the admin fulfill a pending redemption', async () => {
    const created = await redeem('rw_1');
    const res = await t.http
      .post(`/v1/redemptions/${created.body.redemption.id as string}/fulfill`)
      .set('Authorization', t.auth('u_admin'));
    expect(res.status).toBe(200);
    expect(res.body.redemption.status).toBe('fulfilled');
  });

  it('shows the reward name in the ledger', async () => {
    const res = await t.http.get('/v1/accounts/u_1/ledger?kind=redeem&limit=1').set('Authorization', t.auth('u_1'));
    expect(res.body.items[0].rewardName).toBe('Coffee voucher');
  });
});
