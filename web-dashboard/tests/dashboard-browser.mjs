// Run after `npm run build`. Uses an installed Chromium through CDP; no test dependency required.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { preview } from 'vite';
import ts from 'typescript';

// Keep synthetic records outside the app; exercise its real email/password client.
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText).toString('base64');
const types = moduleUrl(await fs.readFile(new URL('../src/types.ts', import.meta.url), 'utf8'));
const fixture = await fs.readFile(new URL('./fixtures/network.ts', import.meta.url), 'utf8');
const { createTestData } = await import(moduleUrl(fixture.replace("'../../src/types'", JSON.stringify(types))));
const testData = createTestData();
const testEmail = 'qa.admin@example.com';
const testPassword = 'BrowserCheck123!';
let authenticated = false;
let logouts = 0;
const intercepted = [];

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
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const route = new URL(request.url).pathname.replace(/^\/api/, '');
      intercepted.push(request.url);
      void (async () => {
        const body = request.postData ? JSON.parse(request.postData) : {};
        let status = 200; let response = {};
        if (request.method === 'OPTIONS') { /* CORS preflight */ }
        else if (route === '/auth/login') {
          if (body.email === testEmail && body.password === testPassword) {
            authenticated = true;
            response = { accessToken: 'qa-access', refreshToken: 'qa-refresh', user: { id: 1, email: testEmail, role: 'admin' } };
          } else { status = 401; response = { error: 'Invalid credentials' }; }
        } else if (route === '/auth/logout') {
          assert.equal(body.refreshToken, 'qa-refresh'); authenticated = false; logouts++;
        } else if (!authenticated || request.headers.Authorization !== 'Bearer qa-access') {
          status = 401; response = { error: 'Sign in required' };
        } else {
          try { response = await testData(route + new URL(request.url).search, request.method, body); }
          catch (error) { status = 400; response = { error: error.message }; }
        }
        await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
          { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
          { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, OPTIONS' },
        ], body: Buffer.from(JSON.stringify(response)).toString('base64') });
      })().catch(error => errors.push(String(error)));
    }
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
    console.error('Browser state:', await evaluate('document.body.innerText'), 'Runtime errors:', errors);
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
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:4000/api/*' }] });
  // Stand in for Google's SDK so map callbacks are tested without billing or external requests.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.google = { maps: {
      Map: class {
        constructor(host) { host.textContent = 'Google Maps test surface'; }
        panTo(point) { window.qaMapPosition = point; }
        addListener(name, callback) { window.qaMapClick = callback; return { remove() { window.qaMapClick = null; } }; }
      },
      marker: { AdvancedMarkerElement: class {
        constructor(options) { this.position = options.position; this.map = options.map; }
        addListener(name, callback) { window.qaMarkerDrag = callback; return { remove() { window.qaMarkerDrag = null; } }; }
      } }
    } };
  ` });
  await width(1440); await send('Page.navigate', { url: 'http://127.0.0.1:5187/admin' });
  await wait(`document.querySelector('input[name="email"]')`);
  assert.equal(await evaluate(`document.body.innerText.toLowerCase().includes('demo')`), false);
  assert.equal(await evaluate(`document.querySelector('.brand-icon').complete && document.querySelector('.brand-icon').naturalWidth > 0`), true, 'Shared logo loads');
  await shot('login-desktop');
  for (const size of [320, 390, 768]) {
    await width(size);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, `Login fits ${size}px`);
  }
  await width(390); await shot('login-mobile'); await width(1440);
  await fill('[name="email"]', testEmail); await fill('[name="password"]', 'WrongPassword123!');
  await click('Sign in securely'); await wait(`document.querySelector('[role="alert"]')?.textContent.includes('Invalid credentials')`);
  assert.equal(await evaluate(`!!document.querySelector('.sidebar')`), false, 'Failed login stays on sign-in screen');
  await fill('[name="password"]', testPassword); await click('Sign in securely');
  await wait(`document.querySelector('h1')?.textContent === 'Network overview'`);
  assert.equal(await evaluate(`document.querySelectorAll('.metric-card').length`), 4);
  await shot('overview-desktop'); console.log('PASS: Logo, responsive login, rejected credentials and authenticated network overview');

  assert.equal(await evaluate(`!!document.querySelector('nav a[href="/admin/activity"]')`), false, 'Activity log navigation removed');
  assert.equal(backendCalls.some(url => url.includes('audit-logs')), false, 'Dashboard does not fetch audit history');
  await go('/blood-banks'); await click('Add blood bank');
  assert.equal(await evaluate(`document.querySelector('dialog button[type="submit"], dialog form .modal-footer .primary').disabled`), true, 'Create an account before adding a bank');
  assert.equal(await evaluate(`!!document.querySelector('dialog [name="password"]')`), false, 'Bank registration does not create credentials');
  await click('Cancel');
  await go('/bank-accounts'); await click('Create bank account');
  assert.equal(await evaluate(`!!document.querySelector('dialog [name="organizationId"]')`), false, 'Account creation does not require a bank');
  await fill('[name="accountEmail"]', 'qa.bank.login@example.com'); await fill('[name="password"]', 'TemporaryBank123!');
  await click('Create account'); await wait(`document.querySelector('dialog h2')?.textContent === 'Bank account created'`);
  await shot('account-created-first');
  await width(320);
  assert.ok(await evaluate(`document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth + 1`), 'Account creation handover fits mobile');
  await width(1440); await click('Done');
  await wait(`document.querySelector('tbody')?.innerText.includes('Awaiting blood bank')`);
  console.log('PASS: Create account first without a bank; it appears awaiting assignment');
  await go('/blood-banks'); await fill('.search-box input', 'No matching bank');
  await wait(`document.body.innerText.includes('No blood banks found')`);
  await fill('.search-box input', ''); await click('Add blood bank');
  await fill('[name="name"]', 'QA New Blood Bank'); await fill('[name="district"]', 'Colombo');
  await fill('[name="contactEmail"]', 'qa.bank@example.com'); await fill('[name="contactPhone"]', '+94112345678');
  await fill('[name="address"]', '12 Hospital Road, Colombo'); await fill('[name="branchName"]', 'Head office');
  const primaryId = await evaluate(`[...document.querySelector('[name="accountId"]').options].find(option => option.text === 'qa.bank.login@example.com').value`);
  await fill('[name="accountId"]', primaryId);
  await wait(`typeof window.qaMapClick === 'function'`);
  await evaluate(`window.qaMapClick({ latLng: { lat: () => 6.9271, lng: () => 79.8612 } })`);
  await wait(`document.querySelector('[name="latitude"]').value === '6.9271000'`);
  await evaluate(`window.qaMarkerDrag({ latLng: { lat: () => 6.93, lng: () => 79.87 } })`);
  await wait(`document.querySelector('[name="longitude"]').value === '79.8700000'`);
  await shot('bank-onboarding-desktop');
  await width(390); assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Bank onboarding fits mobile'); await shot('bank-onboarding-mobile'); await width(1440);
  // Native dialogs keep keyboard focus within the active modal.
  for (let i = 0; i < 14; i++) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); assert.equal(await evaluate(`document.activeElement === document.body || document.querySelector('dialog[open]').contains(document.activeElement)`), true); }
  await evaluate(`document.querySelector('nav a').focus()`);
  assert.equal(await evaluate(`document.activeElement !== document.querySelector('nav a')`), true, 'Background is inert while dialog is modal');
  await click('Add blood bank'); await wait(`document.querySelector('dialog h2')?.textContent === 'Blood bank account ready'`);
  assert.ok(await evaluate(`[...document.querySelectorAll('dialog input')].some(input => input.value === 'TemporaryBank123!')`), 'Credentials from account creation remain available for handover after linking');
  await shot('account-handover'); await click('Done');
  await fill('.search-box input', 'QA New Blood Bank'); await wait(`document.querySelector('tbody')?.innerText.includes('QA New Blood Bank')`);
  assert.ok(await evaluate(`document.querySelector('tbody').innerText.includes('Active')`));
  console.log('PASS: Bank creation, map pin placement and dragging, mobile onboarding, keyboard focus and credential handover');

  await go('/bank-accounts'); await fill('.search-box input', 'qa.bank.login@example.com');
  await wait(`document.querySelector('tbody')?.innerText.includes('qa.bank.login@example.com')`);
  assert.ok(await evaluate(`document.querySelector('tbody').innerText.includes('Password change required')`));
  await click('Suspend'); await click('Suspend account'); await wait(`!document.querySelector('dialog[open]')`);
  assert.ok(await evaluate(`document.querySelector('tbody').innerText.includes('Suspended')`));
  await click('Activate'); await click('Activate account'); await wait(`!document.querySelector('dialog[open]')`);
  await click('Create bank account');
  await fill('[name="accountEmail"]', 'qa.existing.bank@example.com'); await fill('[name="password"]', 'ExistingBank123!');
  await click('Create account'); await wait(`document.querySelector('dialog h2')?.textContent === 'Bank account created'`); await click('Done');
  await go('/blood-banks'); await fill('.search-box input', 'National Blood Centre'); await click('National Blood Centre'); await click('Assign bank account');
  assert.equal(await evaluate(`[...document.querySelector('[name="accountId"]').options].some(option => option.value === ${JSON.stringify(primaryId)})`), false, 'Assigned accounts are excluded from selection');
  const existingId = await evaluate(`[...document.querySelector('[name="accountId"]').options].find(option => option.text === 'qa.existing.bank@example.com').value`);
  await fill('[name="accountId"]', existingId); await click('Assign account'); await wait(`document.querySelector('dialog h2')?.textContent === 'Blood bank account ready'`); await click('Done');
  console.log('PASS: Account selection excludes already linked accounts; existing banks can receive a pre-created login');

  await go('/blood-banks'); await fill('.search-box input', 'QA New Blood Bank'); await click('QA New Blood Bank');
  await click('Edit details'); await fill('[name="name"]', 'QA Updated Blood Bank'); await click('Save changes');
  await wait(`!document.querySelector('dialog[open]')`); await fill('.search-box input', 'QA Updated Blood Bank'); await click('QA Updated Blood Bank');
  await click('Stock'); await wait(`document.body.innerText.includes('No inventory reported')`);
  await click('Staff'); await wait(`document.querySelector('dialog').innerText.includes('qa.bank.login@example.com')`);
  await click('Requests'); await wait(`document.body.innerText.includes('No active requests')`);
  await click('Suspend access'); await click('Suspend institution'); await wait(`!document.querySelector('dialog[open]')`);
  await click('QA Updated Blood Bank'); await click('Reactivate access'); await click('Reactivate institution'); await wait(`!document.querySelector('dialog[open]')`);
  console.log('PASS: Bank editing, scoped detail tabs, suspension and reactivation');

  await evaluate(`window.qaCsv = null; window.qaOriginalClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function() { if (this.download) window.qaCsv = fetch(this.href).then(r=>r.text()); else window.qaOriginalClick.call(this); };`);
  await click('Export CSV'); const csv = await evaluate('window.qaCsv');
  assert.ok(csv.includes('QA Updated Blood Bank') && !csv.includes('National Blood Centre'));
  console.log('PASS: CSV export contains only filtered institutions');
  await go('/approvals'); await click('Donor documents'); await click('Reject');
  await fill('[name="reason"]', 'Please supply a readable document.'); await click('Reject submission');
  await wait(`!document.querySelector('dialog[open]')`); assert.ok(await evaluate(`document.body.innerText.includes('No donor documents pending')`));
  console.log('PASS: Donor document rejection');

  await go('/bank-accounts'); await click('Create bank account');
  await fill('[name="accountEmail"]', 'qa.branch@example.com'); await fill('[name="password"]', 'BranchPassword123!');
  await click('Create account'); await wait(`document.querySelector('dialog h2')?.textContent === 'Bank account created'`); await click('Add blood bank');
  await wait(`document.querySelector('dialog h2')?.textContent === 'Add a blood bank'`);
  assert.ok(await evaluate(`document.querySelector('[name="accountId"]').selectedOptions[0].text === 'qa.branch@example.com'`), 'Account creation shortcut preselects the account in bank registration');
  await fill('[name="name"]', 'QA Colombo Branch'); await fill('[name="district"]', 'Colombo'); await fill('[name="address"]', 'Colombo branch address');
  const parentId = await evaluate(`[...document.querySelector('[name="parentOrganizationId"]').options].find(option => option.text.includes('QA Updated Blood Bank')).value`);
  await fill('[name="parentOrganizationId"]', parentId); await fill('[name="branchName"]', 'Colombo branch');
  await wait(`typeof window.qaMapClick === 'function'`); await evaluate(`window.qaMapClick({ latLng: { lat: () => 6.92, lng: () => 79.86 } })`);
  await click('Add blood bank'); await wait(`document.querySelector('dialog h2')?.textContent === 'Blood bank account ready'`); await click('Done');
  await fill('.search-box input', 'QA Colombo Branch'); await wait(`document.querySelector('tbody')?.innerText.includes('Colombo branch')`);
  await click('QA Colombo Branch');
  assert.ok(await evaluate(`document.querySelector('dialog').innerText.includes('QA Updated Blood Bank')`), 'Branch details show the main bank');
  assert.ok(await evaluate(`document.querySelector('dialog a[href*="google.com/maps"]').href.includes('6.92')`), 'Saved location opens Google Maps');
  await evaluate(`document.querySelector('dialog [aria-label="Close dialog"]').click()`);
  console.log('PASS: Branch registration, parent linkage, automatic bank code and saved Google Maps location');

  for (const page of ['', '/blood-banks', '/approvals', '/bank-accounts']) {
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
  assert.ok(backendCalls.length > 0, 'Dashboard uses HTTP authentication and API requests');
  assert.ok(backendCalls.every(url => intercepted.includes(url)), 'Every API request uses the isolated test server');
  assert.equal(errors.length, 0, 'No runtime exceptions');
  console.log('PASS: All 4 routes fit 320, 390, 768, 1024 and 1440px; mobile navigation works');
  await evaluate(`document.querySelector('[aria-label="Sign out"]').click()`);
  await wait(`document.querySelector('input[name="email"]')`);
  assert.equal(logouts, 1, 'Sign-out revokes the refresh token');
  await send('Page.navigate', { url: 'http://127.0.0.1:5187/admin/bank-accounts' });
  await wait(`document.querySelector('input[name="email"]')`);
  assert.equal(await evaluate(`!!document.querySelector('.sidebar')`), false, 'Direct protected routes require sign-in');
  assert.equal(errors.length, 0, 'No runtime exceptions');
  console.log('PASS: Sign-out revokes the session and protected routes require sign-in');
  console.log('All dashboard browser checks passed. Screenshots: ' + output);
} finally {
  if (socket) socket.close(); browser.kill(); await new Promise(resolve => server.httpServer.close(resolve));
  // Only remove the uniquely-created test profile under the OS temp directory.
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('bloodlink-admin-browser-')) {
    await delay(500); await fs.rm(resolved, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 }).catch(() => {});
  }
}
