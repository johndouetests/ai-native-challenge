# Deskline Inbox — Product specification

Challenge ID: fe-vue-A-42edb2fa-ce6c-450a-a26c-c9f39230e384

Deskline Inbox is a support inbox: a list of tickets and a realtime conversation per ticket.
This document is the source of truth for the expected behaviour, together with `openapi.yaml`,
`SIMULATOR.md` and the reference screenshots in `design/`. Every requirement has an ID; use the ID
when you describe a problem.

## 1. Stack and structure

- Vue 3 (`<script setup>`) + TypeScript (strict) + Vite, Vue Router, Tailwind CSS, shadcn-vue
  components on Reka UI (Button, Badge, Input, Textarea, Select, DropdownMenu, AlertDialog, Skeleton,
  Avatar, Tooltip, Sonner toasts), lucide icons.
- Data: no data-fetching libraries. `fetch` with `AbortController` in the composables
  `useTicketList`, `useTicketThread` and `useRealtime`.
- The Inter font is bundled (`@fontsource/inter`); nothing is loaded from external CDNs.
- Structure: `src/app`, `src/features/tickets`, `src/features/thread`, `src/features/realtime`,
  `src/components/ui`, `src/lib`, `src/styles/tokens.css`.
- `npm install && npm run dev` starts both Vite and the API simulator (`server/`).

## 2. Routes and layout

- `/` redirects to `/tickets`. `/tickets` is the list. `/tickets/:id` is the list plus the ticket.
- Top bar, 56px high: logo, connection indicator, theme switch, agent menu.
- Width 1024px and above: two columns. The list is 400px wide, the ticket takes the remaining
  width. With no ticket selected the right side shows "Select a ticket".
- Below 1024px: the list and the ticket are separate pages; the ticket page has a "Back" button.
- Screenshots in `design/` are taken at 1280 and 360 (height 800).
- The page never scrolls horizontally at any width from 320px.

## 3. Design tokens

All colors and sizes come from CSS variables in `src/styles/tokens.css`. Components never use
hard-coded colors (FR-X-01).

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | #F8FAFC | #0B1120 |
| `--card` | #FFFFFF | #111827 |
| `--border` | #E2E8F0 | #1F2937 |
| `--foreground` | #0F172A | #E5E7EB |
| `--muted-foreground` | #5B6B80 | #94A3B8 |
| `--muted` (subtle surfaces, customer bubbles) | #F1F5F9 | #1F2937 |
| `--accent` (selected row) | #EFF6FF | #172554 |
| `--primary` | #2563EB | #3B82F6 |
| `--primary-foreground` | #FFFFFF | #0B1120 |
| `--destructive` | #DC2626 | #F87171 |
| `--destructive-foreground` | #FFFFFF | #0B1120 |
| status open (bg / text) | #DBEAFE / #1E40AF | #1E3A8A / #BFDBFE |
| status pending | #FEF3C7 / #92400E | #78350F / #FDE68A |
| status resolved | #DCFCE7 / #166534 | #14532D / #BBF7D0 |
| status closed | #E2E8F0 / #334155 | #334155 / #E2E8F0 |
| priority low / normal / high / urgent (dot) | #64748B / #2563EB / #EA580C / #DC2626 | #94A3B8 / #3B82F6 / #F97316 / #EF4444 |
| connection live / reconnecting / offline (dot) | #16A34A / #A16207 / #DC2626 | #22C55E / #EAB308 / #F87171 |

Avatar colors (`--avatar-<color>-bg` / `-fg`) exist for the eight palette keys returned by the API
(`blue`, `violet`, `teal`, `amber`, `rose`, `emerald`, `indigo`, `orange`).

