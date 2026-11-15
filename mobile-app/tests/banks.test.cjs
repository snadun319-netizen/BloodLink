const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    Array,
    Set,
    Date,
    Math,
    Object,
    String,
    Number,
    console,
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

const {
  getBankTypeLabel,
  getStockStatusLabel,
  getStockColorTheme,
  timeAgo,
  formatStockUpdated,
  sortStocksByUrgency,
  getCriticalStockGroup,
  getNewestStockDate,
  formatDistanceKm,
  getDistinctDistricts,
  getNearestBank,
  filterBanks,
} = loadTsModule('../src/banks/utils/banksFormat.ts');

// ─── 1. Bank Type Formatting ───────────────────────────────────────────────
test('getBankTypeLabel: formats known database types correctly', () => {
  assert.equal(getBankTypeLabel('bloodbank'), 'BLOOD BANK');
  assert.equal(getBankTypeLabel('blood_bank'), 'BLOOD BANK');
  assert.equal(getBankTypeLabel('hospital'), 'HOSPITAL');
  assert.equal(getBankTypeLabel('HOSPITAL'), 'HOSPITAL');
  assert.equal(getBankTypeLabel(null), 'BLOOD BANK');
  assert.equal(getBankTypeLabel(undefined), 'BLOOD BANK');
});

// ─── 2. Stock Status Mapping ───────────────────────────────────────────────
test('getStockStatusLabel: maps status strings correctly and converts Normal to GOOD', () => {
  assert.equal(getStockStatusLabel('Critical'), 'CRITICAL');
  assert.equal(getStockStatusLabel('CRITICAL'), 'CRITICAL');
  assert.equal(getStockStatusLabel('Low'), 'LOW');
  assert.equal(getStockStatusLabel('LOW'), 'LOW');
  assert.equal(getStockStatusLabel('Normal'), 'GOOD');
  assert.equal(getStockStatusLabel('good'), 'GOOD');
});

test('getStockStatusLabel: falls back to unit thresholds (0-2 Critical, 3-9 Low, 10+ Good)', () => {
  assert.equal(getStockStatusLabel(null, 0), 'CRITICAL');
  assert.equal(getStockStatusLabel(null, 2), 'CRITICAL');
  assert.equal(getStockStatusLabel(null, 3), 'LOW');
  assert.equal(getStockStatusLabel(null, 9), 'LOW');
  assert.equal(getStockStatusLabel(null, 10), 'GOOD');
  assert.equal(getStockStatusLabel(null, 35), 'GOOD');
});

// ─── 3. Stock Color Themes ────────────────────────────────────────────────
test('getStockColorTheme: returns appropriate theme colors for each level', () => {
  const critical = getStockColorTheme('Critical');
  assert.equal(critical.badgeBg, '#DC2626');
  assert.equal(critical.cardBg, '#FEF2F2');

  const low = getStockColorTheme('Low');
  assert.equal(low.badgeBg, '#D97706');
  assert.equal(low.cardBg, '#FFFBEB');

  const good = getStockColorTheme('Normal');
  assert.equal(good.badgeBg, '#059669');
  assert.equal(good.cardBg, '#ECFDF5');
});

// ─── 4. Time Formatting ───────────────────────────────────────────────────
test('timeAgo & formatStockUpdated: formats relative timestamps accurately', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');

  const t5m = new Date('2026-11-14T11:55:00.000Z').toISOString();
  assert.equal(timeAgo(t5m, now), '5m ago');
  assert.equal(formatStockUpdated(t5m, now), 'Updated 5m ago');

  const t2h = new Date('2026-11-14T10:00:00.000Z').toISOString();
  assert.equal(timeAgo(t2h, now), '2h ago');
  assert.equal(formatStockUpdated(t2h, now), 'Updated 2h ago');

  const t30s = new Date('2026-11-14T11:59:35.000Z').toISOString();
  assert.equal(timeAgo(t30s, now), 'just now');
  assert.equal(formatStockUpdated(t30s, now), 'Updated just now');

  assert.equal(formatStockUpdated(null, now), 'Updated recently');
});

// ─── 5. Stock Sorting by Urgency ───────────────────────────────────────────
test('sortStocksByUrgency: orders Critical first, then Low, then Good', () => {
  const stocks = [
    { bloodGroup: 'B+', units: 32, status: 'Normal', updatedAt: '2026-11-14T10:00:00Z' },
    { bloodGroup: 'O-', units: 4, status: 'Critical', updatedAt: '2026-11-14T10:00:00Z' },
    { bloodGroup: 'O+', units: 24, status: 'Normal', updatedAt: '2026-11-14T10:00:00Z' },
    { bloodGroup: 'A-', units: 8, status: 'Low', updatedAt: '2026-11-14T10:00:00Z' },
  ];

  const sorted = sortStocksByUrgency(stocks);
  assert.deepEqual(
    Array.from(sorted.map((s) => s.bloodGroup)),
    ['O-', 'A-', 'O+', 'B+'] // Critical O-, Low A-, Normal O+ (24u), Normal B+ (32u)
  );
});

