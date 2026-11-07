// Real browser + API + disposable PostgreSQL. No application database records are modified.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { preview } from 'vite';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../../backend/.env', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
const { Pool } = require('pg');
const configured = process.env.TEST_DATABASE_URL || process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(configured, 'Configure TEST_DATABASE_URL or a local database connection for disposable browser checks');
if (!process.env.TEST_DATABASE_URL) assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(configured).hostname), 'Remote browser tests require explicit TEST_DATABASE_URL');
const chromium = process.env.CHROMIUM_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
assert.ok(chromium, 'Set CHROMIUM_PATH to an installed Chrome/Chromium');
const databaseName = 'bloodlink_browser_' + crypto.randomBytes(8).toString('hex');
const admin = new Pool({ connectionString: configured, connectionTimeoutMillis: 5000 });
let pool, apiServer, server, browser, socket, profile, created = false;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = path.resolve(process.env.QA_OUTPUT || '../.qa-private/bank-dashboard-review');
const password = 'BrowserCheck123!', newPassword = 'NewBankPassword123!';

try {
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  const connection = new URL(configured); connection.pathname = '/' + databaseName;
  Object.assign(process.env, { DATABASE_URL: connection.toString(), NODE_ENV: 'test', EMAIL_TRANSPORT: 'console', PUSH_TRANSPORT: 'disabled', RATE_LIMIT_STORE: 'memory', SEED_DEMO_DATA: 'false', JWT_ACCESS_SECRET: crypto.randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('hex') });
  pool = require('./dist/db').pool;
  await require('./dist/migrate').runMigrations(true);
  const hash = await require('./dist/services/password.service').hashPassword(password);
  const organization = async name => (await pool.query(`INSERT INTO organizations(name,type,district,address,latitude,longitude,verification_status)
    VALUES ($1,'bloodbank','Ratnapura','Hospital Road, Ratnapura',6.68,80.40,'approved') RETURNING id`, [name])).rows[0].id;
  const bankA = await organization('Sabaragamuwa General Hospital'), bankB = await organization('Ratnapura District Blood Bank');
  async function user(email, role, org = null, temporary = false) {
    return (await pool.query(`INSERT INTO users(email,password_hash,role,organization_id,is_bank_account,must_change_password)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [email, hash, role, org, role === 'bloodbank_staff', temporary])).rows[0].id;
  }
  await user('bank.a@example.test', 'bloodbank_staff', bankA, true);
  await user('bank.b@example.test', 'bloodbank_staff', bankB);
  await user('super.admin@example.test', 'admin');
  const donorId = await user('donor@example.test', 'donor');
  await pool.query(`INSERT INTO donor_profiles(user_id,full_name,blood_group,blood_group_verified,phone,latitude,longitude,consent_status,consent_recorded_at,availability_updated_at)
    VALUES ($1,'Test Donor','O-',true,'+94771234567',6.6801,80.4001,'granted',NOW(),NOW())`, [donorId]);
  for (const [i, group] of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].entries()) {
    const units = [42, 8, 31, 3, 18, 2, 55, 7][i];
    await pool.query('INSERT INTO blood_stocks(organization_id,blood_group,available_units,status) VALUES($1,$2,$3,$4)', [bankA, group, units, units <= 2 ? 'Critical' : units < 10 ? 'Low' : 'Normal']);
  }
  apiServer = http.createServer(require('./dist/app').createApp());
  await new Promise(resolve => apiServer.listen(0, '127.0.0.1', resolve));
  const apiBase = `http://127.0.0.1:${apiServer.address().port}/api`;
  const resetLimits = () => { for (const limiter of Object.values(require('./dist/middleware/rateLimiter.middleware'))) limiter.resetKey('127.0.0.1'); };
  async function api(route, token, body) {
    resetLimits(); const response = await fetch(apiBase + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, ...(body && { body: JSON.stringify(body) }) });
    const data = await response.json(); assert.ok(response.ok, `API ${route} returned ${response.status}: ${JSON.stringify(data)}`); return data;
  }
  const donorSession = await api('/auth/login', null, { email: 'donor@example.test', password });
  server = await preview({ preview: { host: '127.0.0.1', port: 5188, strictPort: true } });
  await fs.mkdir(output, { recursive: true });
  profile = await fs.mkdtemp(path.join(os.tmpdir(), 'bloodlink-bank-browser-'));
  browser = spawn(chromium, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100; i++) { const text = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => ''); if (text) { port = Number(text.split('\n')[0]); break; } await delay(200); }
  assert.ok(port, 'Chromium started');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl.replace('localhost', '127.0.0.1'));
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0; const pending = new Map(), errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      void (async () => {
        let status = 204, body = '';
        if (request.method !== 'OPTIONS') {
          resetLimits(); const route = new URL(request.url).pathname.replace(/^\/api/, '') + new URL(request.url).search;
          const response = await fetch(apiBase + route, { method: request.method, headers: { 'Content-Type': 'application/json', ...(request.headers.Authorization && { Authorization: request.headers.Authorization }) }, ...(request.postData && { body: request.postData }) });
          status = response.status; body = await response.text();
        }
        await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' }], body: Buffer.from(body).toString('base64') });
      })().catch(error => errors.push(String(error)));
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.id && pending.has(message.id)) { const work = pending.get(message.id); pending.delete(message.id); clearTimeout(work.timer); message.error ? work.reject(new Error(JSON.stringify(message.error))) : work.resolve(message.result); }
  };
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const wait = async expression => { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error(`Timeout: ${expression}\n${await evaluate('document.body.innerText')}`); };
  const click = async text => { await evaluate(`(() => { const scope = [...document.querySelectorAll('dialog[open]')].at(-1) || document; const buttons = [...scope.querySelectorAll('button')]; const el = buttons.find(b => b.textContent.trim() === ${JSON.stringify(text)}) || buttons.find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (!el) throw new Error('Missing button: ' + ${JSON.stringify(text)}); el.click(); })()`); await delay(120); };
  const fill = async (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing field ' + ${JSON.stringify(selector)}); const type = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(type.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
  const go = async route => { await evaluate(`document.querySelector('nav a[href=${JSON.stringify(route)}]').click()`); await delay(200); };
  const width = async size => { await send('Emulation.setDeviceMetricsOverride', { width: size, height: 1000, deviceScaleFactor: 1, mobile: false }); await delay(150); };
  const shot = async name => { await evaluate('document.querySelector(".toast [aria-label=\\"Dismiss notification\\"]")?.click(); window.scrollTo(0, 0); document.fonts.ready.then(() => true)'); const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await fs.writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64')); };
  const login = async (email, secret = password) => { await wait(`document.querySelector('[name="email"]')`); await fill('[name="email"]', email); await fill('[name="password"]', secret); await click('Sign in securely'); };
  const logout = async () => { const bank = await evaluate('!!document.querySelector(".bank-workspace")'); await evaluate(`document.querySelector('[aria-label="Sign out"]').click()`); if (bank) await click('Sign out'); await wait('document.querySelector("[name=email]")'); };
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:4000/api/*' }] });
  await width(1440); await send('Page.navigate', { url: 'http://127.0.0.1:5188' });
  await login('bank.a@example.test'); await wait('document.querySelector("[name=currentPassword]")');
  await fill('[name="currentPassword"]', password); await fill('[name="password"]', newPassword); await fill('[name="confirmPassword"]', newPassword); await click('Update password');
  await login('bank.a@example.test', newPassword); await wait('document.querySelector("h1")?.textContent === "Blood bank dashboard"');
  assert.equal(await evaluate('document.querySelectorAll(".bank-group").length'), 8);
  await shot('01-dashboard'); console.log('PASS: Bank login requires temporary-password replacement and opens the institution workspace');
  await go('/bank/stock'); await evaluate('document.querySelectorAll(".bank-stock-card button")[0].click()'); await fill('[name="availableUnits"]', '43'); await click('Save stock');
  await wait('!document.querySelector("dialog[open]")');
  assert.equal((await pool.query('SELECT available_units FROM blood_stocks WHERE organization_id=$1 AND blood_group=$2', [bankA, 'A+'])).rows[0].available_units, 43);
  await shot('02-blood-stock');
  await evaluate(`document.querySelector('[aria-label="Stock status"] button:nth-child(2)').click()`);
  assert.equal(await evaluate('document.querySelectorAll(".bank-stock-card").length'), 1);
  await evaluate(`document.querySelector('[aria-label="Stock status"] button:first-child').click()`);
  await fill('[aria-label="Find blood group"]', 'AB-');
  assert.equal(await evaluate('document.querySelectorAll(".bank-stock-card").length'), 1);
  await fill('[aria-label="Find blood group"]', '');
  await fill('[aria-label="Sort blood stock"]', 'attention');
  assert.equal(await evaluate('document.querySelector(".stock-group-heading h2").textContent'), 'AB-');
  await go('/bank/requests'); await click('Create request'); await fill('[name="reason"]', 'Emergency surgery'); await fill('[name="department"]', 'Trauma unit'); await click('Submit for approval');
  await wait('!document.querySelector("dialog[open]")'); await wait('document.querySelector("tbody")?.innerText.includes("Pending")'); await shot('03-awaiting-approval');
  const request = (await pool.query('SELECT * FROM blood_requests WHERE organization_id=$1', [bankA])).rows[0];
  assert.equal(request.approval_status, 'Pending'); assert.equal((await api('/requests/me', donorSession.accessToken)).alerts.length, 0);
  console.log('PASS: Stock writes persist, and newly submitted bank requests stay out of donor feeds');
  await logout(); await login('bank.b@example.test'); await wait('document.querySelector("h1")?.textContent === "Blood bank dashboard"');
  assert.equal(await evaluate('document.querySelector(".bank-metric strong").textContent'), '0');
  await go('/bank/requests'); await click('Awaiting approval'); assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 0);
  console.log('PASS: A second bank in the same district cannot see the first bank’s stock or pending requests');
  await logout(); await login('super.admin@example.test'); await wait('document.querySelector("h1")?.textContent === "Network overview"');
  await go('/admin/blood-requests'); await click('Review request'); await click('Approve & publish'); await click('Approve & publish');
  await wait('!document.querySelector("dialog[open]")'); await shot('04-admin-request-approvals');
  assert.equal((await api('/requests/me', donorSession.accessToken)).alerts[0].id, String(request.id));
  await api(`/requests/${request.id}/respond`, donorSession.accessToken, { status: 'accepted' });
  console.log('PASS: Super admin approval publishes the real request to the mobile API and permits donor acceptance');
  await logout(); await login('bank.a@example.test', newPassword); await wait('document.querySelector("h1")?.textContent === "Blood bank dashboard"'); await shot('05-dashboard-active');
  await go('/bank/requests'); await shot('06-active-blood-requests');
  for (const route of ['/bank', '/bank/stock', '/bank/requests', '/bank/health-alerts', '/bank/team']) {
    await go(route);
    for (const size of [320, 390, 768, 1024, 1440]) {
      await width(size);
      const fits = await evaluate('document.documentElement.scrollWidth <= innerWidth + 1');
      if (!fits) {
        await shot(`overflow-${route.split('/').at(-1)}-${size}`);
        console.log('Overflow diagnostics:', await evaluate(`JSON.stringify([...document.querySelectorAll('.main-content *')].map(el => ({ tag: el.tagName, class: el.className, right: Math.round(el.getBoundingClientRect().right) })).filter(el => el.right > innerWidth + 1).slice(0, 12))`));
      }
      assert.ok(fits, `${route} fits ${size}px`);
    }
  }
  await width(390); await go('/bank'); await shot('07-dashboard-mobile'); await width(1440);
  console.log('PASS: All institution screens fit desktop, tablet and 320px mobile viewports');
  await go('/bank/requests'); await click(`BLR-${String(request.id).padStart(5, '0')}`); await wait('document.querySelector("dialog")?.innerText.includes("Test Donor")');
  await click('Confirm donation'); await evaluate('document.querySelector(".bank-confirm-panel .primary").click()'); await wait('document.querySelector("dialog")?.innerText.includes("Fulfilled")'); await click('Close');
  await go('/bank/health-alerts'); await wait('!document.querySelector(".heading-actions button").disabled'); await click('Send alert');
  await fill('[name="donorId"]', String(donorId)); await fill('[name="subject"]', 'Donation follow-up'); await fill('[name="message"]', 'Please contact our donation team for your follow-up appointment.'); await click('Send alert');
  await wait('!document.querySelector("dialog[open]")'); await wait('document.querySelector("tbody")?.innerText.includes("Donation follow-up")'); await shot('08-health-alerts');
  const inbox = await api('/notifications', donorSession.accessToken), notice = inbox.find(n => n.hasPrivateMessage);
  assert.ok(notice); assert.ok(!JSON.stringify(inbox).includes('follow-up appointment'));
  assert.equal((await api(`/notifications/${notice.id}/health-message`, donorSession.accessToken)).alert.subject, 'Donation follow-up');
  console.log('PASS: Bank confirms a real donation and sends an owner-protected private message to the donor app');
  await go('/bank/team'); await click('Add teammate'); await fill('[name="email"]', 'teammate@example.test'); await fill('[name="password"]', password); await click('Create teammate');
  await wait('!document.querySelector("dialog[open]")'); assert.equal((await pool.query('SELECT organization_id FROM users WHERE email=$1', ['teammate@example.test'])).rows[0].organization_id, bankA);
  await fill('[aria-label="Search team by email"]', 'teammate');
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 1);
  await click('Suspend'); await click('Suspend teammate'); await wait('!document.querySelector("dialog[open]")');
  await evaluate(`document.querySelector('[aria-label="Team account status"] button:nth-child(2)').click()`);
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 0);
  await evaluate(`document.querySelector('[aria-label="Team account status"] button:nth-child(3)').click()`);
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 1);
  await click('Activate'); await click('Activate teammate'); await wait('!document.querySelector("dialog[open]")');
  await evaluate(`document.querySelector('[aria-label="Team account status"] button:first-child').click()`);
  await fill('[aria-label="Search team by email"]', '');
  await shot('09-team-directory');
  for (const [route, name] of [['/bank/stock', '10-stock-mobile'], ['/bank/requests', '11-requests-mobile'], ['/bank/health-alerts', '12-health-mobile'], ['/bank/team', '13-team-mobile']]) {
    await go(route); if (route === '/bank/requests') await click('All'); await width(390); await shot(name);
    assert.ok(await evaluate(`[...document.querySelectorAll('.bank-subpage .table-scroll')].every(el => el.scrollWidth <= el.clientWidth + 1)`), `${route} table does not require horizontal scrolling on mobile`);
    await width(1440);
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await logout(); console.log('PASS: Team accounts stay in their bank, sign-out revokes the session, and no browser exceptions occur');
  console.log('Institution browser checks passed. Screenshots: ' + output);
} finally {
  socket?.close(); browser?.kill();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
  if (apiServer) { apiServer.closeAllConnections(); await new Promise(resolve => apiServer.close(resolve)); }
  if (pool) await pool.end();
  if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
  if (profile) {
    const resolved = path.resolve(profile);
    if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('bloodlink-bank-browser-')) { await delay(500); await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {}); }
  }
}
