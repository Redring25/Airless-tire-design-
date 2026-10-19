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

function selectManufacturingWeight(method,weights){
  if(!weights)return null;
  const weight=method==='lcd'?weights.lcdWeightG:weights.fdmWeightG;
  return Number.isFinite(weight)&&weight>0?weight:null;
}

function buildQuotationRecord(state){
  const {method,materialName,tireSummary,input,result}=state;
  return {title:'Sophi Studio Airless Tire Design — Manufacturing Quotation',method:method.toUpperCase(),material:materialName,pattern:tireSummary.pattern,outerDiameter:tireSummary.outerDiameterMm+' mm',innerDiameter:tireSummary.innerDiameterMm+' mm',tireWidth:tireSummary.tireWidthMm+' mm',partWeight:result.partWeightKg.toFixed(3)+' kg',quantity:String(input.quantity),totalMaterialWeight:result.totalMaterialWeightKg.toFixed(3)+' kg',materialPrice:formatCny(input.materialPriceCnyPerKg)+'/kg',materialCost:formatCny(result.materialCostCny),setupCost:formatCny(input.setupCostCny),additionalCost:formatCny(input.additionalCostCny),basePrice:formatCny(result.basePriceCny),taxRate:(result.taxRate*100)+'%',tax:formatCny(result.taxCny),total:formatCny(result.totalCny),notice:'Estimated from the current CAD design; manufacturing validation is required before production.'};
}

if(typeof document!=='undefined')(()=>{
  const el=id=>document.getElementById(id);
  let weights=null;
  const exportButtons=()=>[el('export-quotation-xlsx'),el('export-quotation-pdf')];
  const outputIds=['quote-part-weight','quote-total-weight','quote-material-cost','quote-base','quote-tax','quote-total'];
  function clear(message){
    outputIds.forEach(id=>el(id).textContent='—');
    exportButtons().forEach(button=>button.disabled=true);
    el('quote-status').textContent=message;
  }
  function values(){return {quantity:Number(el('quote-quantity').value),materialPriceCnyPerKg:Number(el('quote-material-price').value),setupCostCny:Number(el('quote-setup-cost').value),additionalCostCny:Number(el('quote-additional-cost').value)};}
  function refresh(){
    const method=el('quote-method').value;
    const partWeightG=selectManufacturingWeight(method,weights);
    const input={partWeightG,...values(),taxRate:QUOTATION_TAX_RATE};
    const validation=validateQuotationInput(input);
    if(!validation.valid){clear(validation.message);return;}
    const result=calculateQuotation(input);
    el('quote-part-weight').textContent=result.partWeightKg.toFixed(3)+' kg';
    el('quote-total-weight').textContent=result.totalMaterialWeightKg.toFixed(3)+' kg';
    el('quote-material-cost').textContent=formatCny(result.materialCostCny);
    el('quote-base').textContent=formatCny(result.basePriceCny);
    el('quote-tax').textContent=formatCny(result.taxCny);
    el('quote-total').textContent=formatCny(result.totalCny);
    exportButtons().forEach(button=>button.disabled=false);
    el('quote-status').textContent='Quotation ready · 15% tax included.';
    window.currentQuotation={method,weights,input,result,materialName:weights.materialName,tireSummary:weights.tireSummary};
  }
  function download(blob,name){const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);}
  function exportXlsx(){if(!window.currentQuotation||!window.XLSX)return clear('Excel export library is unavailable. Check your internet connection.');const record=buildQuotationRecord(window.currentQuotation);const rows=Object.entries(record).map(([label,value])=>[label,value]);const sheet=window.XLSX.utils.aoa_to_sheet(rows);const book=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(book,sheet,'Quotation');window.XLSX.writeFile(book,'SophiStudio-quotation.xlsx');}
  function exportPdf(){if(!window.currentQuotation||!window.jspdf)return clear('PDF export library is unavailable. Check your internet connection.');const record=buildQuotationRecord(window.currentQuotation),pdf=new window.jspdf.jsPDF();let y=16;Object.entries(record).forEach(([label,value])=>{pdf.text(`${label}: ${value}`,14,y);y+=7;if(y>280){pdf.addPage();y=16;}});pdf.save('SophiStudio-quotation.pdf');}
  ['quote-method','quote-quantity','quote-material-price','quote-setup-cost','quote-additional-cost'].forEach(id=>el(id).addEventListener('input',refresh));
  el('export-quotation-xlsx').addEventListener('click',exportXlsx);
  el('export-quotation-pdf').addEventListener('click',exportPdf);
  window.addEventListener('quotation-weights-ready',event=>{weights=event.detail;refresh();});
  window.addEventListener('quotation-weights-invalid',()=>{weights=null;window.currentQuotation=null;clear('Recalculate weight before creating a quotation.');});
  clear('Calculate weight before creating a quotation.');
})();
