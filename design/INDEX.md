# Design reference screenshots

Reference build, Chromium 1× DPR, en-US, Europe/Kyiv, reduced motion, clock frozen at
`2026-03-09T10:00:00Z`, simulator data anchored at the same instant. Height 800px. File name:
`<screen>__<state>__<theme>__<width>.png`.

| File | State | Requirements |
| --- | --- | --- |
| [list__default__light__1280.png](list__default__light__1280.png) | Inbox with the first page of tickets, default sort; "Select a ticket" placeholder in two-column mode | FR-L-01, FR-L-02, FR-L-03, FR-L-11, FR-L-12, FR-X-01, FR-X-02, FR-X-04 |
| [list__default__dark__1280.png](list__default__dark__1280.png) | Inbox with the first page of tickets, default sort; "Select a ticket" placeholder in two-column mode | FR-L-01, FR-L-02, FR-L-03, FR-L-11, FR-L-12, FR-X-01, FR-X-02, FR-X-04 |
| [list__default__light__360.png](list__default__light__360.png) | Inbox with the first page of tickets, default sort; "Select a ticket" placeholder in two-column mode | FR-L-01, FR-L-02, FR-L-03, FR-L-11, FR-L-12, FR-X-01, FR-X-02, FR-X-04 |
| [list__empty-filter__light__1280.png](list__empty-filter__light__1280.png) | Search without results: "No tickets match your filters" with Clear filters | FR-L-08, FR-L-03 |
| [list__error__light__1280.png](list__error__light__1280.png) | First page failed (HTTP 500): "Couldn’t load tickets" with Retry | FR-L-09 |
| [list__loading__light__1280.png](list__loading__light__1280.png) | First page still loading: 8 skeleton rows of 72px | FR-L-07 |
| [list__long-text__light__1280.png](list__long-text__light__1280.png) | Rows with a 180-character subject (DSK-1002) and Ukrainian/German text (DSK-1004) truncated with ellipsis | FR-L-01, FR-X-07 |
| [ticket__default__light__1280.png](ticket__default__light__1280.png) | DSK-1001 open: header with controls, last 30 messages scrolled to the bottom, composer; selected row in the list | FR-D-01, FR-D-05, FR-D-07, FR-D-10, FR-L-10, FR-X-01, FR-X-02 |
| [ticket__default__dark__1280.png](ticket__default__dark__1280.png) | DSK-1001 open: header with controls, last 30 messages scrolled to the bottom, composer; selected row in the list | FR-D-01, FR-D-05, FR-D-07, FR-D-10, FR-L-10, FR-X-01, FR-X-02 |
| [ticket__default__light__360.png](ticket__default__light__360.png) | DSK-1001 open: header with controls, last 30 messages scrolled to the bottom, composer; selected row in the list | FR-D-01, FR-D-05, FR-D-07, FR-D-10, FR-L-10, FR-X-01, FR-X-02 |
| [ticket__delivery-states__light__1280.png](ticket__delivery-states__light__1280.png) | Agent replies: sent (check), failed (red icon + Retry) and sending (clock) | FR-D-05, FR-D-12 |
| [ticket__closed__light__1280.png](ticket__closed__light__1280.png) | Closed ticket DSK-1006: composer disabled, "This ticket is closed" with Reopen | FR-D-04, FR-D-05 |
| [ticket__close-dialog__light__1280.png](ticket__close-dialog__light__1280.png) | "Close this ticket?" confirmation dialog over the ticket | FR-D-03, FR-X-06 |
