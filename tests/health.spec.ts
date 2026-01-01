import { createTestApp, TestApp } from './helpers/app';

describe('health', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('reports status without authentication', async () => {
    const res = await t.http.get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.wsConnections).toBe('number');
  });
});
