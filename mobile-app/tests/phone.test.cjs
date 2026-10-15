const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/phone.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { normalizeSriLankanMobile, toLocalSriLankanMobile } = context.exports;

test('local mobile numbers produce the same API identifier as existing international numbers', () => {
  for (const input of ['0771234567', '077 123 4567', '077-123-4567', '(077) 123 4567', '771234567', '+94 77 123 4567', '94771234567']) {
    assert.equal(normalizeSriLankanMobile(input), '+94771234567', input);
  }
});

test('normalization preserves different mobile numbers', () => {
  assert.equal(normalizeSriLankanMobile('0719876543'), '+94719876543');
  assert.equal(normalizeSriLankanMobile('0780000000'), '+94780000000');
});

test('incomplete, foreign, landline, and malformed numbers cannot be submitted as local mobiles', () => {
  for (const input of ['', '077123456', '07712345678', '0112345678', '+12025550123', '+940771234567', '0771234567 ext 2', '077abc4567', '++94771234567']) {
    assert.equal(normalizeSriLankanMobile(input), null, input);
  }
});

test('pasted international numbers display locally and remain unchanged when submitted again', () => {
  const local = toLocalSriLankanMobile('+94 (77) 123-4567');
  assert.equal(local, '0771234567');
  assert.equal(normalizeSriLankanMobile(local), '+94771234567');
  assert.equal(toLocalSriLankanMobile(local), local);
});

test('formatting preserves unfinished or invalid input for the donor to correct', () => {
  for (const input of ['', '077', '+9477', '+12025550123', '077123456789']) {
    assert.equal(toLocalSriLankanMobile(input), input);
  }
});
