// End-to-end test: builds are served with `vite preview`, driven in headless Chrome over the
// DevTools protocol, with assertions, axe accessibility checks, overflow checks and console
// error capture. It builds the app itself, in demo mode. Usage: pnpm e2e   (env CHROME=path to override the Chrome binary)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const PORT = 4174;
const BASE = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
const SHOTS = join(app, 'e2e', 'screenshots');
const AXE = readFileSync(join(app, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

// ---------- build in demo mode ----------
// The checks below expect demo mode (sample family, scripted answers). A filled .env.local would
// build a live app, so the Firebase keys are blanked here: Vite lets real environment variables
// override .env files, and blank keys mean firebaseConfigured is false. It builds into dist-e2e,
// never dist, so a demo build can never be shipped by `cap sync` or a Hosting deploy.
const OUT = 'dist-e2e';
const demoEnv = { ...process.env, VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_PROJECT_ID: '' };
const built = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'tsc', '-b', '&&', 'pnpm', 'exec', 'vite', 'build', '--outDir', OUT, '--emptyOutDir'],
  { cwd: app, env: demoEnv, shell: true, stdio: 'inherit' });
if (built.status !== 0) throw new Error('Demo build failed');

// ---------- start preview server ----------
// A leftover server on the port would be tested instead of this build (with --strictPort the new
// one just exits), so refuse to run rather than report results for the wrong build.
if (await fetch(BASE).then(() => true, () => false)) {
  throw new Error(`Port ${PORT} is already in use (a leftover vite preview?). Stop it and rerun.`);
}
const server = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'], { cwd: app, shell: process.platform === 'win32', stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch {}
  await sleep(250);
}

// ---------- start chrome ----------
const port = 9400 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), `sprout-e2e-${port}`);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ws;
let opened;
for (let i = 0; i < 60 && !ws; i++) {
  try {
    const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    if (page) {
      ws = new WebSocket(page.webSocketDebuggerUrl);
      // Listen immediately: the open event can fire before the next await.
      opened = new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
      break;
    }
  } catch {}
  await sleep(250);
}
if (!ws) throw new Error('Could not connect to headless Chrome');
await Promise.race([opened, sleep(10000).then(() => { throw new Error('Chrome connection timed out'); })]);
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const text = () => js('document.body.innerText');
const click = (label) => js(`(() => { const b = [...document.querySelectorAll('button, a, [role=tab]')].find(x => x.textContent.trim().includes(${JSON.stringify(label)})); if (!b) return false; b.click(); return true; })()`);
// Types like a user: set the value, let React re-render, then press the real Send button.
const type = async (value) => {
  const ok = await js(`(() => { const i = document.querySelector('.k-composer textarea, .k-composer input, form input[type=text], textarea, input:not([type])'); if (!i) return false; const p = i.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  if (!ok) return false;
  await sleep(150);
  return js(`(() => { const b = document.querySelector('button[aria-label="Send question"]'); if (!b || b.disabled) return false; b.click(); return true; })()`);
};
const lastTurn = () => js(`(() => { try { const t = JSON.parse(localStorage.getItem('sprout:turns')); const x = t[t.length - 1]; return x.route + ' ' + x.answerWhere + ' ' + x.steps.map(s => s.task + '@' + s.where).join(','); } catch (e) { return String(e); } })()`);
const waitFor = async (pred, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(pred)) return true; await sleep(200); } return false; };
const size = async (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
const shot = async (name) => { mkdirSync(SHOTS, { recursive: true }); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64')); };
const overflow = () => js('document.documentElement.scrollWidth > window.innerWidth + 1');
const axe = async (label) => {
  await js(`window.axe || (eval(${JSON.stringify(AXE)}), true)`);
  const v = await js(`axe.run(document, { resultTypes: ['violations'] }).then(r => r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help })))`);
  const bad = (v || []).filter((x) => x.impact === 'serious' || x.impact === 'critical');
  if (bad.length && process.env.E2E_DEBUG) {
    const detail = await js(`axe.run(document, { resultTypes: ['violations'] }).then(r => r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').flatMap(v => v.nodes.slice(0, 12).map(n => v.id + ' ' + n.target.join(' ') + ' :: ' + (n.any[0]?.message || '').slice(0, 110))))`);
    for (const line of detail || []) console.log(`  ${line}`);
  }
  check(`axe: no serious/critical issues on ${label}`, bad.length === 0, bad.map((x) => `${x.id} x${x.n}`).join(', '));
  return v || [];
};

