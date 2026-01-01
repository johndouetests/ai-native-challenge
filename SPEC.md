# PointsHub specification

Challenge ID: be-A-86f15301-1237-4537-a3d1-41a13f938951

PointsHub is a loyalty-points service: points are earned for purchases and promotions, spent on
rewards, transferred between users, reported by partners through a signed webhook, and pushed to
clients as balance updates over WebSocket. The HTTP contract is in [`openapi.yaml`](openapi.yaml);
this document lists the rules the implementation must follow. Requirement IDs (`BR-*`) are stable,
refer to them when you report a problem.

## 1. Data model

| Table | Columns |
| --- | --- |
| `users` | `id`, `email`, `display_name`, `role` (user or admin), `tier` (bronze, silver, gold), `token_hash`, `created_at` |
| `accounts` | `user_id` (key), `balance` (integer, cached sum of the ledger), `updated_at` |
| `ledger_entries` | `id`, `account_id`, `kind` (earn, redeem, transfer_in, transfer_out, reversal), `points` (signed integer), `balance_after`, `ref_type`, `ref_id`, `created_at` |
| `rewards` | `id`, `name`, `cost_points`, `stock`, `active` |
| `redemptions` | `id`, `user_id`, `reward_id`, `points`, `status` (pending, fulfilled, cancelled), `created_at`, `updated_at` |
| `transfers` | `id`, `from_user_id`, `to_user_id`, `points`, `created_at` |
| `idempotency_keys` | `user_id`, `method`, `path`, `key`, `request_hash`, `response_status`, `response_body`, `created_at`; unique on the first four columns |
| `partner_events` | `partner_id`, `event_id` (unique together with `partner_id`), `received_at` |

`accounts.balance` is updated in the same transaction as the ledger. The schema has **no**
`CHECK (balance >= 0)` constraint: correctness is the code's responsibility.

All ids are strings (`u_1`, `rw_1`, `rd_1`, `tr_1`, `le_0000000001`). All timestamps are ISO 8601
in UTC.

## 2. Endpoints

