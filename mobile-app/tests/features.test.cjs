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
  const context = { exports: {} };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

// Load utility modules
const {
  getEligibility,
  estimateLivesSaved,
  DONATION_INTERVAL_DAYS,
  PATIENTS_PER_DONATION,
} = loadTsModule('../src/profile/utils/eligibility.ts');

const {
  formatDate,
  formatMonthYear,
  getInitials,
  formatFileSize,
  maskNic,
  isValidSriLankanMobile,
} = loadTsModule('../src/profile/utils/format.ts');

const { formatVolume } = loadTsModule('../src/history/utils/historyFormat.ts');
const { timeAgo } = loadTsModule('../src/notifications/utils/timeAgo.ts');

// ─── 1. ELIGIBILITY (eligibility.ts) ────────────────────────────────────────

test('getEligibility: donor with no previous donation is eligible immediately', () => {
  const explicitNow = new Date('2026-05-20T12:00:00.000Z');
  const result = getEligibility(null, explicitNow);
  assert.equal(result.eligible, true);
  assert.equal(result.nextEligibleDate, null);
  assert.equal(result.daysRemaining, 0);
});

test('getEligibility: exactly on the 120th day the donor becomes eligible', () => {
  const lastDonation = '2024-01-01T00:00:00.000Z';
  const nextExpected = new Date(lastDonation);
  nextExpected.setDate(nextExpected.getDate() + DONATION_INTERVAL_DAYS); // 120 days later (2024-04-30)

  const nowOnDay = new Date(nextExpected.getTime());
  const result = getEligibility(lastDonation, nowOnDay);

  assert.equal(result.eligible, true);
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.nextEligibleDate.getTime(), nextExpected.getTime());
});

test('getEligibility: 1 day before the 120th day is not eligible and shows 1 day remaining', () => {
  const lastDonation = '2024-01-01T00:00:00.000Z';
  const nextExpected = new Date(lastDonation);
  nextExpected.setDate(nextExpected.getDate() + DONATION_INTERVAL_DAYS);

  const nowOneDayBefore = new Date(nextExpected.getTime() - 24 * 60 * 60 * 1000);
  const result = getEligibility(lastDonation, nowOneDayBefore);

  assert.equal(result.eligible, false);
  assert.equal(result.daysRemaining, 1);
  assert.equal(result.nextEligibleDate.getTime(), nextExpected.getTime());
});

test('getEligibility: 1 day after the 120th day remains eligible with 0 days remaining', () => {
  const lastDonation = '2024-01-01T00:00:00.000Z';
  const nextExpected = new Date(lastDonation);
  nextExpected.setDate(nextExpected.getDate() + DONATION_INTERVAL_DAYS);

  const nowOneDayAfter = new Date(nextExpected.getTime() + 24 * 60 * 60 * 1000);
  const result = getEligibility(lastDonation, nowOneDayAfter);

  assert.equal(result.eligible, true);
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.nextEligibleDate.getTime(), nextExpected.getTime());
});

test('getEligibility: midway through cooldown shows accurate daysRemaining and nextEligibleDate', () => {
  const lastDonation = '2024-01-01T00:00:00.000Z';
  const nextExpected = new Date(lastDonation);
  nextExpected.setDate(nextExpected.getDate() + DONATION_INTERVAL_DAYS);

  const now60DaysBefore = new Date(nextExpected.getTime() - 60 * 24 * 60 * 60 * 1000);
  const result = getEligibility(lastDonation, now60DaysBefore);

  assert.equal(result.eligible, false);
  assert.equal(result.daysRemaining, 60);
  assert.equal(result.nextEligibleDate.getTime(), nextExpected.getTime());
});

test('estimateLivesSaved: multiplies total donations by patients per donation constant (3)', () => {
  assert.equal(PATIENTS_PER_DONATION, 3);
  assert.equal(estimateLivesSaved(0), 0);
  assert.equal(estimateLivesSaved(1), 3);
  assert.equal(estimateLivesSaved(4), 12);
  assert.equal(estimateLivesSaved(7), 21);
});

// ─── 2. PROFILE FORMATTERS (format.ts) ───────────────────────────────────────

