// Run after `npm run build`. Uses an installed Chromium through CDP; no test dependency required.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { preview } from 'vite';

const chromium = process.env.CHROMIUM_PATH;
if (!chromium) throw new Error('Set CHROMIUM_PATH to an installed Chromium/Chrome executable.');
const output = path.resolve(process.env.QA_OUTPUT || '../.qa-private/super-admin-review');
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'bloodlink-admin-browser-'));
const server = await preview({ preview: { host: '127.0.0.1', port: 5187, strictPort: true } });
const browser = spawn(chromium, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let port;
  for (let i = 0; i < 120; i++) {
    const text = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
    if (text) { port = Number(text.split('\n')[0]); break; }
    await delay(250);
  }
  assert.ok(port, 'Chromium started');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const debuggerUrl = targets.find(target => target.type === 'page').webSocketDebuggerUrl.replace('localhost', '127.0.0.1');
  socket = new WebSocket(debuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = event => reject(new Error(`Chromium connection failed: ${event.message || event.error?.message || debuggerUrl}`)); });
  let id = 0;
  const pending = new Map(); const errors = []; const backendCalls = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes(':4000/')) backendCalls.push(message.params.request.url);
    if (message.id && pending.has(message.id)) {
      const work = pending.get(message.id); pending.delete(message.id); clearTimeout(work.timeout);
      if (message.error) work.reject(new Error(JSON.stringify(message.error))); else work.resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(requestId, { resolve, reject, timeout }); socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); }
    throw new Error('Timed out: ' + expression);
  };
  const click = async text => {
    await evaluate(`(() => { const scope = [...document.querySelectorAll('dialog[open]')].at(-1) || document; const buttons = [...scope.querySelectorAll('button')]; const button = buttons.find(b => b.textContent.trim() === ${JSON.stringify(text)}) || buttons.find(b => b.textContent.includes(${JSON.stringify(text)})); if (!button) throw new Error('Missing button: ' + ${JSON.stringify(text)}); button.click(); })()`);
    await delay(100);
  };
  const fill = async (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing field'); const type = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(type.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
  const go = async page => { await evaluate(`document.querySelector('nav a[href="/admin${page}"]').click()`); await delay(150); };
  const shot = async name => { await evaluate('document.fonts.ready.then(() => true)'); const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await fs.writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64')); };
  const width = async value => { await send('Emulation.setDeviceMetricsOverride', { width: value, height: 1000, deviceScaleFactor: 1, mobile: false }); await delay(300); };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await width(1440); await send('Page.navigate', { url: 'http://127.0.0.1:5187/admin' });
  await wait(`document.body.innerText.includes('Open demo dashboard')`);
  await shot('login-desktop'); await click('Open demo dashboard');
  await wait(`document.querySelector('h1')?.textContent === 'Network overview'`);
  assert.equal(await evaluate(`document.querySelectorAll('.metric-card').length`), 4);
  await shot('overview-desktop'); console.log('PASS: Demo login and network overview');

  await go('/blood-banks'); await fill('.search-box input', 'No matching bank');
  await wait(`document.body.innerText.includes('No blood banks found')`);
  await fill('.search-box input', ''); await click('Add blood bank');
  await fill('[name="name"]', 'QA New Blood Bank'); await fill('[name="district"]', 'Colombo');
  await fill('[name="contactEmail"]', 'qa.bank@example.com'); await fill('[name="contactPhone"]', '+94112345678');
  // Native dialogs keep keyboard focus within the active modal.
  for (let i = 0; i < 14; i++) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); assert.equal(await evaluate(`document.activeElement === document.body || document.querySelector('dialog[open]').contains(document.activeElement)`), true); }
  await evaluate(`document.querySelector('nav a').focus()`);
  assert.equal(await evaluate(`document.activeElement !== document.querySelector('nav a')`), true, 'Background is inert while dialog is modal');
  await click('Add blood bank'); await wait(`!document.querySelector('dialog[open]')`);
  await fill('.search-box input', 'QA New Blood Bank'); await wait(`document.querySelector('tbody')?.innerText.includes('QA New Blood Bank')`);
  await click('QA New Blood Bank'); await click('Approve institution'); await click('Approve registration');
  await wait(`!document.querySelector('dialog[open]')`);
  assert.ok(await evaluate(`document.querySelector('tbody').innerText.includes('Active')`));
  console.log('PASS: Directory search, create bank, keyboard focus trap and approval');

  await go('/staff'); await click('Add staff account');
  const bankId = await evaluate(`[...document.querySelector('[name="organizationId"]').options].find(o=>o.text==='QA New Blood Bank').value`);
  await fill('[name="organizationId"]', bankId); await fill('[name="email"]', 'qa.staff@example.com'); await fill('[name="password"]', 'TestPassword123!');
  await click('Create account'); await wait(`!document.querySelector('dialog[open]')`);
  await fill('.search-box input', 'qa.staff@example.com');
  await wait(`document.querySelector('tbody')?.innerText.includes('qa.staff@example.com')`);
  await click('Suspend'); await click('Suspend account'); await wait(`!document.querySelector('dialog[open]')`);
  assert.ok(await evaluate(`document.querySelector('tbody').innerText.includes('Inactive / awaiting approval')`));
  await click('Activate'); await click('Activate account'); await wait(`!document.querySelector('dialog[open]')`);
  console.log('PASS: Staff provisioning, suspension and activation');

  await go('/blood-banks'); await fill('.search-box input', 'QA New Blood Bank'); await click('QA New Blood Bank');
  await click('Edit details'); await fill('[name="name"]', 'QA Updated Blood Bank'); await click('Save changes');
  await wait(`!document.querySelector('dialog[open]')`); await fill('.search-box input', 'QA Updated Blood Bank'); await click('QA Updated Blood Bank');
  await click('Stock'); await wait(`document.body.innerText.includes('No inventory reported')`);
  await click('Staff'); await wait(`document.querySelector('dialog').innerText.includes('qa.staff@example.com')`);
  await click('Requests'); await wait(`document.body.innerText.includes('No active requests')`);
  await click('Suspend access'); await click('Suspend institution'); await wait(`!document.querySelector('dialog[open]')`);
  await click('QA Updated Blood Bank'); await click('Reactivate access'); await click('Reactivate institution'); await wait(`!document.querySelector('dialog[open]')`);
  console.log('PASS: Bank editing, scoped detail tabs, suspension and reactivation');

  await evaluate(`window.qaCsv = null; window.qaOriginalClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function() { if (this.download) window.qaCsv = fetch(this.href).then(r=>r.text()); else window.qaOriginalClick.call(this); };`);
  await click('Export CSV'); const csv = await evaluate('window.qaCsv');
  assert.ok(csv.includes('QA Updated Blood Bank') && !csv.includes('National Blood Centre'));
  console.log('PASS: CSV export contains only filtered institutions');
  await go('/activity'); await fill('.search-box input', 'QA Updated Blood Bank');
  await wait(`document.querySelector('tbody').innerText.includes('Organization suspended')`);
  assert.ok(await evaluate(`document.querySelector('tbody').innerText.includes('Organization reactivated')`));
  await go('/approvals'); await click('Donor documents'); await click('Reject');
  await fill('[name="reason"]', 'Please supply a readable document.'); await click('Reject submission');
  await wait(`!document.querySelector('dialog[open]')`); assert.ok(await evaluate(`document.body.innerText.includes('No donor documents pending')`));
  console.log('PASS: Audit activity and donor document rejection');

  for (const page of ['', '/blood-banks', '/approvals', '/staff', '/activity']) {
    await go(page);
    for (const size of [320, 390, 768, 1024, 1440]) {
      await width(size);
      const fits = await evaluate('document.documentElement.scrollWidth <= innerWidth + 1');
      if (!fits) { await shot('overflow-' + size); console.log(await evaluate(`JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,16).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right}))})`)); }
      assert.ok(fits, `Page overflow at ${page || 'overview'} ${size}px`);
    }
  }
  await go(''); await width(390); await shot('overview-mobile');
  await evaluate(`document.querySelector('[aria-label="Open navigation"]').click()`); await wait(`document.querySelector('.sidebar-open')`);
  await evaluate(`document.querySelector('nav a[href="/admin/blood-banks"]').click()`); await wait(`!document.querySelector('.sidebar-open')`);
  await width(1440); await shot('directory-desktop'); await go('/approvals'); await shot('approvals-desktop');
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0, 'Auth tokens never enter browser storage');
  assert.equal(backendCalls.length, 0, 'Demo never contacts the live API');
  assert.equal(errors.length, 0, 'No runtime exceptions');
  console.log('PASS: All 5 routes fit 320, 390, 768, 1024 and 1440px; mobile navigation works');
  await click('Exit demo'); await wait(`document.body.innerText.includes('Open demo dashboard')`);
  await click('Open demo dashboard'); await wait(`document.querySelector('h1')?.textContent === 'Network overview'`);
  await go('/blood-banks'); await fill('.search-box input', 'QA Updated Blood Bank');
  await wait(`document.body.innerText.includes('No blood banks found')`);
  console.log('PASS: Leaving demo resets all sample changes');
  console.log('All dashboard browser checks passed. Screenshots: ' + output);
} finally {
  if (socket) socket.close(); browser.kill(); await new Promise(resolve => server.httpServer.close(resolve));
  // Only remove the uniquely-created test profile under the OS temp directory.
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('bloodlink-admin-browser-')) {
    await delay(500); await fs.rm(resolved, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 }).catch(() => {});
  }
}