const allAxe = {};
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  // Audit the settled UI: with reduced motion, entrance animations do not run, so colour
  // contrast is measured on final colours (the kid UI honours prefers-reduced-motion).
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await size(390, 844);
  await send('Page.navigate', { url: BASE });
  await sleep(1200);
  await js('localStorage.clear(); sessionStorage.clear()');
  await send('Page.navigate', { url: BASE });
  await sleep(1500);

  // Welcome
  check('welcome: promise headline shown', /identity never leaves this device/i.test(await text()));
  check('welcome: demo mode ribbon shown', /Demo/i.test(await text()));
  allAxe.welcome = await axe('welcome');
  await shot('welcome');

  // Sample family -> kid chat
  check('sample: button works', await click('Try a sample family'));
  check('sample: kid chat loads with 5 answers', await waitFor(`document.body.innerText.includes('Hi Aarav')`, 20000) && await waitFor(`document.querySelectorAll('[class*=bubble]').length >= 10 || document.body.innerText.includes('From Sprout')`, 20000));
  const kidText = await text();
  check('kid: an answer ran on the device', /Sprout knew this!/.test(kidText));
  check('kid: an answer used the big brain', /Asked the big brain/.test(kidText));
  check('kid: distress got a care message', /From Sprout/.test(kidText));
  check('kid: care card does not claim a grown-up was notified', !/has been (told|let know)/i.test(kidText));
  check('kid: private details badge shown', /secrets kept/i.test(kidText));
  allAxe.kid = await axe('kid chat');
  await shot('kid-chat');

  // What the big brain saw
  await js(`(() => { const b = [...document.querySelectorAll('button')].find(x => /secrets kept/i.test(x.textContent)); b && b.click(); })()`);
  await sleep(500);
  const saw = await js(`(() => { const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^the big brain only heard$/i.test(e.textContent.trim())); if (!h) return null; let box = h.parentElement; return box ? box.innerText : null; })()`);
  check('seen panel: opens', !!saw);
  check('seen panel: cloud view hides the name and school', !!saw && !/Aarav|Green Park/.test(saw.replace(/^[\s\S]*?big brain only heard/i, '')), saw ? saw.slice(0, 80).replace(/\n/g, ' ') : '');
  allAxe.seen = await axe('seen panel');

  // Ask a question with a name in it
  check('kid: can type a question', await type('My friend Riya wonders why do cats purr?'));
  check('kid: answer arrives', await waitFor(`document.body.innerText.includes('tiny muscles')`, 15000));
  check('kid: a "why" question goes to the big brain', /^cloud cloud/.test(await lastTurn()), await lastTurn());

  // Offline -> queued -> online upgrade
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await js(`window.dispatchEvent(new Event('offline'))`);
  await sleep(300);
  await type('why is the sky blue?');
  if (process.env.E2E_DEBUG) { await sleep(4000); console.log('OFFLINE TEXT:', JSON.stringify((await text()).slice(-400))); }
  check('offline: quick answer queued for the big brain', await waitFor(`/when we.re online|when we.re back online/i.test(document.body.innerText)`, 15000));
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await js(`window.dispatchEvent(new Event('online'))`);
  check('online: big brain upgrade appears', await waitFor(`document.body.innerText.includes('The big brain added more')`, 15000));
  await shot('kid-offline-upgrade');

  // A real (non-sample) distress message: instant care reply, no AI call needed.
  await type('i feel so alone and i cry myself to sleep');
  check('kid: real distress message gets the care card', await waitFor(`(document.body.innerText.match(/From Sprout/g) || []).length >= 2`, 8000));
  check('kid: curly apostrophe distress is caught', await type('I don’t want to live anymore') && await waitFor(`(document.body.innerText.match(/From Sprout/g) || []).length >= 3`, 8000));

  // Parent area
  await js(`location.hash = '/parent'`);
  await sleep(600);
  allAxe.gate = await axe('parent gate');
  const q = await js(`document.body.innerText.match(/(\\d+)\\s*[x×]\\s*(\\d+)/)?.slice(1).map(Number)`);
  check('parent gate: question shown', Array.isArray(q));
  if (q) {
    await js(`(() => { const i = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '${q[0] * q[1]}'); i.dispatchEvent(new Event('input', { bubbles: true })); (i.form)?.requestSubmit(); })()`);
  }
  check('parent: dashboard unlocks', await waitFor(`/private details sent to the cloud/i.test(document.body.innerText)`, 5000));
  const ov = await text();
  check('parent: zero private details sent to the cloud', /\b0\s*\n?\s*private details sent to the cloud/i.test(ov));
  allAxe.overview = await axe('parent overview');
  await shot('parent-overview');
  for (const [tab, expect] of [['Alerts', /Bullying/], ['Activity', /hidden|Show questions/i], ['Weekly', /Write this week/i], ['Settings', /Simulate on-device model/i], ['Family', /alerts on your own phone|Sign in/i]]) {
    check(`parent: ${tab} tab opens`, await click(tab) && await waitFor(`${expect}.test(document.body.innerText)`, 4000));
    allAxe[tab] = await axe(`parent ${tab}`);
  }

  // Clear history keeps safety alerts
  await click('Settings');
  await sleep(300);
  await click('Clear conversation history');
  await sleep(200);
  await click('Yes, delete');
  await sleep(300);
  check('settings: clearing history removes conversations', await waitFor(`/History cleared/.test(document.body.innerText)`, 3000));
  await click('Alerts');
  const alertsText = await text();
  check('settings: real safety alerts survive clearing history', /Self-harm|self harm|Sad or scared|Feeling/i.test(alertsText) && /alone and i cry/i.test(alertsText));
  check('settings: sample-family alerts are cleared with the sample', !/kids at school say/i.test(alertsText));

  // Parent PIN: set it, lock, wrong PIN refused, right PIN unlocks.
  const fill = (sel, v) => js(`(() => { const i = document.querySelectorAll(${JSON.stringify(sel)}); return [...i].map(el => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 1; }).length; })()`);
  await click('Settings');
  await sleep(300);
  check('pin: Settings offers a parent PIN', /Parent PIN/.test(await text()));
  await fill('input[autocomplete="new-password"]', '4821');
  await sleep(150);
  await click('Set PIN');
  check('pin: PIN saved', await waitFor(`/PIN saved/.test(document.body.innerText)`, 3000));
  await click('Lock and go back');
  await sleep(300);
  await js(`location.hash = '/parent'`);
  await sleep(500);
  check('pin: gate now asks for the PIN, not math', /Parent PIN/.test(await text()) && !/What is \d+ x \d+/.test(await text()));
  await fill('#gate-a', '0000');
  await sleep(100);
  await click('Continue');
  check('pin: wrong PIN is refused', await waitFor(`/not right/.test(document.body.innerText)`, 3000));
  await fill('#gate-a', '4821');
  await sleep(100);
  await click('Continue');
  check('pin: right PIN unlocks', await waitFor(`/private details sent to the cloud/i.test(document.body.innerText)`, 3000));

  // Dark mode accessibility.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'dark' }] });
  await sleep(300);
  allAxe.darkOverview = await axe('parent overview (dark)');
  await js(`location.hash = '/kid'`);
  await sleep(500);
  allAxe.darkKid = await axe('kid chat (dark)');
  await shot('kid-dark');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  // Layout at three widths
  for (const [w, h] of [[360, 740], [390, 844], [1280, 820]]) {
    await size(w, h);
    for (const route of ['/kid', '/parent']) {
      await js(`location.hash = '${route}'`);
      await sleep(400);
      check(`layout: no horizontal scroll at ${w}px on ${route}`, !(await overflow()));
    }
  }
  await shot('desktop-parent');

  check('no console errors or uncaught exceptions', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('e2e run completed', false, String(e?.stack || e));
} finally {
  const moderate = Object.entries(allAxe).flatMap(([k, v]) => v.filter((x) => x.impact === 'moderate' || x.impact === 'minor').map((x) => `${k}: ${x.id} (${x.impact}) x${x.n}`));
  if (moderate.length) console.log(`\naxe moderate/minor notes:\n  ${[...new Set(moderate)].join('\n  ')}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: e2e/screenshots/`);
  try { ws.close(); } catch {}
  chrome.kill();
  // On Windows the server runs under a cmd wrapper: kill the whole tree first (synchronously), or
  // killing the wrapper orphans vite preview, which then keeps serving the port for later runs.
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(failed.length ? 1 : 0);
}
