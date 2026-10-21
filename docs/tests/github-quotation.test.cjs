const test=require('node:test');
const assert=require('node:assert/strict');
const {validateQuote,calculateQuote,buildQuoteRecord}=require('../quotation.js');

const input={clientName:'Li Wei',email:'li@example.com',phone:'13800138000',material:'TPU 90',partWeightG:120,pricePerGram:0.35,quantity:10,setupCost:50,additionalCost:20,taxRate:.15};

test('calculates a CNY quotation from a price per gram and tax',()=>{
  const quote=calculateQuote(input);
  assert.equal(quote.materialCost,420);
  assert.equal(quote.basePrice,490);
  assert.equal(quote.tax,73.5);
  assert.equal(quote.total,563.5);
});

test('requires valid client details before export',()=>{
  assert.equal(validateQuote({...input,clientName:''}).valid,false);
  assert.equal(validateQuote({...input,email:'not-an-email'}).valid,false);
  assert.equal(validateQuote({...input,phone:''}).valid,false);
});

test('includes client contact details in export records',()=>{
  const record=buildQuoteRecord(input,calculateQuote(input));
  assert.equal(record['Client name'],'Li Wei');
  assert.equal(record['Email'],'li@example.com');
  assert.equal(record['Phone'],'13800138000');
  assert.equal(record['Total quotation'],'¥563.50');
});
