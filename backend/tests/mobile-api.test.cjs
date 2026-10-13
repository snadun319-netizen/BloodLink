const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function client(fetch) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile-app/src/services/api.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const context = {
    exports, module: { exports }, fetch, __DEV__: true, process: { env: {} },
    require: name => name === 'react-native' ? { Platform: { OS: 'web' } } : { default: { expoConfig: { hostUri: 'localhost:8081' } } },
  };
  vm.runInNewContext(compiled, context);
  return exports;
}
function response(status, data) { return { status, ok: status < 400, json: async () => data }; }
test('concurrent authenticated requests share one refresh operation', async () => {
  let accessToken = 'expired', refreshToken = 'original', refreshes = 0, failures = 0;
  const { api, configureApiClient } = client(async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return response(200, { accessToken: 'new-access', refreshToken: 'new-refresh' });
    }
    return options.headers.Authorization === 'Bearer expired' ? response(401, { error: 'Expired' }) : response(200, { value: 'ok' });
  });
  configureApiClient({
    getAccessToken: async () => accessToken, getRefreshToken: async () => refreshToken,
    onTokenRefreshed: async (access, refresh) => { accessToken = access; refreshToken = refresh; },
    onAuthFailed: () => { failures++; },
  });
  const results = await Promise.all([api.authGet('/auth/me'), api.authGet('/auth/me')]);
  assert.equal(refreshes, 1);
  assert.equal(failures, 0);
  assert.ok(results.every(result => result.data.value === 'ok'));
  assert.equal(refreshToken, 'new-refresh');
});
for (const status of [429, 500, 503]) {
  test('refresh outage ' + status + ' preserves the stored session', async () => {
    let failures = 0;
    const { api, configureApiClient } = client(async url => response(url.endsWith('/auth/refresh') ? status : 401, {}));
    configureApiClient({
      getAccessToken: async () => 'expired', getRefreshToken: async () => 'refresh',
      onTokenRefreshed: async () => assert.fail('Unexpected token write'),
      onAuthFailed: () => { failures++; },
    });
    await assert.rejects(api.authGet('/auth/me'), error => error.status === status);
    assert.equal(failures, 0);
  });
}
test('invalid refresh token forces sign-out', async () => {
  let failures = 0;
  const { api, configureApiClient } = client(async () => response(401, {}));
  configureApiClient({
    getAccessToken: async () => 'expired', getRefreshToken: async () => 'revoked',
    onTokenRefreshed: async () => assert.fail('Unexpected token write'),
    onAuthFailed: () => { failures++; },
  });
  await assert.rejects(api.authGet('/auth/me'), error => error.status === 401);
  assert.equal(failures, 1);
});
test('network outage during refresh does not force sign-out', async () => {
  let failures = 0;
  const { api, configureApiClient } = client(async url => {
    if (url.endsWith('/auth/refresh')) throw new Error('Network unavailable');
    return response(401, {});
  });
  configureApiClient({
    getAccessToken: async () => 'expired', getRefreshToken: async () => 'refresh',
    onTokenRefreshed: async () => assert.fail('Unexpected token write'),
    onAuthFailed: () => { failures++; },
  });
  await assert.rejects(api.authGet('/auth/me'), error => error.status === 0);
  assert.equal(failures, 0);
});
test('malformed refresh response cannot overwrite stored tokens', async () => {
  let writes = 0;
  const { api, configureApiClient } = client(async url => response(url.endsWith('/auth/refresh') ? 200 : 401, {}));
  configureApiClient({
    getAccessToken: async () => 'expired', getRefreshToken: async () => 'refresh',
    onTokenRefreshed: async () => { writes++; }, onAuthFailed: () => {},
  });
  await assert.rejects(api.authGet('/auth/me'), error => error.status === 502);
  assert.equal(writes, 0);
});

