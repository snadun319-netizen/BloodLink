const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname,'../src/requests/utils/directions.ts'),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context = {exports:{}};
vm.runInNewContext(compiled,context);
const {bankDirectionsUrl} = context.exports;

test('directions target the exact saved pin instead of searching a bank name',()=>{
  const url = new URL(bankDirectionsUrl({latitude:6.6879008,longitude:80.3922472}));
  assert.equal(url.pathname,'/maps/dir/');
  assert.equal(url.searchParams.get('destination'),'6.6879008,80.3922472');
  assert.equal(url.searchParams.get('api'),'1');
  assert.equal(url.searchParams.get('travelmode'),'driving');
  assert.equal(url.searchParams.has('query'),false);
});
test('missing or invalid locations never open a guessed destination',()=>{
  for(const value of [null,undefined,{}, {latitude:null,longitude:null},{latitude:NaN,longitude:80},{latitude:91,longitude:80},{latitude:7,longitude:181},{latitude:7,longitude:Infinity}]) {
    assert.equal(bankDirectionsUrl(value),null);
  }
});
