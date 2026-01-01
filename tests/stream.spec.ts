import WebSocket from 'ws';
import { createTestApp, expectSuccess, TestApp } from './helpers/app';

type Frame = { type: string; [key: string]: unknown };

function open(url: string): Promise<{ ws: WebSocket; next: (type: string) => Promise<Frame> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const frames: Frame[] = [];
    const waiters: Array<{ type: string; resolve: (f: Frame) => void }> = [];
    ws.on('message', (data: WebSocket.RawData) => {
      const frame = JSON.parse((data as Buffer).toString('utf8')) as Frame;
      const waiter = waiters.find((w) => w.type === frame.type);
      if (waiter) {
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(frame);
      } else {
        frames.push(frame);
      }
    });
    ws.on('open', () =>
      resolve({
        ws,
        next: (type) =>
          new Promise((res) => {
            const index = frames.findIndex((f) => f.type === type);
            if (index >= 0) res(frames.splice(index, 1)[0]);
            else waiters.push({ type, resolve: res });
          }),
      }),
    );
    ws.on('error', reject);
  });
}

describe('balance stream', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('subscribes to the own account', async () => {
    const client = await open(`${t.wsUrl}/v1/stream?token=${t.tokens.u_1}`);
    client.ws.send(JSON.stringify({ type: 'subscribe', accountId: 'u_1' }));
    expect(await client.next('subscribed')).toEqual({ type: 'subscribed', accountId: 'u_1' });
    client.ws.close();
  });

  it('counts open connections in /healthz', async () => {
    const client = await open(`${t.wsUrl}/v1/stream?token=${t.tokens.u_2}`);
    const res = await t.http.get('/healthz');
    expect(res.body.wsConnections).toBeGreaterThanOrEqual(1);
    client.ws.close();
  });

  it('pushes balance.updated after an earn', async () => {
    const client = await open(`${t.wsUrl}/v1/stream?token=${t.tokens.u_3}`);
    client.ws.send(JSON.stringify({ type: 'subscribe', accountId: 'u_3' }));
    await client.next('subscribed');
    const earn = await t.http
      .post('/v1/accounts/u_3/earn')
      .set('Authorization', t.auth('u_admin'))
      .set('Idempotency-Key', t.key())
      .send({ type: 'promo', points: 25, campaignId: 'cmp_stream' });
    expectSuccess(earn);
    const event = await client.next('balance.updated');
    expect(event).toMatchObject({ accountId: 'u_3', balance: 5025, entryId: earn.body.entry.id });
    expect(typeof event.seq).toBe('number');
    client.ws.close();
  });
});
