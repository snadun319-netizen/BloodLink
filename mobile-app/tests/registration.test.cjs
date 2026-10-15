const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/registration.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { registrationCodeIsCurrent, registrationProofIsCurrent, registrationResendSeconds, maskRegistrationEmail } = context.exports;
const sentAt = 1000000;

test('returning to verification can reuse a sent code until its actual expiry', () => {
  assert.equal(registrationCodeIsCurrent(sentAt, sentAt), true);
  assert.equal(registrationCodeIsCurrent(sentAt, sentAt + 899999), true);
  assert.equal(registrationCodeIsCurrent(sentAt, sentAt + 900000), false);
  assert.equal(registrationCodeIsCurrent(undefined, sentAt), false);
  assert.equal(registrationCodeIsCurrent(sentAt + 1, sentAt), false);
});

test('resend cooldown survives navigation and becomes available at 45 seconds', () => {
  assert.equal(registrationResendSeconds(sentAt, sentAt), 45);
  assert.equal(registrationResendSeconds(sentAt, sentAt + 44001), 1);
  assert.equal(registrationResendSeconds(sentAt, sentAt + 45000), 0);
  assert.equal(registrationResendSeconds(sentAt, sentAt + 60000), 0);
  assert.equal(registrationResendSeconds(undefined, sentAt), 0);
});

test('verified state requires both proof and a current verification time', () => {
  assert.equal(registrationProofIsCurrent('proof', sentAt, sentAt + 899999), true);
  assert.equal(registrationProofIsCurrent('proof', sentAt, sentAt + 900000), false);
  assert.equal(registrationProofIsCurrent(undefined, sentAt, sentAt), false);
  assert.equal(registrationProofIsCurrent('proof', undefined, sentAt), false);
});

test('saved email masking hides the local part of the address', () => {
  assert.equal(maskRegistrationEmail('donor@example.com'), 'd***@example.com');
  assert.equal(maskRegistrationEmail('d@example.com'), 'd***@example.com');
  assert.equal(maskRegistrationEmail(''), 'your email address');
});
