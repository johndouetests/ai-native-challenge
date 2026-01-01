#!/usr/bin/env node
// Fires N identical requests in parallel and summarises the responses.
// Useful for reproducing concurrency problems.
//
//   node scripts/load.mjs --path /v1/transfers --token pts_dev_u4 \
//     --body '{"toUserId":"u_5","points":10}' --n 20 --watch u_4,u_5
//
// Options:
//   --method POST            HTTP method (default POST)
//   --path <path>            request path (required)
//   --token <token>          bearer token
//   --body <json>            request body
//   --n <count>              number of parallel requests (default 10)
//   --same-key               use one Idempotency-Key for all requests (default: one key each)
//   --partner                sign the body as partner_demo (POST /v1/partner/events)
//   --watch u_1,u_2          print these balances before and after (uses the admin token)
//   BASE_URL=http://localhost:4020, ADMIN_TOKEN=pts_dev_admin, PARTNER_SECRET=...
import { createHmac, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    method: { type: 'string', default: 'POST' },
    path: { type: 'string' },
    token: { type: 'string' },
    body: { type: 'string' },
    n: { type: 'string', default: '10' },
    'same-key': { type: 'boolean', default: false },
    partner: { type: 'boolean', default: false },
    watch: { type: 'string' },
  },
});
if (!values.path) {
  console.error('--path is required (see the header of this file)');
  process.exit(1);
}

const base = process.env.BASE_URL ?? 'http://localhost:4020';
const adminToken = process.env.ADMIN_TOKEN ?? 'pts_dev_admin';
const partnerSecret = process.env.PARTNER_SECRET ?? 'pd_dev_secret_2b7e151628aed2a6';
const n = Number(values.n);
const sharedKey = randomUUID();
const watch = values.watch ? values.watch.split(',') : [];

async function balances() {
  const result = {};
  for (const userId of watch) {
    const res = await fetch(`${base}/v1/accounts/${userId}/balance`, { headers: { authorization: `Bearer ${adminToken}` } });
    result[userId] = res.ok ? (await res.json()).balance : `HTTP ${res.status}`;
  }
  return result;
}

function headers() {
  const h = { 'idempotency-key': values['same-key'] ? sharedKey : randomUUID() };
  if (values.body !== undefined) h['content-type'] = 'application/json';
  if (values.token) h.authorization = `Bearer ${values.token}`;
  if (values.partner) {
    const ts = String(Math.floor(Date.now() / 1000));
    h['x-partner-id'] = 'partner_demo';
    h['x-timestamp'] = ts;
    h['x-signature'] = createHmac('sha256', partnerSecret).update(`${ts}.${values.body ?? ''}`).digest('hex');
  }
  return h;
}

if (watch.length) console.log('before', await balances());
const started = Date.now();
const responses = await Promise.all(
  Array.from({ length: n }, async () => {
    const res = await fetch(`${base}${values.path}`, { method: values.method, headers: headers(), body: values.body });
    return { status: res.status, replayed: res.headers.get('idempotent-replayed'), body: await res.text() };
  }),
);
console.log(`${n} requests in ${Date.now() - started} ms`);

const byStatus = new Map();
for (const r of responses) {
  const label = `${r.status}${r.replayed ? ' (replayed)' : ''}`;
  if (!byStatus.has(label)) byStatus.set(label, []);
  byStatus.get(label).push(r.body);
}
for (const [label, bodies] of byStatus) {
  console.log(`\n${label}: ${bodies.length}x`);
  console.log(`  e.g. ${bodies[0].slice(0, 300)}`);
}
if (watch.length) console.log('\nafter', await balances());
