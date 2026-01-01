/**
 * Screenshots of the current build in the same states, themes and widths as `design/`
 * (`<screen>__<state>__<theme>__<width>.png`). It only takes pictures; comparing them with
 * `design/` is up to you.
 *
 *   npm run dev              # app + simulator, in another terminal
 *   npm run shots            # all states into shots/
 *   npm run shots -- ticket  # only files whose name contains "ticket"
 *
 * Env: BASE_URL (default http://localhost:5173), SIM_URL (default http://localhost:4010),
 * OUT (default shots). Every shot resets the simulator data and pauses its scenario engine.
 * The reference images were taken in the official Playwright Docker image; fonts rendered by
 * another OS can differ slightly.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { LAUNCH_ARGS, shotList, takeShot } from './scenarios'

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173'
const simUrl = process.env.SIM_URL ?? 'http://localhost:4010'
const out = process.env.OUT ?? 'shots'
const filter = process.argv[2]

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: LAUNCH_ARGS })
let failed = 0
try {
  for (const shot of shotList(filter)) {
    try {
      writeFileSync(join(out, shot.file), await takeShot(browser, shot, baseUrl, simUrl))
      console.log(`${shot.file}`)
    } catch (err) {
      failed++
      console.error(`could not take ${shot.file}: ${(err as Error).message.split('\n')[0]}`)
    }
  }
} finally {
  await browser.close()
}
console.log(`${failed ? `${failed} failed, ` : ''}screenshots in ${out}/`)
process.exit(failed ? 1 : 0)
