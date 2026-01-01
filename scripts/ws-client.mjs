#!/usr/bin/env node
// Subscribes to balance updates and prints every frame.
//
//   node scripts/ws-client.mjs <token> [accountId ...]
//   node scripts/ws-client.mjs pts_dev_u1 u_1
//   WS_URL=ws://localhost:4020 node scripts/ws-client.mjs pts_dev_admin u_1 u_2
//
// Replies to server pings with pong. Pass --no-pong to stay silent.
import WebSocket from 'ws';

const args = process.argv.slice(2);
const noPong = args.includes('--no-pong');
const [token, ...accounts] = args.filter((a) => a !== '--no-pong');
if (!token) {
  console.error('usage: node scripts/ws-client.mjs <token> [accountId ...] [--no-pong]');
  process.exit(1);
}

const base = process.env.WS_URL ?? 'ws://localhost:4020';
const ws = new WebSocket(`${base}/v1/stream?token=${encodeURIComponent(token)}`);
const stamp = () => new Date().toISOString().slice(11, 23);

ws.on('open', () => {
  console.log(`${stamp()} connected`);
  for (const accountId of accounts) ws.send(JSON.stringify({ type: 'subscribe', accountId }));
});
ws.on('message', (data) => {
  const text = data.toString();
  console.log(`${stamp()} <- ${text}`);
  try {
    if (!noPong && JSON.parse(text).type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
  } catch {
    // ignore
  }
});
ws.on('close', (code, reason) => {
  console.log(`${stamp()} closed ${code} ${reason.toString()}`);
  process.exit(0);
});
ws.on('error', (error) => console.error(`${stamp()} error ${error.message}`));
process.on('SIGINT', () => ws.close());
