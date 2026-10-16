const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={};
const source=fs.existsSync('static/weight.js')?fs.readFileSync('static/weight.js','utf8'):'';
vm.runInNewContext(source,context);
// A 10 × 10 × 10 mm prism: exact volume/density conversion, approximate shells.
const model={volume_mm3:1000,surface_area_mm2:600,tire_width:10};
test('solid and LCD grams use independent editable densities',()=>{
  assert.equal(typeof context.estimateWeight,'function');
  const result=context.estimateWeight(model,1.2,1.1,100,0);
  assert.equal(result.solid,1.2);assert.equal(result.lcd,1.1);assert.equal(result.fdm,1.2);
});
test('zero infill keeps shells; thicker walls increase weight',()=>{
  const thin=context.estimateWeight(model,1.2,1.1,0,1);
  const thick=context.estimateWeight(model,1.2,1.1,0,2);
  assert.ok(Math.abs(thin.wallPercent-52)<1e-9);
  assert.ok(thick.fdm>thin.fdm);assert.ok(thick.fdm<=thick.solid);
});
test('full infill and saturated walls never exceed solid weight',()=>{
  assert.equal(context.estimateWeight(model,1.2,1.1,100,1).fdm,1.2);
  assert.equal(context.estimateWeight(model,1.2,1.1,0,50).fdm,1.2);
});
test('invalid density or manufacturing controls are rejected',()=>{
  for(const args of [[0,1.1,20,1],[1.2,1.1,101,1],[1.2,1.1,20,-1],[NaN,1.1,20,1]])
    assert.throws(()=>context.estimateWeight(model,...args));
});
