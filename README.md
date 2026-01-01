# Deskline Inbox

Challenge ID: fe-react-A-ee045dfe-7daf-436f-bc6f-764c70d81fb1

Deskline Inbox is a support inbox for agents: a filterable list of tickets and a realtime
conversation per ticket. It runs fully locally against an API simulator.

**This repository is a hiring challenge.** Start with [`TASK.md`](TASK.md). How to hand in your
work is described in [`SUBMISSION.md`](SUBMISSION.md): please do not fork this repository and do not
open pull requests.

## Requirements

- Node.js 22 (see `.nvmrc`) and npm.

## Getting started

```bash
npm install
npm run dev
```

This starts the API simulator on http://localhost:4010 and the app on http://localhost:5173.
The simulator control panel is at http://localhost:4010/__sim.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Simulator + Vite dev server |
| `npm run sim` | Simulator only |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` on http://localhost:4173 (needs the simulator running) |
| `npm run typecheck` | `tsc` for the app and for the simulator |
| `npm run lint` | ESLint (with `eslint-plugin-react-hooks`) |
| `npm test` | Unit tests and simulator tests (Vitest) |

## Documentation

- `SPEC.md` — product requirements with IDs (FR-L, FR-D, FR-R, FR-X), design tokens and layout.
- `openapi.yaml` — HTTP API and WebSocket frames.
- `SIMULATOR.md` — how to reproduce slow networks, failures, disconnects and realtime events.
- `design/` — reference screenshots.

Differences below 1px caused by font rendering on your OS are not bugs.

## Project layout

```text
server/                 API simulator (Fastify + ws, in-memory, seed 1337)
src/app                 shell: router, header, theme
src/features/tickets    ticket list, filters, useTicketList
src/features/thread     ticket header, conversation, composer, useTicketThread
src/features/realtime   WebSocket client and useRealtime
src/components/ui       shadcn/ui components
src/lib                 API client, time formatting, shared helpers
src/styles/tokens.css   design tokens
tests/                  unit tests and simulator tests
```