test('formatDate: formats Date instances and ISO strings with month abbreviations', () => {
  // Using explicit local Date objects
  const localDate = new Date(2024, 4, 15); // May 15, 2024
  assert.equal(formatDate(localDate), '15 May 2024');

  // Using ISO strings with noon UTC timestamps to avoid cross-day boundaries
  assert.equal(formatDate('2024-05-15T12:00:00.000Z'), '15 May 2024');
  assert.equal(formatDate('2024-01-01T12:00:00.000Z'), '1 Jan 2024');
  assert.equal(formatDate('2024-12-31T12:00:00.000Z'), '31 Dec 2024');

  // Date-only string (standard format in mock data like '2024-05-15')
  assert.equal(formatDate('2024-05-15'), '15 May 2024');
});

test('formatMonthYear: formats Date instances and ISO strings as MMM YYYY', () => {
  const localDate = new Date(2022, 11, 10); // Dec 10, 2022
  assert.equal(formatMonthYear(localDate), 'Dec 2022');

  assert.equal(formatMonthYear('2022-12-10T12:00:00.000Z'), 'Dec 2022');
  assert.equal(formatMonthYear('2024-02-15T12:00:00.000Z'), 'Feb 2024');
  assert.equal(formatMonthYear('2022-12-10'), 'Dec 2022');
});

test('getInitials: extracts uppercase initials for one name, two names, extra spaces and empty inputs', () => {
  // Single name
  assert.equal(getInitials('Kavindu'), 'K');

  // Two names
  assert.equal(getInitials('Kavindu Perera'), 'KP');

  // Multi-word names: takes first and last tokens
  assert.equal(getInitials('Kavindu Nirmal Perera'), 'KP');
  assert.equal(getInitials('Dr. Anura Senanayake'), 'DS');

  // Extra leading, trailing, and consecutive spaces
  assert.equal(getInitials('   Kavindu    Perera   '), 'KP');
  assert.equal(getInitials('  Single  '), 'S');

  // Empty string or whitespace-only returns '?'
  assert.equal(getInitials(''), '?');
  assert.equal(getInitials('   '), '?');

  // Lowercase input is normalized to uppercase
  assert.equal(getInitials('john doe'), 'JD');
});

test('formatFileSize: formats byte counts into KB and MB representations', () => {
  // < 1 MB uses KB with minimum 1 KB
  assert.equal(formatFileSize(0), '1 KB');
  assert.equal(formatFileSize(512), '1 KB');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(100 * 1024), '100 KB');
  assert.equal(formatFileSize(512 * 1024), '512 KB');

  // >= 1 MB uses MB with 1 decimal place
  assert.equal(formatFileSize(1024 * 1024), '1.0 MB');
  assert.equal(formatFileSize(1.2 * 1024 * 1024), '1.2 MB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB');
});

test('maskNic: masks national identity numbers preserving first 6 and final character', () => {
  // 12-digit + letter (13 characters)
  assert.equal(maskNic('199812345678V'), '199812******V');

  // 9-digit + letter (10 characters)
  assert.equal(maskNic('981234567V'), '981234***V');

  // 7 characters: 6 prefix + 0 asterisks + 1 suffix
  assert.equal(maskNic('123456V'), '123456V');

  // Short input (<= 6 characters) returns input unmodified
  assert.equal(maskNic('12345'), '12345');
  assert.equal(maskNic('123456'), '123456');
  assert.equal(maskNic(''), '');

  // Privacy invariant: exactly the first 6 chars and last char are visible; middle are all '*'
  const sample = maskNic('199812345678V');
  assert.equal(sample.slice(0, 6), '199812');
  assert.equal(sample.slice(-1), 'V');
  assert.equal(sample.slice(6, -1), '******');
});

