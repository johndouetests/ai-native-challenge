/// <reference lib="dom" />
/**
 * Screenshot scenarios for Deskline Inbox (design/<screen>__<state>__<theme>__<width>.png).
 *
 * Self-contained on purpose (no relative imports): the same file is used by the private reference
 * capture and copied next to the public `npm run shots` script. Every state is set up through the
 * simulator controls (/__sim/*), the seed tickets and test ids only, so it works for any build.
 */
import type { Browser, Page } from 'playwright'

export const FIXED_NOW = '2026-03-09T10:00:00Z'
export const HEIGHT = 800
/** Chromium flags for stable pixels: grayscale text antialiasing, no hinting, sRGB output. */
export const LAUNCH_ARGS = ['--disable-lcd-text', '--font-render-hinting=none', '--force-color-profile=srgb']

export type Theme = 'light' | 'dark'
export type ConnectionState = 'live' | 'reconnecting' | 'offline'

export interface ScenarioContext {
  page: Page
  sim: (path: string, body?: unknown) => Promise<void>
}

export interface Scenario {
  screen: 'list' | 'ticket' | 'connection'
  state: string
  themes: Theme[]
  widths: number[]
  /** SPEC requirement ids the screenshot documents (design/INDEX.md). */
  requirements: string[]
  description: string
  /** Connection indicator state to wait for before the shot (default live). */
  connection?: ConnectionState
  /** Skip waiting for network idle (a request is held open on purpose). */
  pendingRequests?: boolean
  /** Capture only the 56px top bar. */
  headerOnly?: boolean
  setup: (ctx: ScenarioContext) => Promise<void>
}

