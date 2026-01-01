import { createTestApp, TestApp } from './helpers/app';

describe('profile', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('returns the current user', async () => {
    const res = await t.http.get('/v1/me').set('Authorization', t.auth('u_1'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'u_1', displayName: 'Ana Novak', role: 'user', tier: 'silver' });
  });

  it('returns the admin profile', async () => {
    const res = await t.http.get('/v1/me').set('Authorization', t.auth('u_admin'));
    expect(res.body.role).toBe('admin');
  });

  it('updates the display name', async () => {
    const res = await t.http.patch('/v1/me').set('Authorization', t.auth('u_2')).send({ displayName: 'Ben O.' });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Ben O.');
    const again = await t.http.get('/v1/me').set('Authorization', t.auth('u_2'));
    expect(again.body.displayName).toBe('Ben O.');
  });
});
