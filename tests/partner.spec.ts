import { createTestApp, expectSuccess, TestApp } from './helpers/app';

describe('partner events', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('credits a signed partner purchase', async () => {
    const body = JSON.stringify({ eventId: 'evt_1001', userId: 'u_2', amountMinor: 25_000 });
    const res = await t.http.post('/v1/partner/events').set(t.signPartner(body)).send(body);
    expectSuccess(res);
    expect(res.body.status).toBe('credited');
    const balance = await t.http.get('/v1/accounts/u_2/balance').set('Authorization', t.auth('u_2'));
    expect(balance.body.balance).toBe(1450);
  });

  it('records the partner reference in the ledger', async () => {
    const res = await t.http.get('/v1/accounts/u_2/ledger?limit=1').set('Authorization', t.auth('u_2'));
    expect(res.body.items[0]).toMatchObject({ kind: 'earn', points: 250, refType: 'partner' });
  });
});
