import { createSimulator } from './app'

const port = Number(process.env.SIM_PORT ?? 4010)
const host = process.env.SIM_HOST ?? 'localhost'
const now = process.env.SIM_NOW ? Date.parse(process.env.SIM_NOW) : undefined

const sim = await createSimulator({
  scenario: process.env.SIM_SCENARIO !== 'off',
  validate: process.env.SIM_VALIDATE === '1',
  now: Number.isNaN(now) ? undefined : now,
})
if (process.env.SIM_SCENARIO === 'paused') sim.scenario.paused = true

await sim.app.listen({ port, host })
console.log(`Simulator listening on http://localhost:${port} (controls: http://localhost:${port}/__sim)`)

const shutdown = async () => {
  await sim.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