// ─── 6. Critical Stock and Newest Date Identification ──────────────────────
test('getCriticalStockGroup: finds critical blood group', () => {
  const stocks = [
    { bloodGroup: 'B+', units: 32, status: 'Normal', updatedAt: '2026-11-14T10:00:00Z' },
    { bloodGroup: 'O-', units: 2, status: 'Critical', updatedAt: '2026-11-14T10:00:00Z' },
  ];
  assert.equal(getCriticalStockGroup(stocks), 'O-');

  const noCritical = [
    { bloodGroup: 'B+', units: 32, status: 'Normal', updatedAt: '2026-11-14T10:00:00Z' },
  ];
  assert.equal(getCriticalStockGroup(noCritical), null);
});

test('getNewestStockDate: identifies the newest timestamp', () => {
  const stocks = [
    { bloodGroup: 'B+', units: 32, status: 'Normal', updatedAt: '2026-11-14T09:00:00Z' },
    { bloodGroup: 'O-', units: 2, status: 'Critical', updatedAt: '2026-11-14T11:45:00Z' },
    { bloodGroup: 'A+', units: 15, status: 'Normal', updatedAt: '2026-11-14T10:30:00Z' },
  ];
  assert.equal(getNewestStockDate(stocks), '2026-11-14T11:45:00Z');
});

// ─── 7. Distance Formatting ───────────────────────────────────────────────
test('formatDistanceKm: formats numeric distances and handles null', () => {
  assert.equal(formatDistanceKm(3.2), '3.2 km away');
  assert.equal(formatDistanceKm(0.8), '0.8 km away');
  assert.equal(formatDistanceKm(null), null);
  assert.equal(formatDistanceKm(undefined), null);
});

// ─── 8. Distinct Districts ─────────────────────────────────────────────────
test('getDistinctDistricts: extracts unique sorted districts', () => {
  const banks = [
    { district: 'Ratnapura' },
    { district: 'Colombo' },
    { district: 'Ratnapura' },
    { district: 'Kandy' },
    { district: null },
    { district: '' },
  ];
  assert.deepEqual(getDistinctDistricts(banks), ['Colombo', 'Kandy', 'Ratnapura']);
});

// ─── 9. Nearest Bank Selection ────────────────────────────────────────────
test('getNearestBank: selects closest bank by distanceKm, or falls back to name', () => {
  const banksWithDistance = [
    { name: 'Kandy Center', distanceKm: 55.4 },
    { name: 'Sabaragamuwa GH', distanceKm: 3.2 },
    { name: 'Colombo Base', distanceKm: 85.0 },
  ];
  assert.equal(getNearestBank(banksWithDistance).name, 'Sabaragamuwa GH');

  const banksWithoutDistance = [
    { name: 'Ratnapura Hospital', distanceKm: null },
    { name: 'Colombo Central Bank', distanceKm: null },
  ];
  assert.equal(getNearestBank(banksWithoutDistance).name, 'Colombo Central Bank');
});

// ─── 10. Filter Banks ─────────────────────────────────────────────────────
test('filterBanks: filters by search text (name, district, address)', () => {
  const banks = [
    { id: '1', name: 'Sabaragamuwa General Hospital', district: 'Ratnapura', address: 'Hospital Rd', stocks: [] },
    { id: '2', name: 'National Blood Transfusion Center', district: 'Colombo', address: 'Narahenpita', stocks: [] },
    { id: '3', name: 'Teaching Hospital Karapitiya', district: 'Galle', address: 'Karapitiya', stocks: [] },
  ];

  assert.equal(filterBanks(banks, { query: 'Ratnapura' }).length, 1);
  assert.equal(filterBanks(banks, { query: 'narahenpita' }).length, 1);
  assert.equal(filterBanks(banks, { query: 'Hospital' }).length, 2);
  assert.equal(filterBanks(banks, { query: 'Nonexistent' }).length, 0);
});

test('filterBanks: filters by district, blood group, and stock status', () => {
  const banks = [
    {
      id: '1',
      name: 'Bank 1',
      district: 'Ratnapura',
      stocks: [{ bloodGroup: 'O-', units: 2, status: 'Critical' }],
    },
    {
      id: '2',
      name: 'Bank 2',
      district: 'Colombo',
      stocks: [{ bloodGroup: 'A+', units: 20, status: 'Normal' }],
    },
  ];

  assert.equal(filterBanks(banks, { district: 'Ratnapura' }).length, 1);
  assert.equal(filterBanks(banks, { district: 'Kandy' }).length, 0);
  assert.equal(filterBanks(banks, { bloodGroup: 'O-' }).length, 1);
  assert.equal(filterBanks(banks, { bloodGroup: 'B+' }).length, 0);
  assert.equal(filterBanks(banks, { stockStatus: 'CRITICAL' }).length, 1);
  assert.equal(filterBanks(banks, { stockStatus: 'GOOD' }).length, 1);
});
