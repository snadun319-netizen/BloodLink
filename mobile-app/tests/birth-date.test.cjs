const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/birthDate.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { formatBirthDateInput, birthDateToString, parseBirthDate, latestBirthDate, getBirthDateError, birthMonthDays, moveBirthDateToMonth } = context.exports;

test('typing adds year, month, and day separators and accepts a pasted date', () => {
  const formatted = ['', '1', '19', '199', '1990', '1990-0', '1990-05', '1990-05-2', '1990-05-23'];
  for (let length = 0; length <= 8; length++) {
    assert.equal(formatBirthDateInput('19900523'.slice(0, length)), formatted[length]);
  }
  assert.equal(formatBirthDateInput('1990-05-23'), '1990-05-23');
  assert.equal(formatBirthDateInput('1990/05/23'), '1990-05-23');
});

test('backspacing across separators removes the separator instead of restoring it', () => {
  assert.equal(formatBirthDateInput('1990-05-'), '1990-05');
  assert.equal(formatBirthDateInput('1990-0'), '1990-0');
  assert.equal(formatBirthDateInput('1990-'), '1990');
  assert.equal(formatBirthDateInput(''), '');
});

test('calendar validation accepts leap days and rejects rolled-over or incomplete dates', () => {
  assert.ok(parseBirthDate('2000-02-29'));
  assert.ok(parseBirthDate('2004-02-29'));
  for (const value of ['1900-02-29', '2001-02-29', '2000-04-31', '2000-13-01', '2000-00-10', '2000-01-00', '2000-02', '20000229', '0000-01-01']) {
    assert.equal(parseBirthDate(value), null, value);
  }
});

test('date selection keeps the chosen calendar day in positive and negative timezones', () => {
  const originalTZ = process.env.TZ;
  try {
    for (const timezone of ['Asia/Colombo', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      process.env.TZ = timezone;
      assert.equal(birthDateToString(parseBirthDate('1990-05-23')), '1990-05-23', timezone);
      assert.equal(birthDateToString(new Date(1990, 4, 23)), '1990-05-23', timezone);
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('existing minimum age applies at the birthday boundary', () => {
  const today = new Date(2026, 9, 15, 9);
  assert.equal(birthDateToString(latestBirthDate(today)), '2010-10-15');
  assert.equal(getBirthDateError('2010-10-15', today), null);
  assert.equal(getBirthDateError('2010-10-14', today), null);
  assert.match(getBirthDateError('2010-10-16', today), /at least 16/);
  assert.match(getBirthDateError('2027-01-01', today), /future/);
});

test('blank DOB remains optional, but a partially entered date needs correction', () => {
  const today = new Date(2026, 9, 15, 9);
  assert.equal(getBirthDateError('', today), null);
  assert.match(getBirthDateError('1990-05', today), /valid date/);
});

test('calendar aligns weekdays and includes all days for leap and ordinary months', () => {
  const february = Array.from(birthMonthDays(2000, 1));
  assert.equal(february.length % 7, 0);
  assert.equal(february.indexOf(1), 2); // February 1, 2000 was a Tuesday.
  assert.equal(february.filter((day) => day !== null).length, 29);
  assert.equal(Array.from(birthMonthDays(2001, 1)).filter((day) => day !== null).length, 28);
  const january = Array.from(birthMonthDays(2023, 0));
  assert.equal(january[0], 1); // January 1, 2023 was a Sunday.
  assert.equal(january.filter((day) => day !== null).length, 31);
});

test('month and year changes handle short months and never exceed the latest birth date', () => {
  const maximum = parseBirthDate('2010-10-15');
  assert.equal(birthDateToString(moveBirthDateToMonth(parseBirthDate('2001-01-31'), 2001, 1, maximum)), '2001-02-28');
  assert.equal(birthDateToString(moveBirthDateToMonth(parseBirthDate('2000-02-29'), 2001, 1, maximum)), '2001-02-28');
  assert.equal(birthDateToString(moveBirthDateToMonth(parseBirthDate('2009-12-31'), 2010, 11, maximum)), '2010-10-15');
  assert.equal(birthDateToString(moveBirthDateToMonth(parseBirthDate('2009-01-15'), 2009, -1, maximum)), '2008-12-15');
});