Authentication: `Authorization: Bearer <token>`. Dev tokens for `u_1`..`u_5`, `u_admin` and
`u_orphan`, and the `partner_demo` secret, are listed in `README.md`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /healthz` | public | Service status `{ status, wsConnections }` |
| `GET /v1/me`, `PATCH /v1/me` | user | Profile. PATCH accepts only `displayName` |
| `GET /v1/accounts/{userId}/balance` | owner or admin | `{ userId, balance, updatedAt }` |
| `GET /v1/accounts/{userId}/ledger` | owner or admin | Query `limit` (default 20, max 100), `cursor`, `from`, `to`, `kind`. Response `{ items, nextCursor }`; items carry `rewardName` for redeem and reversal entries |
| `POST /v1/accounts/{userId}/earn` | admin | `Idempotency-Key` header. Body `{ type: "purchase", amountMinor, orderId }` or `{ type: "promo", points, campaignId }`. 201 `{ entry, balance }` |
| `GET /v1/rewards` | user | Rewards with stock |
| `POST /v1/redemptions` | user | `Idempotency-Key`, body `{ rewardId }`. 201 `{ redemption, balance }` |
| `GET /v1/redemptions/{id}` | owner or admin | `{ redemption }` |
| `POST /v1/redemptions/{id}/cancel` | owner or admin | Only from pending. Returns the points and the reward stock. 200 `{ redemption, balance }` |
| `POST /v1/redemptions/{id}/fulfill` | admin | pending to fulfilled. 200 `{ redemption }` |
| `POST /v1/transfers` | user | `Idempotency-Key`, body `{ toUserId, points }`. 201 `{ transfer, balance }` |
| `POST /v1/partner/events` | HMAC | Headers `X-Partner-Id`, `X-Timestamp`, `X-Signature`. Body `{ eventId, userId, amountMinor }`. 201 `{ status: "credited", entry, balance }` or 200 `{ status: "duplicate" }` |
| `WS /v1/stream` | user | Balance update subscription (section 4) |

Error format everywhere: `{ "error": { "code", "message", "details"? } }`. Error codes:
`invalid_body`, `unauthorized`, `forbidden`, `not_found`, `idempotency_key_required`,
`idempotency_key_reuse`, `request_in_progress`, `insufficient_points`, `out_of_stock`,
`reward_unavailable`, `invalid_state`, `self_transfer`, `receiver_unavailable`,
`daily_cap_exceeded`, `stale_timestamp`, `internal_error`.

## 3. Requirements

| ID | Requirement |
| --- | --- |
| BR-A-01 | Every endpoint except `/healthz` and `/v1/partner/events` requires a bearer token. A missing or invalid token gives 401 `unauthorized` |
| BR-A-02 | A user sees only their own account, ledger, redemptions and transfers. Another user's data gives 403 `forbidden` (for resources that exist). Admin sees everything |
| BR-A-03 | `earn` and `fulfill` are admin-only, otherwise 403 |
| BR-A-04 | `PATCH /v1/me` accepts only `displayName` (1-60 characters). Any other property (`role`, `email`, `tier`) gives 400 `invalid_body` |
| BR-V-01 | Body, query and headers are validated against schemas. `points` and `amountMinor` must be integers in range (`points` 1-1 000 000, `amountMinor` 1-100 000 000). Fractions, strings, NaN, zero and negative values give 400 `invalid_body` with `details` |
| BR-V-02 | Status codes: 201 creation, 200 replay and actions, 400 schema, 401 and 403 access, 404 `not_found`, 409 state conflict, 422 business-rule violation |
| BR-V-03 | Every error (including an unknown route and an unhandled exception) uses the `error` format without a stack trace. A failed database write never results in a 2xx response |
| BR-L-01 | The ledger is append-only. Entries are never updated or deleted; corrections are new `reversal` entries |
| BR-L-02 | `accounts.balance` always equals the sum of `points` of the account's ledger entries; `balance_after` is consistent with the entry sequence |
| BR-L-03 | Listing order is `(created_at DESC, id DESC)`. Cursor pagination has no duplicates or gaps, including entries with equal `created_at` |
| BR-L-04 | `from` and `to`: a date without time means the whole UTC day (`from` starts at 00:00:00.000Z, `to` includes the whole day). Date-times with an offset are honoured. A malformed value gives 400 |
| BR-L-05 | The number of SQL queries of a ledger listing does not depend on the page size (reward names come from one query or a JOIN) |
| BR-E-01 | Purchase points: `floor(amountMinor x tierBp / 1 000 000)` in integer arithmetic. Tier multipliers: bronze 10000, silver 12500, gold 15000 |
| BR-E-02 | Earn limit: 5000 points per account per UTC day (purchases, promos and partner events together). Exceeding it gives 422 `daily_cap_exceeded`; nothing is credited partially |
| BR-R-01 | A redemption checks the balance and the reward stock and changes both atomically. Under concurrent requests neither balance nor stock goes below zero |
| BR-R-02 | States: pending moves to fulfilled (admin) or cancelled (owner, admin). Any other transition gives 409 `invalid_state` |
| BR-R-03 | Cancelling adds a `reversal` entry and returns the reward to stock. The original entry is not changed. A second cancel gives 409 |
| BR-R-04 | An inactive reward gives 409 `reward_unavailable` |
| BR-T-01 | A transfer debits the sender and credits the receiver in one transaction: both entries or neither. A receiver without an account gives 409 `receiver_unavailable` and the sender's balance does not change |
| BR-T-02 | A transfer to oneself gives 422 `self_transfer`, an unknown receiver 404, not enough points 409 `insufficient_points` |
| BR-I-01 | `Idempotency-Key` is required on `earn`, `redemptions` and `transfers` (otherwise 400 `idempotency_key_required`). Key scope: user, method, path, key |
| BR-I-02 | The response is stored in the same transaction as the side effects. A repeat returns the same status and body with the header `Idempotent-Replayed: true` and creates no new effects |
| BR-I-03 | The same key with a different body gives 422 `idempotency_key_reuse` |
| BR-I-04 | Concurrent requests with the same key execute once: the others get the first result or 409 `request_in_progress` |
| BR-I-05 | Keys of different users never collide |
| BR-P-01 | Signature `HMAC-SHA256(secret, timestamp + "." + rawBody)` in hex, compared in constant time. An invalid signature gives 401 |
| BR-P-02 | Timestamp tolerance is +-300 s, otherwise 401 `stale_timestamp` |
| BR-P-03 | A repeated partner `eventId` credits points once (response 200 `duplicate`) |
| BR-W-01 | The token is checked on connect. An invalid token closes the connection with code 4401 |
| BR-W-02 | A user can subscribe only to their own account (admin to any). Another `accountId` yields an `error` frame and no subscription |
| BR-W-03 | `balance.updated` goes only to subscribers of that account. The event carries `seq`, increasing per account |
| BR-W-04 | The server sends `ping` every 20 s. Connections without `pong` for 45 s are closed and removed. Sending to a closed socket does not throw; nothing leaks |
| BR-W-05 | Events are sent only after the transaction commits, never for a rolled-back one |
| BR-S-01 | Logs contain no tokens, `Authorization` header, signatures or emails: they are removed via redaction |
| BR-S-02 | The process survives handler errors. On SIGTERM WebSocket connections and the database are closed gracefully |

Additional rules:

- The seed contains `u_orphan`, a user without an `accounts` row (simulated damaged data).
- `GET /healthz` returns `{ status, wsConnections }`, where `wsConnections` is the number of open
  WebSocket connections.
- "Now" comes from `src/lib/clock.ts`. The environment variable `POINTSHUB_NOW` (ISO 8601) freezes
  the current time; use it to test day boundaries.
- Every endpoint must work for any process time zone (`TZ`), e.g. `UTC`, `America/Los_Angeles`,
  `Europe/Kyiv`.

### Details

- **Ledger references.** `refType`/`refId`: `purchase`/orderId, `promo`/campaignId,
  `partner`/`"<partnerId>:<eventId>"`, `redemption`/redemption id (redeem and reversal),
  `transfer`/transfer id (transfer_in and transfer_out).
- **Cursor.** `nextCursor` is opaque; pass it back unchanged as `cursor`. It is `null` on the last
  page. A malformed cursor gives 400 `invalid_body`.
- **`from` / `to`.** Accepted forms: `YYYY-MM-DD`, or a date-time with `Z` or `+hh:mm`/`-hh:mm`.
  Date-times are inclusive bounds.
- **Idempotency.** Only successful (2xx) responses are stored; a request that failed can be retried
  with the same key.
- **Partner timestamp.** `X-Timestamp` is Unix time in whole seconds, compared to the service clock.
- **Validation errors.** `details` is a list of `{ field, messages[] }`. Query and header validation
  errors also use the `invalid_body` code.

## 4. WebSocket protocol

Connect: `ws://localhost:4020/v1/stream?token=<token>`. Subscriptions are explicit; events carry a
per-account `seq`. There is no replay of missed events.

