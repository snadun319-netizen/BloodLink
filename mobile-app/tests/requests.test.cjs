const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../src/requests/services/requestsService.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {}, setTimeout, clearTimeout, Promise, JSON, console };
vm.runInNewContext(compiled, context);
const {
  fetchRequestsData,
  respondToAlertRequest,
  notifyMissionCoordinator,
} = context.exports;

test('fetchRequestsData returns initial donor requests matching the screenshot', async () => {
  const data = await fetchRequestsData();
  assert.equal(data.donorInitials, 'KP');
  assert.equal(data.unreadAlertsCount, 3);
  assert.equal(data.activeCount, 1);
  assert.equal(data.alerts.length, 3);
});

test('first alert card is Urgent Sabaragamuwa General Hospital', async () => {
  const data = await fetchRequestsData();
  const urgentAlert = data.alerts[0];
  assert.equal(urgentAlert.hospitalName, 'Sabaragamuwa General Hospital');
  assert.equal(urgentAlert.isUrgent, true);
  assert.equal(urgentAlert.distance, '3.2 km away');
  assert.equal(urgentAlert.timeAgo, '10m ago');
  assert.equal(urgentAlert.bloodGroup, 'O- Negative');
  assert.equal(urgentAlert.unitsNeeded, 2);
});

test('active mission card has En Route dispatch, 1 unit required and ~15 mins arrival', async () => {
  const data = await fetchRequestsData();
  const mission = data.activeMission;
  assert.ok(mission);
  assert.equal(mission.hospitalName, 'Sabaragamuwa General Hospital');
  assert.equal(mission.unitDepartment, 'Emergency Trauma Unit');
  assert.equal(mission.status, 'En Route');
  assert.equal(mission.bloodGroup, 'O- Negative');
  assert.equal(mission.unitsNeeded, 1);
  assert.equal(mission.estimatedArrival, '~15 mins');
  assert.equal(mission.fastPassToken, '#BL-8921');
  assert.equal(mission.steps.length, 3);
  assert.equal(mission.steps[0].title, 'Accepted Request');
  assert.equal(mission.steps[0].status, 'completed');
  assert.equal(mission.steps[1].title, 'En Route to Hospital');
  assert.equal(mission.steps[1].status, 'in_progress');
  assert.equal(mission.steps[2].title, 'Arrive & Donate');
  assert.equal(mission.steps[2].status, 'upcoming');
});

test('service actions respond and notify succeed', async () => {
  const resp = await respondToAlertRequest('req-sab-01', 'accepted');
  assert.equal(resp.success, true);

  const notify = await notifyMissionCoordinator('mission-active-01', 'Running late');
  assert.equal(notify.success, true);
});
