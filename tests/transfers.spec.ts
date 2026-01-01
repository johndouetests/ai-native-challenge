import { createTestApp, expectSuccess, TestApp } from './helpers/app';

describe('transfers', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('moves points between users', async () => {
    const res = await t.http
      .post('/v1/transfers')
      .set('Authorization', t.auth('u_3'))
      .set('Idempotency-Key', t.key())
      .send({ toUserId: 'u_4', points: 200 });
    expectSuccess(res);
    expect(res.body.transfer).toMatchObject({ fromUserId: 'u_3', toUserId: 'u_4', points: 200 });
    expect(res.body.balance).toBe(4800);
  });

  it('credits the receiver', async () => {
    const res = await t.http.get('/v1/accounts/u_4/balance').set('Authorization', t.auth('u_4'));
    expect(res.body.balance).toBe(250);
  });

  it('writes ledger entries on both sides', async () => {
    const out = await t.http.get('/v1/accounts/u_3/ledger?limit=1').set('Authorization', t.auth('u_3'));
    const inn = await t.http.get('/v1/accounts/u_4/ledger?limit=1').set('Authorization', t.auth('u_4'));
    expect(out.body.items[0]).toMatchObject({ kind: 'transfer_out', points: -200 });
    expect(inn.body.items[0]).toMatchObject({ kind: 'transfer_in', points: 200 });
  });
});