test('isValidSriLankanMobile: validates Sri Lankan mobile numbers with varied formats and rejects invalid inputs', () => {
  // Valid formats: +947... and 07... with spaces and dashes
  for (const valid of [
    '+94771234567',
    '0771234567',
    '077 123 4567',
    '077-123-4567',
    '+94 77 123 4567',
    '+94-77-123-4567',
    '0711234567',
    '0781234567',
    '0761234567',
    '0721234567',
    '0751234567',
    '0701234567',
    '+94711234567',
  ]) {
    assert.equal(isValidSriLankanMobile(valid), true, `Expected valid: ${valid}`);
  }

  // Invalid: too short
  for (const short of ['', '077', '07712345', '+94771234']) {
    assert.equal(isValidSriLankanMobile(short), false, `Expected invalid (too short): ${short}`);
  }

  // Invalid: too long
  for (const long of ['07712345678', '+947712345678']) {
    assert.equal(isValidSriLankanMobile(long), false, `Expected invalid (too long): ${long}`);
  }

  // Invalid: wrong prefix (landlines, foreign, missing 0 or +94)
  for (const wrongPrefix of [
    '0112345678',   // Colombo landline (011)
    '0812345678',   // Kandy landline (081)
    '+12025550123', // US international
    '+447911123456',// UK international
    '771234567',    // Missing leading 0 or +94
    '94771234567',   // Missing leading +
  ]) {
    assert.equal(isValidSriLankanMobile(wrongPrefix), false, `Expected invalid (wrong prefix): ${wrongPrefix}`);
  }

  // Invalid: letters or invalid characters
  for (const invalidChars of ['077abc4567', '077 123 456a', 'invalid', '(077) 123 4567']) {
    assert.equal(isValidSriLankanMobile(invalidChars), false, `Expected invalid (invalid chars): ${invalidChars}`);
  }
});

// ─── 3. HISTORY FORMATTERS (historyFormat.ts) ────────────────────────────────

test('formatVolume: formats milliliters into milliliters (< 1000) or liters (>= 1000)', () => {
  // Below 1000 ml
  assert.equal(formatVolume(0), '0 ml');
  assert.equal(formatVolume(450), '450 ml');
  assert.equal(formatVolume(999), '999 ml');

  // Exact thousand liters (integer format)
  assert.equal(formatVolume(1000), '1 L');
  assert.equal(formatVolume(2000), '2 L');
  assert.equal(formatVolume(3000), '3 L');

  // Fractional liters (1 decimal place)
  assert.equal(formatVolume(1800), '1.8 L');
  assert.equal(formatVolume(2500), '2.5 L');
  assert.equal(formatVolume(1250), '1.3 L'); // 1.25 rounds to 1.3
});

// ─── 4. NOTIFICATIONS TIME AGO (timeAgo.ts) ──────────────────────────────────

test('timeAgo: computes relative elapsed time strings deterministically with explicit now', () => {
  const explicitNow = new Date('2026-05-20T12:00:00.000Z');

  // Under 1 minute -> 'Just now'
  assert.equal(timeAgo('2026-05-20T12:00:00.000Z', explicitNow), 'Just now');
  assert.equal(timeAgo('2026-05-20T11:59:45.000Z', explicitNow), 'Just now'); // 15s ago
  assert.equal(timeAgo('2026-05-20T11:59:01.000Z', explicitNow), 'Just now'); // 59s ago

  // Future timestamp (clamped to 0 diff) -> 'Just now'
  assert.equal(timeAgo('2026-05-20T12:05:00.000Z', explicitNow), 'Just now');

  // 1 to 59 minutes -> '{m}m ago'
  assert.equal(timeAgo('2026-05-20T11:59:00.000Z', explicitNow), '1m ago');
  assert.equal(timeAgo('2026-05-20T11:48:00.000Z', explicitNow), '12m ago');
  assert.equal(timeAgo('2026-05-20T11:01:00.000Z', explicitNow), '59m ago');

  // 1 to 23 hours -> '{h}h ago'
  assert.equal(timeAgo('2026-05-20T11:00:00.000Z', explicitNow), '1h ago');
  assert.equal(timeAgo('2026-05-20T10:00:00.000Z', explicitNow), '2h ago');
  assert.equal(timeAgo('2026-05-19T13:00:00.000Z', explicitNow), '23h ago');

  // Exactly 24 to 47 hours -> 'Yesterday'
  assert.equal(timeAgo('2026-05-19T12:00:00.000Z', explicitNow), 'Yesterday'); // 24h ago
  assert.equal(timeAgo('2026-05-19T00:00:00.000Z', explicitNow), 'Yesterday'); // 36h ago

  // 48+ hours -> '{d}d ago'
  assert.equal(timeAgo('2026-05-18T12:00:00.000Z', explicitNow), '2d ago'); // 48h ago
  assert.equal(timeAgo('2026-05-15T12:00:00.000Z', explicitNow), '5d ago');
});
