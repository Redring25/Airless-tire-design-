const QUOTATION_TAX_RATE=.15;

function validateQuotationInput(input){
  const {partWeightG,quantity,materialPriceCnyPerKg,setupCostCny,additionalCostCny}=input;
  if(!Number.isFinite(partWeightG)||partWeightG<=0)return {valid:false,message:'Recalculate weight before creating a quotation.'};
  if(!Number.isInteger(quantity)||quantity<=0)return {valid:false,message:'Quantity must be a positive whole number.'};
  if(![materialPriceCnyPerKg,setupCostCny,additionalCostCny].every(value=>Number.isFinite(value)&&value>=0))return {valid:false,message:'Enter zero or positive quotation costs.'};
  return {valid:true,message:''};
}

function calculateQuotation(input){
  const validation=validateQuotationInput(input);
  if(!validation.valid)throw Error(validation.message);
  const taxRate=input.taxRate??QUOTATION_TAX_RATE;
  if(!Number.isFinite(taxRate)||taxRate<0)throw Error('Enter a valid tax rate.');
  const partWeightKg=input.partWeightG/1000;
  const totalMaterialWeightKg=partWeightKg*input.quantity;
  const materialCostCny=totalMaterialWeightKg*input.materialPriceCnyPerKg;
  const basePriceCny=materialCostCny+input.setupCostCny+input.additionalCostCny;
  const taxCny=basePriceCny*taxRate;
  return {partWeightKg,totalMaterialWeightKg,materialCostCny,basePriceCny,taxCny,totalCny:basePriceCny+taxCny,taxRate};
}

function formatCny(value){
  return '¥'+Number(value).toFixed(2);
}
