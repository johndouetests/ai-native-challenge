export const panelHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulator controls</title>
<style>
  body { font: 14px/20px system-ui, sans-serif; margin: 24px; max-width: 760px; color: #0f172a; background: #f8fafc; }
  h1 { font-size: 20px; }
  section { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid #94a3b8; background: #fff; cursor: pointer; margin: 2px 4px 2px 0; }
  button:hover { background: #f1f5f9; }
  input, select { font: inherit; padding: 5px 8px; border-radius: 6px; border: 1px solid #94a3b8; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow: auto; }
  label { margin-right: 8px; }
</style>
</head>
<body>
<h1>Deskline simulator</h1>
<p>Controls for reproducing network and realtime conditions. See SIMULATOR.md.</p>
<section>
  <h2>Connection</h2>
  <button data-post="/__sim/disconnect">Disconnect all sockets</button>
  <button data-post="/__sim/stall">Stall (no frames)</button>
  <button data-post="/__sim/unstall">Unstall</button>
</section>
<section>
  <h2>Scenario engine</h2>
  <button data-post="/__sim/pause">Pause</button>
  <button data-post="/__sim/resume">Resume</button>
  <button data-post="/__sim/reset">Reset data</button>
</section>
<section>
  <h2>Latency</h2>
  <label>ms <input id="latency" type="number" value="1500" min="0" max="60000"></label>
  <button id="set-latency">Apply</button>
  <button id="clear-latency">Clear</button>
</section>
<section>
  <h2>Fail next requests</h2>
  <label>method <input id="fail-method" value="GET" size="6"></label>
  <label>path prefix <input id="fail-path" value="/api/tickets" size="24"></label>
  <label>status <input id="fail-status" type="number" value="500" style="width:80px"></label>
  <label>times <input id="fail-times" type="number" value="1" min="1" style="width:64px"></label>
  <button id="fail">Add rule</button>
</section>
<section>
  <h2>Emit event</h2>
  <label>type <select id="emit-type">
    <option>message.created</option><option>typing</option><option>ticket.updated</option><option>ticket.created</option>
  </select></label>
  <label>ticketId <input id="emit-ticket" value="t_1001" size="8"></label>
  <button id="emit">Emit</button>
</section>
<h2>State</h2>
<pre id="out">loading…</pre>
<script>
  const out = document.getElementById('out')
  async function call(path, body) {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })
    out.textContent = path + ' → ' + res.status + '\\n' + (await res.text())
    setTimeout(refresh, 600)
  }
  async function refresh() {
    const res = await fetch('/__sim/state')
    out.textContent = JSON.stringify(await res.json(), null, 2)
  }
  document.querySelectorAll('[data-post]').forEach((b) => b.addEventListener('click', () => call(b.dataset.post)))
  document.getElementById('set-latency').onclick = () => call('/__sim/latency', { ms: Number(document.getElementById('latency').value) })
  document.getElementById('clear-latency').onclick = () => call('/__sim/latency', { ms: 0 })
  document.getElementById('fail').onclick = () => call('/__sim/fail', {
    method: document.getElementById('fail-method').value,
    pathPrefix: document.getElementById('fail-path').value,
    status: Number(document.getElementById('fail-status').value),
    times: Number(document.getElementById('fail-times').value),
  })
  document.getElementById('emit').onclick = () => call('/__sim/emit', {
    type: document.getElementById('emit-type').value,
    ticketId: document.getElementById('emit-ticket').value,
  })
  refresh()
</script>
</body>
</html>
`
