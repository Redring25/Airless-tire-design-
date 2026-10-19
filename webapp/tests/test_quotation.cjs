const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={};
const source=fs.existsSync('static/quotation.js')?fs.readFileSync('static/quotation.js','utf8'):'';
vm.runInNewContext(source,context);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} is not near ${expected}`);

test('calculates a 15 percent FDM quotation in CNY',()=>{
  assert.equal(typeof context.calculateQuotation,'function');
  const result=context.calculateQuotation({partWeightG:188.3,quantity:10,materialPriceCnyPerKg:86.5,setupCostCny:50,additionalCostCny:20,taxRate:.15});
  near(result.totalMaterialWeightKg,1.883);
  near(result.materialCostCny,162.8795);
  near(result.basePriceCny,232.8795);
  near(result.taxCny,34.931925);
  near(result.totalCny,267.811425);
  assert.equal(context.formatCny(result.totalCny),'¥267.81');
});

test('rejects invalid quotation inputs',()=>{
  for(const input of [
    {partWeightG:0,quantity:1,materialPriceCnyPerKg:1,setupCostCny:0,additionalCostCny:0},
    {partWeightG:1,quantity:0,materialPriceCnyPerKg:1,setupCostCny:0,additionalCostCny:0},
    {partWeightG:1,quantity:1.5,materialPriceCnyPerKg:1,setupCostCny:0,additionalCostCny:0},
    {partWeightG:1,quantity:1,materialPriceCnyPerKg:-1,setupCostCny:0,additionalCostCny:0}
  ]) assert.equal(context.validateQuotationInput(input).valid,false);
});