const byId = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`)
const row = (page: Page, id: string) => page.locator(`[data-testid="ticket-row"][data-ticket-id="${id}"]`)

async function openList(page: Page, path = '/tickets') {
  await page.goto(path)
  await byId(page, 'ticket-row').first().waitFor()
}

async function openTicket(page: Page, id: string) {
  await page.goto(`/tickets/${id}`)
  await byId(page, 'ticket-header').waitFor()
  await byId(page, 'message-bubble').first().waitFor()
}

/** Scrolls the ticket list so that the given row is the first visible one. */
async function scrollListTo(page: Page, ticketId: string) {
  await row(page, ticketId).waitFor()
  await page.evaluate((id) => {
    const list = document.querySelector('[data-testid="ticket-list"]') as HTMLElement
    const target = document.querySelector(`[data-testid="ticket-row"][data-ticket-id="${id}"]`) as HTMLElement
    list.scrollTop += target.getBoundingClientRect().top - list.getBoundingClientRect().top
  }, ticketId)
}

export const SCENARIOS: Scenario[] = [
  {
    screen: 'list',
    state: 'default',
    themes: ['light', 'dark'],
    widths: [1280, 360],
    requirements: ['FR-L-01', 'FR-L-02', 'FR-L-03', 'FR-L-11', 'FR-L-12', 'FR-X-01', 'FR-X-02', 'FR-X-04'],
    description: 'Inbox with the first page of tickets, default sort; "Select a ticket" placeholder in two-column mode',
    setup: ({ page }) => openList(page),
  },
  {
    screen: 'list',
    state: 'loading',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-L-07'],
    description: 'First page still loading: 8 skeleton rows of 72px',
    pendingRequests: true,
    setup: async ({ page }) => {
      await page.route('**/api/tickets?*', () => undefined)
      await page.goto('/tickets')
      await byId(page, 'list-skeleton-row').nth(7).waitFor()
    },
  },
  {
    screen: 'list',
    state: 'empty-filter',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-L-08', 'FR-L-03'],
    description: 'Search without results: "No tickets match your filters" with Clear filters',
    setup: async ({ page }) => {
      await page.goto('/tickets?q=zzzz')
      await byId(page, 'empty-state').waitFor()
    },
  },
  {
    screen: 'list',
    state: 'error',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-L-09'],
    description: 'First page failed (HTTP 500): "Couldn’t load tickets" with Retry',
    setup: async ({ page, sim }) => {
      await sim('/__sim/fail', { method: 'GET', pathPrefix: '/api/tickets', status: 500, times: 1 })
      await page.goto('/tickets')
      await byId(page, 'list-error').waitFor()
    },
  },
  {
    screen: 'list',
    state: 'long-text',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-L-01', 'FR-X-07'],
    description: 'Rows with a 180-character subject (DSK-1002) and Ukrainian/German text (DSK-1004) truncated with ellipsis',
    setup: async ({ page }) => {
      await openList(page)
      await scrollListTo(page, 't_1002')
      await row(page, 't_1004').waitFor()
    },
  },
  {
    screen: 'ticket',
    state: 'default',
    themes: ['light', 'dark'],
    widths: [1280, 360],
    requirements: ['FR-D-01', 'FR-D-05', 'FR-D-07', 'FR-D-10', 'FR-L-10', 'FR-X-01', 'FR-X-02'],
    description: 'DSK-1001 open: header with controls, last 30 messages scrolled to the bottom, composer; selected row in the list',
    setup: ({ page }) => openTicket(page, 't_1001'),
  },
  {
    screen: 'ticket',
    state: 'delivery-states',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-D-05', 'FR-D-12'],
    description: 'Agent replies: sent (check), failed (red icon + Retry) and sending (clock)',
    pendingRequests: true,
    setup: async ({ page, sim }) => {
      await openTicket(page, 't_1008')
      await sim('/__sim/fail', { method: 'POST', pathPrefix: '/api/tickets/t_1008/messages', status: 500, times: 1 })
      await byId(page, 'composer-input').fill('Could you confirm the new billing email address?')
      await byId(page, 'send-button').click()
      await byId(page, 'message-retry').waitFor()
      await page.route('**/api/tickets/t_1008/messages', (route) =>
        route.request().method() === 'POST' ? undefined : route.continue(),
      )
      await byId(page, 'composer-input').fill('I have updated it on our side as well.')
      await byId(page, 'send-button').click()
      await page.locator('[data-testid="delivery-status"][data-status="sending"]').waitFor()
    },
  },
  {
    screen: 'ticket',
    state: 'closed',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-D-04', 'FR-D-05'],
    description: 'Closed ticket DSK-1006: composer disabled, "This ticket is closed" with Reopen',
    setup: async ({ page }) => {
      await openTicket(page, 't_1006')
      await byId(page, 'ticket-closed-notice').waitFor()
    },
  },
  {
    screen: 'ticket',
    state: 'close-dialog',
    themes: ['light'],
    widths: [1280],
    requirements: ['FR-D-03', 'FR-X-06'],
    description: '"Close this ticket?" confirmation dialog over the ticket',
    setup: async ({ page }) => {
      await openTicket(page, 't_1008')
      await byId(page, 'close-ticket-button').click()
      await page.getByRole('alertdialog').waitFor()
    },
  },
]

/** The screenshots in design/. */
const PUBLISHED = new Set([
  'list__default__light__1280.png',
  'list__default__dark__1280.png',
  'list__default__light__360.png',
  'list__empty-filter__light__1280.png',
  'list__error__light__1280.png',
  'list__loading__light__1280.png',
  'list__long-text__light__1280.png',
  'ticket__default__light__1280.png',
  'ticket__default__dark__1280.png',
  'ticket__default__light__360.png',
  'ticket__delivery-states__light__1280.png',
  'ticket__closed__light__1280.png',
  'ticket__close-dialog__light__1280.png',
])

export interface Shot {
  file: string
  scenario: Scenario
  theme: Theme
  width: number
}

export function shotList(filter?: string): Shot[] {
  const shots: Shot[] = []
  for (const scenario of SCENARIOS) {
    for (const theme of scenario.themes) {
      for (const width of scenario.widths) {
        const file = `${scenario.screen}__${scenario.state}__${theme}__${width}.png`
        if (!PUBLISHED.has(file)) continue
        if (!filter || file.includes(filter)) shots.push({ file, scenario, theme, width })
      }
    }
  }
  return shots
}

async function postSim(simUrl: string, path: string, body: unknown = {}) {
  const res = await fetch(`${simUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
}

/**
 * Takes one screenshot: fresh browser context (DPR 1, en-US, Europe/Kyiv, reduced motion, frozen
 * clock), simulator reset to FIXED_NOW, scenario setup, fonts and network settled.
 */
export async function takeShot(browser: Browser, shot: Shot, baseUrl: string, simUrl: string): Promise<Buffer> {
  const sim = (path: string, body?: unknown) => postSim(simUrl, path, body)
  await sim('/__sim/pause')
  await sim('/__sim/reset', { now: FIXED_NOW })
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: shot.width, height: HEIGHT },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'Europe/Kyiv',
    colorScheme: shot.theme,
    reducedMotion: 'reduce',
  })
  try {
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date(FIXED_NOW))
    await shot.scenario.setup({ page, sim })
    const state = shot.scenario.connection ?? 'live'
    await page.locator(`[data-testid="connection-indicator"][data-state="${state}"]`).waitFor({ timeout: 15_000 })
    if (!shot.scenario.pendingRequests && state !== 'offline') await page.waitForLoadState('networkidle')
    await page.evaluate(async () => {
      await document.fonts.ready
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    await page.waitForTimeout(300)
    return await page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      clip: shot.scenario.headerOnly ? { x: 0, y: 0, width: shot.width, height: 56 } : undefined,
    })
  } finally {
    await context.close()
  }
}
