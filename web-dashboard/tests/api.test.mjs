import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { afterEach } from 'node:test';
import ts from 'typescript';

// Exercise the real client without Vite, browser storage or a running API.
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText).toString('base64');
const source = file => fs.readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const { Api } = await import(moduleUrl(source('api.ts').replace('import.meta.env.VITE_API_URL', "'http://bloodlink.test/api'")));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const json = (body, status = 200) => Response.json(body, { status });
const tokens = { accessToken: 'old-access', refreshToken: 'old-refresh', user: { id: 1, email: 'admin@example.com', role: 'admin' } };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('admin email/password login authenticates API requests and logout revokes the session', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.endsWith('/auth/login')) {
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { email: 'admin@example.com', password: 'CorrectPassword123!' });
      return json(tokens);
    }
    if (url.endsWith('/auth/logout')) {
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'old-refresh' });
      return json({});
    }
    assert.equal(options.headers.Authorization, 'Bearer old-access');
    return json({ organizations: [] });
  };
  const api = await Api.login('admin@example.com', 'CorrectPassword123!', () => assert.fail('Session should stay active'));
  assert.equal(api.email, 'admin@example.com');
  assert.deepEqual(await api.request('/admin/organizations'), { organizations: [] });
  await api.logout();
  await assert.rejects(api.request('/admin/organizations'), /Session has ended/);
  assert.equal(calls.length, 3);
});

test('invalid credentials and backend outages cannot create a session', async () => {
  globalThis.fetch = async () => json({ error: 'Invalid credentials' }, 401);
  await assert.rejects(Api.login('admin@example.com', 'WrongPassword123!', () => {}), /Invalid credentials/);
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  await assert.rejects(Api.login('admin@example.com', 'CorrectPassword123!', () => {}), /Cannot reach BloodLink/);
});

test('staff login is rejected and the issued session is logged out', async () => {
  let logout = false;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/login')) return json({ ...tokens, user: { ...tokens.user, role: 'bloodbank_staff' } });
    assert.ok(url.endsWith('/auth/logout')); assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh'); logout = true; return json({});
  };
  await assert.rejects(Api.login('staff@example.com', 'password', () => {}), /platform administrators/);
  assert.equal(logout, true);
});

test('parallel requests and late 401 responses share one token refresh', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh'); await delay(10); return json({ accessToken: 'new-access', refreshToken: 'new-refresh' }); }
    if (options.headers.Authorization === 'Bearer old-access') { await delay(url.endsWith('/late') ? 40 : 0); return json({ error: 'Expired' }, 401); }
    assert.equal(options.headers.Authorization, 'Bearer new-access'); return json({ ok: true });
  };
  const api = new Api('admin@example.com', () => assert.fail('Session should stay active'), tokens);
  const responses = await Promise.all(['/one', '/two', '/late'].map(path => api.request(path)));
  assert.equal(refreshes, 1); assert.ok(responses.every(response => response.ok));
});

test('temporary refresh outage preserves the session for retry', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return refreshes === 1 ? json({ error: 'Maintenance' }, 503) : json({ accessToken: 'new-access', refreshToken: 'new-refresh' }); }
    return options.headers.Authorization === 'Bearer old-access' ? json({ error: 'Expired' }, 401) : json({ ok: true });
  };
  const api = new Api('admin@example.com', () => assert.fail('Outage must not sign out'), tokens);
  await assert.rejects(api.request('/first'), /Maintenance/);
  assert.deepEqual(await api.request('/retry'), { ok: true });
});

test('malformed refresh response cannot replace session tokens', async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh'); return json(refreshes === 1 ? {} : { accessToken: 'new-access', refreshToken: 'new-refresh' }); }
    return options.headers.Authorization === 'Bearer old-access' ? json({ error: 'Expired' }, 401) : json({ ok: true });
  };
  const api = new Api('admin@example.com', () => assert.fail('Malformed response must not sign out'), tokens);
  await assert.rejects(api.request('/first'), /Invalid session response/);
  assert.deepEqual(await api.request('/retry'), { ok: true });
});

test('rejected refresh ends the session', async () => {
  let expired = 0;
  globalThis.fetch = async () => json({ error: 'Invalid session' }, 401);
  const api = new Api('admin@example.com', () => { expired++; }, tokens);
  await assert.rejects(api.request('/private'), /session has expired/);
  await assert.rejects(api.request('/private'), /Session has ended/);
  assert.equal(expired, 1);
});
