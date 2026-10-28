const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadRequestsService(fetchMock) {
  // Transpile api.ts
  const apiSrc = fs.readFileSync(path.resolve(__dirname, '../../mobile-app/src/services/api.ts'), 'utf8');
  const compiledApi = ts.transpileModule(apiSrc, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  // Transpile requestsService.ts
  const reqSrc = fs.readFileSync(path.resolve(__dirname, '../../mobile-app/src/requests/services/requestsService.ts'), 'utf8');
  const compiledReq = ts.transpileModule(reqSrc, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const apiExports = {};
  const apiModule = { exports: apiExports };

  const apiContext = {
    exports: apiExports,
    module: apiModule,
    fetch: fetchMock,
    __DEV__: true,
    process: { env: {} },
    require: (name) => {
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      return { default: { expoConfig: { hostUri: 'localhost:8081' } } };
    },
  };
  vm.runInNewContext(compiledApi, apiContext);

  const reqExports = {};
  const reqModule = { exports: reqExports };

  const reqContext = {
    exports: reqExports,
    module: reqModule,
    fetch: fetchMock,
    require: (mod) => {
      if (mod.includes('services/api')) return apiModule.exports;
      return {};
    },
  };
  vm.runInNewContext(compiledReq, reqContext);

  return {
    requestsService: reqModule.exports,
    apiClient: apiModule.exports,
  };
}

function mockResponse(status, data) {
  return {
    status,
    ok: status < 400,
    json: async () => data,
  };
}

test('fetchRequestsData calls /requests/me and returns real structured data', async () => {
  const dummyPayload = {
    donorInitials: 'KP',
    donorName: 'Kavindu Perera',
    unreadAlertsCount: 2,
    activeCount: 1,
    alerts: [
      {
        id: '1',
        hospitalName: 'Sabaragamuwa Provincial General Hospital',
        distance: '3.2 km away',
        timeAgo: '10m ago',
        bloodGroup: 'O- Negative',
        unitsNeeded: 2,
        isUrgent: true,
        type: 'urgent',
        requirementLabel: 'O- Negative · 2 Units needed',
        address: 'Hospital Rd, Ratnapura 70000',
        contactNumber: '+94 45 222 2261',
        patientCase: 'Emergency Trauma ICU - Urgent transfusion needed.',
      },
    ],
    activeMission: {
      id: '2',
      hospitalName: 'Teaching Hospital Ratnapura',
      unitDepartment: 'Hematology Ward',
      bloodGroup: 'O- Negative',
      unitsNeeded: 1,
      estimatedArrival: '~15 mins',
      status: 'En Route',
      coordinatorName: 'Dr. Weerasinghe',
      coordinatorPhone: '+94 45 222 3444',
      fastPassToken: '#BL-0002',
      steps: [
        { id: 'step-1', title: 'Accepted Request', status: 'completed' },
        { id: 'step-2', title: 'En Route to Hospital', status: 'in_progress', badgeText: 'In Progress' },
        { id: 'step-3', title: 'Arrive & Donate', status: 'upcoming', badgeText: 'Upcoming' },
      ],
    },
  };

  let requestedUrl = '';
  const { requestsService, apiClient } = loadRequestsService(async (url, options) => {
    requestedUrl = url;
    return mockResponse(200, dummyPayload);
  });

  apiClient.configureApiClient({
    getAccessToken: async () => 'test-token',
    getRefreshToken: async () => 'test-refresh',
    onTokenRefreshed: async () => {},
    onAuthFailed: () => {},
  });

  const result = await requestsService.fetchRequestsData();
  assert.ok(requestedUrl.includes('/requests/me'), `Expected URL to include /requests/me, got ${requestedUrl}`);
  assert.equal(result.donorName, 'Kavindu Perera');
  assert.equal(result.alerts.length, 1);
  assert.equal(result.activeMission.status, 'En Route');
  assert.equal(result.activeMission.fastPassToken, '#BL-0002');
});

test('respondToAlertRequest calls POST /requests/:id/respond', async () => {
  let requestedUrl = '';
  let sentBody = null;

  const { requestsService, apiClient } = loadRequestsService(async (url, options) => {
    requestedUrl = url;
    sentBody = JSON.parse(options.body);
    return mockResponse(200, { success: true, message: 'Response registered successfully' });
  });

  apiClient.configureApiClient({
    getAccessToken: async () => 'test-token',
    getRefreshToken: async () => 'test-refresh',
    onTokenRefreshed: async () => {},
    onAuthFailed: () => {},
  });

  const response = await requestsService.respondToAlertRequest('42', 'accepted');
  assert.ok(requestedUrl.includes('/requests/42/respond'), `Expected /requests/42/respond, got ${requestedUrl}`);
  assert.equal(sentBody.status, 'accepted');
  assert.equal(response.success, true);
});

test('notifyMissionCoordinator calls POST /requests/mission/:id/notify', async () => {
  let requestedUrl = '';
  let sentBody = null;

  const { requestsService, apiClient } = loadRequestsService(async (url, options) => {
    requestedUrl = url;
    sentBody = JSON.parse(options.body);
    return mockResponse(200, { success: true, message: 'Coordinator notified' });
  });

  apiClient.configureApiClient({
    getAccessToken: async () => 'test-token',
    getRefreshToken: async () => 'test-refresh',
    onTokenRefreshed: async () => {},
    onAuthFailed: () => {},
  });

  const response = await requestsService.notifyMissionCoordinator('42', 'Running 10 mins late');
  assert.ok(requestedUrl.includes('/requests/mission/42/notify'), `Expected /requests/mission/42/notify, got ${requestedUrl}`);
  assert.equal(sentBody.reason, 'Running 10 mins late');
  assert.equal(response.success, true);
});
