# PointsHub

Challenge ID: be-A-86f15301-1237-4537-a3d1-41a13f938951

PointsHub is a small loyalty-points service. Users earn points for purchases and promotions,
spend them on rewards, transfer them to each other, and receive live balance updates over
WebSocket. Partners report purchases through a signed webhook.

The behaviour of the service is defined by [`SPEC.md`](SPEC.md) and [`openapi.yaml`](openapi.yaml).

**This repository is a hiring challenge.** Start with [`TASK.md`](TASK.md). How to hand in your
work is described in [`SUBMISSION.md`](SUBMISSION.md): please do not fork this repository and do not
open pull requests.

## Documentation

- [`TASK.md`](TASK.md) — what to do, rules and time limit.
- [`SPEC.md`](SPEC.md) — business rules with IDs (`BR-*`), data model and WebSocket protocol.
- [`openapi.yaml`](openapi.yaml) — HTTP API, schemas and error codes.
- [`requests.http`](requests.http) — example requests.
- [`SUBMISSION.md`](SUBMISSION.md) — how to hand in your work; `BUGS.md`, `AGENT_PROMPTS.md` and
  `NOTES.md` are the templates you fill in.

## Requirements

- Node.js 22 (see `.nvmrc`)
- Nothing else: the database is a local SQLite file, no Docker needed.

## Run

```bash
npm install
npm run dev
```

The service listens on <http://localhost:4020>. On first start it creates `data/pointshub.db`
and fills it with deterministic seed data. To start over with a fresh database:

```bash
npm run db:reset && npm run dev
```

Production-style run:

```bash
npm run build
npm start
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with auto-reload (port 4020) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled app |
| `npm test` | Run the test suite (Jest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Delete the local database (it is re-created and re-seeded on next start) |
| `npm run submit:pack` | Build the submission archive (see `SUBMISSION.md`) |

## Dev credentials

All requests except `GET /healthz` and `POST /v1/partner/events` need
`Authorization: Bearer <token>`.

| User | Token | Role | Tier | Notes |
| --- | --- | --- | --- | --- |
| `u_1` | `pts_dev_u1` | user | silver | ~200 ledger entries, pending redemptions `rd_6`, `rd_13`, `rd_20` |
| `u_2` | `pts_dev_u2` | user | bronze | pending redemption `rd_1` |
| `u_3` | `pts_dev_u3` | user | gold | balance 5000 |
| `u_4` | `pts_dev_u4` | user | bronze | balance 50 |
| `u_5` | `pts_dev_u5` | user | silver | |
| `u_admin` | `pts_dev_admin` | admin | gold | |
| `u_orphan` | `pts_dev_orphan` | user | bronze | has a profile but no points account |

Partner webhook: partner id `partner_demo`, secret `pd_dev_secret_2b7e151628aed2a6`.

These are development-only values that exist only in the local seed.

### Seed data

- Rewards `rw_1`..`rw_6`. `rw_4` "Limited art print" has stock 1; `rw_6` "Classic mug" is inactive.
- `u_1`'s ledger spans 2026-01-05..2026-03-10, including 35 entries sharing the timestamp
  `2026-02-14T12:00:00.000Z` and entries right at the UTC day boundaries of 2026-03-09.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4020` | HTTP / WebSocket port |
| `HOST` | `127.0.0.1` | Bind address |
| `DB_PATH` | `data/pointshub.db` | SQLite file; created and seeded if empty |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `silent` |
| `POINTSHUB_NOW` | (unset) | Freeze the service clock at an ISO 8601 instant, e.g. `2026-04-01T23:59:30Z` |
| `DEBUG_SQL` | (unset) | `1`: log every SQL statement and add `X-Sql-Queries: <n>` to each response |
| `PARTNER_DEMO_SECRET` | see above | HMAC secret of `partner_demo` |
| `WS_PING_INTERVAL_MS` | `20000` | WebSocket ping interval |
| `WS_PONG_TIMEOUT_MS` | `45000` | Close a WebSocket after this long without `pong` |

### Testing time-dependent behaviour

All business time (entry timestamps, the daily earn limit, the partner timestamp window) comes from
`src/lib/clock.ts`. Set `POINTSHUB_NOW` to test day boundaries without waiting for midnight:

```bash
POINTSHUB_NOW=2026-04-01T23:59:30Z npm run dev
```

The service must behave the same for any process time zone, so also try e.g.
`TZ=America/Los_Angeles npm run dev`.

### Counting SQL statements

```bash
DEBUG_SQL=1 npm run dev
curl -si -H 'Authorization: Bearer pts_dev_u1' 'http://localhost:4020/v1/accounts/u_1/ledger?limit=50' | grep -i x-sql-queries
```

## Tools

- `requests.http`: example requests for the VS Code REST Client or JetBrains HTTP Client.
- `node scripts/ws-client.mjs <token> [accountId ...]`: subscribe to balance updates and print frames,
  e.g. `node scripts/ws-client.mjs pts_dev_u1 u_1`.
- `node scripts/load.mjs ...`: fire N parallel requests and summarise the responses
  (see the header of the file for options), e.g.

  ```bash
  node scripts/load.mjs --path /v1/redemptions --token pts_dev_u3 \
    --body '{"rewardId":"rw_1"}' --n 20 --watch u_3
  ```

## Tests

`npm test` runs the Jest suite in `tests/`. `tests/helpers/app.ts` starts the app on a temporary,
freshly seeded database and a random port and returns the dev tokens:

```ts
const t = await createTestApp();
const res = await t.http.get('/v1/me').set('Authorization', t.auth('u_1'));
await t.close();
```

Put your own tests in `tests/candidate/`.

## Project layout

```text
src/
  main.ts, app.ts, app.module.ts   bootstrap (NestJS + Fastify)
  config/                          environment configuration
  common/                          error format, validation, logger options
  lib/                             clock, points formula, anti-fraud check, helpers
  db/                              entities, migration, seed, transaction runner
  auth/                            bearer-token guard, ownership checks
  users/ accounts/ rewards/ redemptions/ transfers/ partner/   feature modules
  idempotency/                     Idempotency-Key handling
  stream/                          WebSocket /v1/stream
  health/                          GET /healthz
tests/                             Jest tests (tests/candidate/ is yours)
scripts/                           ws-client.mjs, load.mjs, pack.mjs (submission archive)
```
