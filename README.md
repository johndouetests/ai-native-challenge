# Deskline Inbox

Challenge ID: fe-vue-A-42edb2fa-ce6c-450a-a26c-c9f39230e384

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
| `npm run typecheck` | `vue-tsc` for the app, `tsc` for the simulator |
| `npm run lint` | ESLint (with `eslint-plugin-vue`) |
| `npm test` | Unit tests and simulator tests (Vitest) |
| `npm run shots` | Screenshots of the running app in the `design/` states (needs `npx playwright install chromium`) |
| `npm run submit:pack` | Builds the submission archive (see `SUBMISSION.md`) |

## Documentation

- [`TASK.md`](TASK.md) — what to do, rules and time limit.
- [`SPEC.md`](SPEC.md) — product requirements with IDs (FR-L, FR-D, FR-R, FR-X), design tokens and layout.
- [`openapi.yaml`](openapi.yaml) — HTTP API and WebSocket frames.
- [`SIMULATOR.md`](SIMULATOR.md) — how to reproduce slow networks, failures, disconnects and realtime events.
- [`design/`](design/INDEX.md) — reference screenshots (states, themes, widths); `npm run shots` takes
  the same screenshots of your build.
- [`SUBMISSION.md`](SUBMISSION.md) — how to hand in your work; `BUGS.md`, `AGENT_PROMPTS.md` and
  `NOTES.md` are the templates you fill in.

Differences below 1px caused by font rendering on your OS are not bugs.

## Project layout

```text
server/                 API simulator (Fastify + ws, in-memory, seed 1337)
src/app                 shell: router, header, theme
src/features/tickets    ticket list, filters, list composable
src/features/thread     ticket header, conversation, composer, thread composable
src/features/realtime   WebSocket client and composable
src/components/ui       shadcn-vue components
src/lib                 API client, time formatting, shared helpers
src/styles/tokens.css   design tokens
tests/                  unit tests and simulator tests
scripts/                screenshots (shots.ts) and the submission archive (pack.mjs)
```
