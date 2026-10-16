// First-order perimeter-offset approximation for the constant-width extrusion.
// The geometric holes stay empty; infill applies only inside the CAD solid.
function estimateWeight(model,density,resinDensity,infill,wall){
  const {volume_mm3:v,surface_area_mm2:s,tire_width:h}=model;
  if(![v,s,h,density,resinDensity,infill,wall].every(Number.isFinite)||v<=0||s<=0||h<=0||density<=0||resinDensity<=0||infill<0||infill>100||wall<0)
    throw Error('Enter positive densities, infill 0–100%, and non-negative wall thickness.');
  const area=v/h,perimeter=Math.max(0,(s-2*area)/h);
  const core=Math.max(0,area-perimeter*wall)*Math.max(0,h-2*wall);
  const shell=v-Math.min(v,core);
  return {solid:v/1000*density,lcd:v/1000*resinDensity,fdm:(shell+(v-shell)*infill/100)/1000*density,wallPercent:100*shell/v};
}
if(typeof document!=='undefined')(()=>{
  const el=id=>document.getElementById(id);
  let model=null;
  const densities={tpu90:1.2,tpu120:1.2,custom:1.2};
  let selected='tpu90';
  const outputs=['weight-solid','weight-fdm','weight-lcd','weight-wall','weight-volume'];
  function progress(percent,message,busy){
    el('weight-progress').value=percent;el('weight-percent').textContent=percent+'%';
    el('weight-status').textContent=message;el('calculate-weight').disabled=busy;
    el('calculate-weight').textContent=busy?'Calculating…':'Calculate Weight';
  }
  function clear(message){model=null;outputs.forEach(id=>el(id).textContent='—');el('weight-status').textContent=message;}
  function calculate(){
    outputs.forEach(id=>el(id).textContent='—');
    if(!model)return;
    try{
      const result=estimateWeight(model,Number(el('material-density').value),Number(el('resin-density').value),Number(el('fdm-infill').value),Number(el('fdm-wall').value));
      for(const [key,id] of [['solid','weight-solid'],['fdm','weight-fdm'],['lcd','weight-lcd']])el(id).textContent=result[key].toFixed(1)+' g';
      el('weight-wall').textContent=result.wallPercent.toFixed(1)+'%';
      el('weight-volume').textContent=(model.volume_mm3/1000).toFixed(2)+' cm³';
      progress(100,'Complete · approximate weight of one tire',false);
    }catch(error){progress(75,error.message,false);}
  }
  el('calculate-weight').addEventListener('click',()=>{
    // Density and print settings do not alter geometry. Reuse measured CAD properties.
    if(model){calculate();return;}
    // Rebuild only when no current CAD measurement is available.
    render();
    if(document.querySelector('#export-button').disabled)progress(0,'Correct the design parameters before calculating weight.',false);
    else progress(0,'Starting CAD calculation…',true);
  });
  el('material-choice').addEventListener('change',()=>{
    selected=el('material-choice').value;el('material-density').value=densities[selected];
    el('custom-material-field').hidden=selected!=='custom';calculate();
  });
  el('material-density').addEventListener('input',()=>{densities[selected]=Number(el('material-density').value);calculate();});
  ['resin-density','fdm-infill','fdm-wall'].forEach(id=>el(id).addEventListener('input',calculate));
  window.addEventListener('model-pending',()=>{clear('Waiting for CAD calculation…');progress(0,'Waiting for CAD calculation…',false);});
  window.addEventListener('model-building',()=>progress(25,'Building CAD model and measuring volume…',true));
  window.addEventListener('model-error',e=>{clear(e.detail);progress(25,'Calculation failed: '+e.detail,false);});
  window.addEventListener('model-ready',e=>{model=e.detail;progress(75,'CAD ready · calculating weight…',true);requestAnimationFrame(()=>calculate());});
})();