- Client sends `{ "type": "subscribe", "accountId": "u_1" }` and
  `{ "type": "unsubscribe", "accountId": "u_1" }`.
- Server replies `{ "type": "subscribed", "accountId" }` (or `{ "type": "unsubscribed", "accountId" }`);
  on failure `{ "type": "error", "code", "message" }` with `code` one of `forbidden`, `not_found`,
  `invalid_message`.
- Event: `{ "type": "balance.updated", "accountId", "balance", "entryId", "seq" }`.
- Heartbeat: server sends `{ "type": "ping" }` every 20 s, client replies `{ "type": "pong" }`.

## 5. Data and tooling

- Deterministic seed: 5 users and an admin, 6 rewards (one with stock 1, one inactive), about 200
  ledger entries for `u_1`, at least 30 of them sharing the same `created_at`.
- `requests.http` (REST Client examples), `scripts/ws-client.mjs` (subscribe and print events),
  `scripts/load.mjs` (parallel requests), `DEBUG_SQL=1` to log SQL statements and return
  `X-Sql-Queries` on every response.
- Tests: `npm test`. `tests/helpers/app.ts` starts the app on a temporary seeded database and returns
  the tokens. Add your own tests to `tests/candidate/`.
- `openapi.yaml` (OpenAPI 3.1) describes every endpoint, schema and error code.
