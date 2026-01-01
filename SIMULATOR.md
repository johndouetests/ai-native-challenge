# API simulator

The simulator (`server/`) serves the HTTP API and the WebSocket described in `openapi.yaml` on
port **4010**. It keeps everything in memory and generates the same data on every start
(seed `1337`). `npm run dev` starts it together with Vite; Vite proxies `/api` and `/ws` to it.

```bash
npm run sim            # simulator only
npm run dev            # simulator + Vite
```

Environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIM_PORT` | `4010` | HTTP and WebSocket port |
| `SIM_NOW` | current minute | ISO date-time the generated data is anchored to, e.g. `2026-03-09T10:00:00Z` |
| `SIM_SCENARIO` | on | `off` disables the scenario timers, `paused` starts them paused |
| `SIM_VALIDATE` | off | `1` validates every `/api` response against `openapi.yaml` and responds with 500 on a mismatch |

## Clock

All generated timestamps are relative to an anchor ("now"). The simulator clock is the anchor plus
the real time elapsed since start or since the last reset. The reference screenshots use the anchor
`2026-03-09T10:00:00Z` together with a browser clock frozen at the same instant:

```bash
curl -X POST localhost:4010/__sim/reset -H 'content-type: application/json' \
  -d '{"now":"2026-03-09T10:00:00Z"}'
```

## Scenario engine

Runs by default and is deterministic:

- every 20 s a customer writes into one of the open tickets (`typing` 2 s before, then
  `message.created` and `ticket.updated`);
- every 45 s another agent changes the status, priority or assignee of a random ticket;
- every 90 s a new ticket arrives (`ticket.created`).

## Controls

Open **http://localhost:4010/__sim** for a panel with buttons, or call the endpoints directly.
All of them are `POST` with a JSON body (or no body) and respond with `{ "ok": true }`.

| Endpoint | Body | Effect |
| --- | --- | --- |
| `/__sim/disconnect` | — | Closes every WebSocket connection (clients should reconnect) |
| `/__sim/latency` | `{ "ms": 1500 }` | Adds a delay to every `/api` response; `0` removes it |
| `/__sim/fail` | `{ "method": "GET", "pathPrefix": "/api/tickets", "status": 500, "times": 1 }` | The next `times` matching `/api` requests get `status` as the response code (`method` may be `*`). `status: 0` drops the connection without a response, which the browser reports as a network error |
| `/__sim/emit` | `{ "type": "message.created", "ticketId": "t_1001" }` | Emits an event now. Types: `message.created` (customer message, optional `body`), `typing` (optional `authorName`), `ticket.updated` (optional `status`, `priority`, `assigneeId`; random change otherwise), `ticket.created` (no `ticketId`; optional `subject`, `status`, `priority`, `assigneeId`) |
| `/__sim/pause` | — | Pauses the scenario engine |
| `/__sim/resume` | — | Resumes the scenario engine |
| `/__sim/stall` | — | Sockets stay open but the server stops sending any frame, including `ping` |
| `/__sim/unstall` | — | Frames flow again (frames skipped while stalled are only available through replay) |
| `/__sim/reset` | `{ "now"?: "2026-03-09T10:00:00Z" }` | Restores the generated data, clears latency, failure rules and stall. Event ids keep increasing; the replay buffer is cleared and connected clients receive `resync`. The paused/running state is kept |

`GET /__sim/state` returns the current settings, the number of open sockets and the last event id.

## WebSocket recap

- `ws://localhost:4010/ws?lastEventId=<n>`; the parameter is optional.
- With `lastEventId` the server replays the buffered events **starting from that id inclusive**,
  so at least one replayed event was already processed by the client.
- The buffer keeps the last 500 events. An id older than the buffer (or unknown to the server, e.g.
  after a restart) gets a single `{ "type": "resync" }` frame instead.
- `typing` frames have `eventId: null` and are never replayed.
- `ping` every 15 s; clients may reply `{ "type": "pong" }`.

## Examples

```bash
# a slow network
curl -X POST localhost:4010/__sim/latency -H 'content-type: application/json' -d '{"ms":2000}'

# the next message send fails with 503
curl -X POST localhost:4010/__sim/fail -H 'content-type: application/json' \
  -d '{"method":"POST","pathPrefix":"/api/tickets/t_1001/messages","status":503}'

# a customer starts typing and then writes
curl -X POST localhost:4010/__sim/emit -H 'content-type: application/json' -d '{"type":"typing","ticketId":"t_1001"}'
curl -X POST localhost:4010/__sim/emit -H 'content-type: application/json' -d '{"type":"message.created","ticketId":"t_1001","body":"Any news?"}'
```