Every text/background pair meets 4.5:1. Three values differ from the first draft of the palette to
reach that ratio: light `--muted-foreground` (#64748B → #5B6B80, needed on the selected-row and
bubble backgrounds), dark `--primary-foreground` and dark `--destructive-foreground`
(#FFFFFF → #0B1120 on #3B82F6 / #F87171).

Sizes and typography:

- Spacing scale 4px. Radius 8px for cards and inputs, 12px for message bubbles, full for avatars
  and badges.
- Body text 14px/20px. Ticket title 18px/28px semibold. Subject in a list row 14px semibold.
  Meta text 12px/16px.
- List row: padding 12px 16px, height 72px, 8px gap between elements. Avatar 32px in the list,
  28px in messages.
- Message bubble: padding 8px 12px, max width 75% of the thread width (88% below 480px).
- Focus: 2px ring in `--primary` with a 2px offset (list rows and the thread use an inset ring because
  they touch the edge of their scroll container).

## 4. Requirements: ticket list

| ID | Requirement |
| --- | --- |
| FR-L-01 | A row shows: unread dot (8px, primary), key `DSK-1042` (12px, monospace, muted), subject (one line, ellipsis, full text in a tooltip on hover and on keyboard focus of the row), requester name, status badge, priority indicator (8px colored dot and a text label), assignee avatar 32px (initials; a dashed avatar for Unassigned), relative update time |
| FR-L-02 | Default sort: `updatedAt` descending. Options: Updated, Created, Priority (urgent above low, ties by `updatedAt`) |
| FR-L-03 | Filters: Status (multi), Priority (multi), Assignee (one of: Anyone, Me, Unassigned, a specific agent), search. Filter state lives in the URL (`status`, `priority`, `assignee`, `q`, `sort`), is restored on reload and follows the browser back and forward buttons. Search matches the key, the subject and the requester name (case-insensitive) |
| FR-L-04 | Search is debounced by 300 ms. The previous request is cancelled; a response of an outdated request is never applied |
| FR-L-05 | Any change of filters, sort or search resets the pagination cursor and scrolls the list to the top |
| FR-L-06 | Pagination: 25 tickets per page, a "Load more" button at the end of the list, cursor `nextCursor`. The button is hidden when `nextCursor` is null. While loading it shows a spinner and is disabled. No duplicate rows |
| FR-L-07 | Loading: 8 skeleton rows with the same height (72px) as real rows. No layout shift when they are replaced |
| FR-L-08 | Empty result with filters: an icon, "No tickets match your filters" and a "Clear filters" button. Empty inbox without filters: "Inbox is empty" without a button |
| FR-L-09 | Load error: a "Couldn’t load tickets" block with a "Retry" button. A failed "Load more" keeps the rows already shown and reports the error below the list |
| FR-L-10 | The selected row (two-column mode) has a highlighted background and a 2px left border in primary. A row is a link: Enter opens the ticket, focus is visible |
| FR-L-11 | The list header reads "Inbox · N unread". N comes from `meta.unreadCount` (whole inbox, not the filter). Opening an unread ticket lowers N by one, once; N never goes below zero |
| FR-L-12 | Time: "just now" (under 1 minute), "5m ago", "3h ago" (same local day), "Yesterday" (previous local day), then "Mar 4" (with the year if it is not the current year). Updated every 30 s by one shared timer. A tooltip shows the full date in the local time zone. The API sends UTC ISO-8601; the UI shows the user's local time zone |
| FR-L-13 | `ticket.created` and `ticket.updated` events update the list in place: a ticket that matches the current filters moves to its sorted position (the top for the default sort); a ticket that stops matching disappears. Tickets that do not match the filters are never added |

## 5. Requirements: ticket and conversation

| ID | Requirement |
| --- | --- |
| FR-D-01 | Header: key, subject (up to 2 lines, then ellipsis), requester name and email, creation time. Controls: Status, Priority, Assignee (Select) and a "Close ticket" button |
| FR-D-02 | Changing status, priority or assignee is optimistic and sends the ticket `version`. On error the value goes back and a "Couldn’t update ticket" toast appears. On 409 the ticket is reloaded and a "Ticket was updated by someone else" toast appears. A success toast is shown only after a 200 response |
| FR-D-03 | "Close ticket" opens an AlertDialog "Close this ticket?" with Cancel and Close ticket. Escape and a click on the overlay cancel. The confirm button is disabled while the request runs. Focus stays inside the dialog and returns to the button when it closes |
| FR-D-04 | After closing: status closed, the composer is disabled, the text "This ticket is closed" and a "Reopen" button (sets status open) are shown |
| FR-D-05 | Conversation: messages in ascending time. Types: `customer` (left, neutral bubble), `agent` (right, primary color), `system` (centered, small text). Day separators "Today", "Yesterday", "Mon, Mar 4". Agent messages show a delivery status: sending (clock), sent (check), failed (red icon and "Retry") |
| FR-D-06 | Message text is shown as text with line breaks preserved. HTML is escaped. Long strings without spaces (URLs, 200 characters) wrap inside the bubble; nothing overflows horizontally. Emoji render |
| FR-D-07 | First load: 5 message skeletons, then the latest 30 messages, scrolled to the very bottom without a visible jump |
| FR-D-08 | Older messages load when the user scrolls within 80px of the top (parameter `before`). The scroll position is kept: the message at the top edge stays in place. At the start of the conversation the text "Beginning of conversation" is shown |
| FR-D-09 | A new incoming message: if the user is within 120px of the bottom, the thread scrolls down smoothly. Otherwise it does not scroll and a "N new messages" button (with a counter) appears; clicking it scrolls to the bottom and hides it |
| FR-D-10 | Composer: the textarea grows up to 6 lines, then scrolls. Enter sends, Shift+Enter inserts a new line. Enter during IME composition does not send. Send is disabled for empty or whitespace-only text and for a closed ticket. Limit 4000 characters; a counter is visible from 3800 and turns red at the limit |
| FR-D-11 | The draft is kept per ticket (in memory) and restored when returning to the ticket. It is cleared after a successful send |
| FR-D-12 | Sending: an optimistic bubble with status sending and a `clientMessageId` (UUID, created once per message). The 201 response replaces the bubble instead of adding a second one, matched by `clientMessageId`. A network error or 5xx sets status failed. Retry uses the same `clientMessageId`. A double click on Send sends one message |
| FR-D-13 | Typing indicator: on a `typing` event for the open ticket, "Alex Carter is typing…" (animated dots; static text with reduced motion). Hidden 4 s after the last event or when a message from that author arrives |
| FR-D-14 | Opening a ticket calls `POST /read` once per opening, not on every render |
| FR-D-15 | Unknown id: "Ticket not found" and a link back (404 only). Any other error: a generic error block with Retry |
| FR-D-16 | `document.title` while a ticket is open: "DSK-1042 · {subject} — Deskline" |

## 6. Requirements: realtime and cross-cutting

| ID | Requirement |
| --- | --- |
| FR-R-01 | The indicator in the top bar reflects the real socket state: Live (green dot), Reconnecting (yellow, spinner), Offline (red; after 3 failed attempts in a row or when `navigator.onLine` is false) |
| FR-R-02 | Reconnect with exponential delay 1, 2, 4, 8 s, at most 15 s, jitter ±20%. Reset after a successful connection |
| FR-R-03 | On reconnect the client sends `lastEventId`. The server replays missed events, some of which may already have been processed. The client ignores events whose `eventId` is not greater than the last processed one and deduplicates messages by `id` and by `clientMessageId` |
| FR-R-04 | The server sends `ping` every 15 s. If no frame arrives for 35 s, the client considers the connection dead and reconnects |
| FR-R-05 | One socket for the whole app. Events are routed by `ticketId`: the thread shows only events of the open ticket. Subscribers are not duplicated when switching tickets and are removed on unmount |
| FR-R-06 | Events are applied in ascending `eventId`. Messages are ordered by `createdAt`, then by `id` |
| FR-R-07 | On a `resync` frame the client reloads the list (with the current filters) and the open ticket with its messages |
| FR-X-01 | Themes light, dark and system. The choice is stored in `localStorage` (`deskline-theme`), default system. All colors come from tokens |
| FR-X-02 | Breakpoints 360, 768, 1024, 1440 follow the layout rules. No horizontal scroll from 320px. Touch targets are at least 40px below 768px |
| FR-X-03 | Every interactive element works with the keyboard and shows a visible focus ring (2px). Icon-only buttons have an `aria-label`. Status and priority are never conveyed by color alone |
| FR-X-04 | Text contrast at least 4.5:1, UI elements at least 3:1 in both themes. An axe check of the reference states reports no violations |
| FR-X-05 | `prefers-reduced-motion` disables animations |
| FR-X-06 | Layer order: toasts above dialogs, dialogs above dropdowns, dropdowns above the sticky header. Dropdowns are never clipped by containers with overflow |
| FR-X-07 | The UI copes with text twice as long as English (Ukrainian, German): long names and subjects are truncated with an ellipsis, the layout does not break |
| FR-X-08 | Performance: typing in the search with 2000 loaded tickets does not re-render every row (rows are memoized). A 1000-message thread stays responsive; a new message does not re-render the whole list. Relative times are refreshed by one shared timer, not a timer per row |

## 7. Data and determinism

- The simulator generates its data deterministically from seed `1337`: 120 tickets
  (DSK-1001 to DSK-1120), 8 agents, 5 to 80 messages per ticket.
- Special tickets: DSK-1001 has 1200 messages; DSK-1002 has a 180-character subject; DSK-1003 has a
  220-character message without spaces; DSK-1004 contains Ukrainian and German text; DSK-1005
  contains emoji; DSK-1006 is closed; DSK-1007 is unassigned and urgent.
- Scenarios and screenshots use the frozen time `2026-03-09T10:00:00Z` and the browser time zone
  `Europe/Kyiv` (see `SIMULATOR.md` for anchoring the simulator clock).
- Assignee avatars are initials on colored backgrounds; there are no external images.

## 8. API contract, WebSocket and simulator

The simulator is always correct: `openapi.yaml` together with the live server responses is the
source of truth for the contract.

### 8.1 Rules

- `openapi.yaml` (OpenAPI 3.1) in the repository root describes every endpoint and schema.
- Simulator: Node.js + TypeScript + Fastify + `ws`, in-memory storage, port 4010. Started together
  with Vite by `npm run dev`.
- Errors always look like `{ "error": { "code": "string", "message": "string" } }`.
- All timestamps are ISO-8601 UTC. Ids are strings: `t_1001`, `m_9001`, `a_1`.
- No authentication. The current agent "Maya Lopez" (`a_1`) is returned by `GET /api/me`.

### 8.2 Endpoints

| Method and path | Purpose and responses |
| --- | --- |
| `GET /api/me` | Current agent `{ id, name, initials, color }` |
| `GET /api/agents` | `{ items: Agent[] }` |
| `GET /api/tickets` | Parameters: `status` and `priority` (comma-separated), `assigneeId` (`a_1`, `me` or `unassigned`), `q`, `sort` (`updated`, `created`, `priority`), `cursor`, `limit` (default 25, max 100; larger values get 400 `invalid_parameter`). Response: `{ items: TicketSummary[], nextCursor: string or null, meta: { unreadCount, totalMatching } }` |
| `GET /api/tickets/{id}` | `Ticket` (TicketSummary plus `requester.email`). 404 `ticket_not_found` |
| `PATCH /api/tickets/{id}` | Body `{ version, status?, priority?, assigneeId? }` (`assigneeId` may be null). 200 with the updated `Ticket` and an incremented `version`. 409 `version_conflict` with the current ticket in `error.current`. 422 for invalid values |
| `POST /api/tickets/{id}/read` | 204. Idempotent |
| `GET /api/tickets/{id}/messages` | Parameters `before` (cursor), `limit` (default 30, max 100). Response `{ items: Message[] ascending, prevCursor: string or null }`. Without `before` the latest messages are returned |
| `POST /api/tickets/{id}/messages` | Body `{ clientMessageId (uuid), body (1–4000 characters) }`. 201 with the `Message`. Repeating with the same `clientMessageId` returns 200 with the existing message, no duplicate. 409 `ticket_closed`. 422 `invalid_body` |

Models:

- `TicketSummary`: `id`, `key`, `subject`, `status` (open, pending, resolved, closed), `priority`
  (low, normal, high, urgent), `requester { name }`, `assigneeId` (string or null), `unread`
  (boolean), `createdAt`, `updatedAt`, `version` (integer).
- `Message`: `id`, `ticketId`, `type` (customer, agent, system), `authorName`, `authorId` (string or
  null), `body`, `createdAt`, `clientMessageId` (agent messages; null otherwise).

### 8.3 WebSocket

Connection: `ws://localhost:4010/ws?lastEventId=<n>` (the parameter is optional). All frames are JSON.

| Server frame | Content |
| --- | --- |
| `message.created` | `{ eventId, type, ticketId, data: Message }` |
| `ticket.created`, `ticket.updated` | `{ eventId, type, ticketId, data: TicketSummary }` |
| `typing` | `{ eventId: null, type, ticketId, data: { authorName } }`. Ephemeral, never replayed |
| `ping` | `{ type: "ping", ts }` every 15 s. The client may reply `{ type: "pong" }` |
| `resync` | `{ type: "resync" }` when `lastEventId` is older than the buffer (500 events). The client reloads the list and the open ticket |

- `eventId` is a monotonically increasing integer shared by all tickets.
- When connecting with `lastEventId` the server replays events starting **from that id inclusive**.
  The replay therefore always contains an event the client has already processed; the client must
  deduplicate (FR-R-03).
- A new customer message produces `message.created` followed by `ticket.updated` (new `updatedAt`).

### 8.4 Simulator behaviour

A deterministic scenario engine runs by default:

- every 20 s a customer message arrives in one of the open tickets, with a `typing` event 2 s before;
- every 45 s another agent changes the status, priority or assignee of a random ticket
  (`ticket.updated`);
- every 90 s a new ticket is created (`ticket.created`).

Controls for reproducing problems are described in `SIMULATOR.md`: `/__sim` panel, disconnect,
latency, fail, emit, pause/resume, reset, stall/unstall.
