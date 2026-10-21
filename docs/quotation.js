(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SophiQuotation=api;
})(typeof window==='undefined'?globalThis:window,()=>{
  const CNY='¥';
  const money=value=>`${CNY}${Number(value).toFixed(2)}`;
  function validateQuote(input){
    if(!String(input.clientName||'').trim())return {valid:false,message:'Enter the client name before exporting.'};
    if(!/^\S+@\S+\.\S+$/.test(String(input.email||'')))return {valid:false,message:'Enter a valid client email.'};
    if(!String(input.phone||'').trim())return {valid:false,message:'Enter the client phone number.'};
    if(!Number.isFinite(input.partWeightG)||input.partWeightG<=0)return {valid:false,message:'Enter an estimated part weight in grams.'};
    if(!Number.isInteger(input.quantity)||input.quantity<1)return {valid:false,message:'Quantity must be at least 1.'};
    if(![input.pricePerGram,input.setupCost,input.additionalCost,input.taxRate].every(value=>Number.isFinite(value)&&value>=0))return {valid:false,message:'Enter zero or positive pricing values.'};
    return {valid:true,message:''};
  }
  function calculateQuote(input){
    const validation=validateQuote(input);if(!validation.valid)throw Error(validation.message);
    const materialCost=input.partWeightG*input.quantity*input.pricePerGram,basePrice=materialCost+input.setupCost+input.additionalCost,tax=basePrice*input.taxRate;
    return {materialCost,basePrice,tax,total:basePrice+tax,totalWeightG:input.partWeightG*input.quantity};
  }
  function buildQuoteRecord(input,quote){
    return {'Quotation':'Sophi Studio Airless Tire Design','Client name':input.clientName,'Email':input.email,'Phone':input.phone,'Material':input.material,'Estimated part weight':`${input.partWeightG.toFixed(1)} g`,'Quantity':String(input.quantity),'Total material weight':`${quote.totalWeightG.toFixed(1)} g`,'Material price':`${money(input.pricePerGram)}/g`,'Material cost':money(quote.materialCost),'Machine / setup':money(input.setupCost),'Additional cost':money(input.additionalCost),'Base price':money(quote.basePrice),[`Tax (${(input.taxRate*100).toFixed(0)}%)`]:money(quote.tax),'Total quotation':money(quote.total),'Notice':'Static-site quotation uses the manual estimated weight supplied by the user.'};
  }
  function startUi(){
    const byId=id=>document.getElementById(id),inputs=['quote-client-name','quote-client-email','quote-client-phone','quote-material','quote-part-weight','quote-price-per-gram','quote-quantity','quote-setup-cost','quote-additional-cost','quote-tax-rate'];
    const buttons=[byId('export-quotation-xlsx'),byId('export-quotation-pdf')];let latest=null;
    function read(){return {clientName:byId('quote-client-name').value.trim(),email:byId('quote-client-email').value.trim(),phone:byId('quote-client-phone').value.trim(),material:byId('quote-material').value,partWeightG:Number(byId('quote-part-weight').value),pricePerGram:Number(byId('quote-price-per-gram').value),quantity:Number(byId('quote-quantity').value),setupCost:Number(byId('quote-setup-cost').value),additionalCost:Number(byId('quote-additional-cost').value),taxRate:Number(byId('quote-tax-rate').value)/100};}
    function clear(message){['quote-material-cost','quote-base','quote-tax','quote-total'].forEach(id=>byId(id).textContent='—');byId('quote-status').textContent=message;buttons.forEach(button=>button.disabled=true);latest=null;}
    function refresh(){const input=read(),validation=validateQuote(input);if(!validation.valid)return clear(validation.message);const quote=calculateQuote(input);byId('quote-material-cost').textContent=money(quote.materialCost);byId('quote-base').textContent=money(quote.basePrice);byId('quote-tax').textContent=money(quote.tax);byId('quote-total').textContent=money(quote.total);byId('quote-status').textContent='Quotation ready. Contact details remain only in this browser until export.';buttons.forEach(button=>button.disabled=false);latest={input,quote};}
    function exportXlsx(){if(!latest||!root.XLSX)return clear('Excel export library is unavailable. Check your internet connection.');const rows=Object.entries(buildQuoteRecord(latest.input,latest.quote)),sheet=root.XLSX.utils.aoa_to_sheet(rows),book=root.XLSX.utils.book_new();root.XLSX.utils.book_append_sheet(book,sheet,'Quotation');root.XLSX.writeFile(book,'SophiStudio-quotation.xlsx');}
    function exportPdf(){if(!latest||!root.jspdf)return clear('PDF export library is unavailable. Check your internet connection.');const pdf=new root.jspdf.jsPDF(),record=buildQuoteRecord(latest.input,latest.quote);let y=16;for(const [label,value] of Object.entries(record)){pdf.text(`${label}: ${value}`,14,y);y+=7;if(y>280){pdf.addPage();y=16;}}pdf.save('SophiStudio-quotation.pdf');}
    inputs.forEach(id=>byId(id).addEventListener('input',refresh));byId('quote-material').addEventListener('change',()=>{const option=byId('quote-material').selectedOptions[0];byId('quote-price-per-gram').value=option.dataset.price||0;refresh();});byId('export-quotation-xlsx').addEventListener('click',exportXlsx);byId('export-quotation-pdf').addEventListener('click',exportPdf);clear('Complete client details and estimated weight to create a quotation.');
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',startUi);
  return {validateQuote,calculateQuote,buildQuoteRecord,money};
});
