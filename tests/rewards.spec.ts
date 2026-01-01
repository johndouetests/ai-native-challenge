import { createTestApp, TestApp } from './helpers/app';

describe('rewards', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('lists rewards with stock', async () => {
    const res = await t.http.get('/v1/rewards').set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(6);
    expect(res.body.items[0]).toEqual({ id: 'rw_1', name: 'Coffee voucher', costPoints: 300, stock: 100, active: true });
  });
});
