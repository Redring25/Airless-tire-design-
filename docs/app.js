const defaults={mode:"honeycomb",inner_diameter:80,outer_diameter:160,tire_width:45,outer_band:4,inner_band:2,cells_per_layer:20,layers:3,web_thickness:2,curve_amplitude:1.5,spoke_thickness:2,spoke_count:32,spoke_distance:8,s_curve_ratio:.15};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const svgNS="http://www.w3.org/2000/svg";
defaults.auxetic_depth=.25;
let viewMode='3d';

function values(){const p={...defaults};$$('[data-key]').forEach(el=>p[el.dataset.key]=Number(el.value));p.mode=$('input[name="pattern"]:checked').value;return p}
function spokeGeometry(p){
  const ri=p.inner_diameter/2,ro=p.outer_diameter/2,wi=ri+p.inner_band,wo=ro-p.outer_band;
  if(!(ri>0&&ro>ri&&wo>wi&&p.inner_band>0&&p.outer_band>0&&p.spoke_count>=3&&Number.isInteger(p.spoke_count)&&p.spoke_thickness>0&&p.spoke_distance>=0))throw Error('Check diameters, rings, and curve parameters.');
  if(p.spoke_thickness>=2*Math.PI*wi/p.spoke_count*.8)throw Error('Curve thickness is too large for the number of curves.');
  if(p.mode==='s_curve'&&!(p.s_curve_ratio>=0&&p.s_curve_ratio<=.3))throw Error('S-curve ratio must be between 0 and 0.30.');
  if(p.mode!=='s_curve'&&p.spoke_distance>(wo-wi)*.7)throw Error('Curve distance must be at most 70% of the space between the rings.');
  const overlap=Math.min(p.inner_band,p.outer_band,p.spoke_thickness)*.25,start=wi-overlap,span=wo-wi+2*overlap,cells=[];
  for(let i=0;i<p.spoke_count;i++){const angle=2*Math.PI*i/p.spoke_count,sides=[[],[]];for(let j=0;j<=40;j++){const t=j/40,x=start+span*t,amp=p.s_curve_ratio*(wo-wi),y=p.mode==='s_curve'?amp*Math.sin(2*Math.PI*t):4*p.spoke_distance*t*(1-t),dx=span,dy=p.mode==='s_curve'?amp*2*Math.PI*Math.cos(2*Math.PI*t):4*p.spoke_distance*(1-2*t),length=Math.hypot(dx,dy);[1,-1].forEach((sign,index)=>{const px=x-sign*dy/length*p.spoke_thickness/2,py=y+sign*dx/length*p.spoke_thickness/2;sides[index].push([px*Math.cos(angle)-py*Math.sin(angle),px*Math.sin(angle)+py*Math.cos(angle)]);});}cells.push([...sides[0],...sides[1].reverse()]);}
  if(p.mode==='s_curve')return{ri,ro,wi,wo,cells,branches:[]};
  const branches=[];
  for(let i=0;i<p.spoke_count;i++){
    const main=cells[i],next=cells[(i+1)%p.spoke_count];
    const a=[(main[20][0]+main[61][0])/2,(main[20][1]+main[61][1])/2];
    const b=[(next[40][0]+next[41][0])/2,(next[40][1]+next[41][1])/2];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),bow=Math.min(p.spoke_distance*.25,length*.15);
    const control=[(a[0]+b[0])/2-dy/length*bow,(a[1]+b[1])/2+dx/length*bow],sides=[[],[]];
    for(let j=0;j<=40;j++){const t=j/40,x=(1-t)**2*a[0]+2*(1-t)*t*control[0]+t*t*b[0],y=(1-t)**2*a[1]+2*(1-t)*t*control[1]+t*t*b[1],tx=2*((1-t)*(control[0]-a[0])+t*(b[0]-control[0])),ty=2*((1-t)*(control[1]-a[1])+t*(b[1]-control[1])),l=Math.hypot(tx,ty);[1,-1].forEach((sign,k)=>sides[k].push([x-sign*ty/l*p.spoke_thickness/2,y+sign*tx/l*p.spoke_thickness/2]));}
    branches.push([...sides[0],...sides[1].reverse()]);
  }
  return{ri,ro,wi,wo,cells,branches};
}
function area(poly){return poly.reduce((a,p,i)=>a+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0)}
function inset(poly,d){const sign=area(poly)>0?1:-1,lines=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy),nx=sign*-dy/l,ny=sign*dx/l;lines.push([[p[0]+d*nx,p[1]+d*ny],[dx,dy]])}return lines.map((line,i)=>{const [p1,d1]=lines[(i+lines.length-1)%lines.length],[p2,d2]=line,den=d1[0]*d2[1]-d1[1]*d2[0],x=p2[0]-p1[0],y=p2[1]-p1[1],t=(x*d2[1]-y*d2[0])/den;return[p1[0]+t*d1[0],p1[1]+t*d1[1]]})}
function geometry(p){
  const ri=p.inner_diameter/2,ro=p.outer_diameter/2,wi=ri+p.inner_band,wo=ro-p.outer_band,available=wo-wi;
  if(!(ri>0&&ro>ri&&available>0&&p.layers>=1&&p.cells_per_layer>=3&&p.web_thickness>0))throw Error("Check diameters, bands, layers and wall thickness.");
  if(p.mode==='auxetic'){
    if(!(p.auxetic_depth>=.05&&p.auxetic_depth<=.4))throw Error('Inward cell depth must be between 0.05 and 0.40.');
    const pitch=available/p.layers,ap=2*Math.PI/p.cells_per_layer;
    if(p.web_thickness>=Math.min(pitch,wi*ap)*.25)throw Error('Wall thickness is too large for these auxetic cells.');
    const waist=.5-p.auxetic_depth,offsets=[[-.5,-.5],[.5,-.5],[waist,0],[.5,.5],[-.5,.5],[-waist,0]],cells=[];
    for(let layer=0;layer<p.layers;layer++){const center=wi+(layer+.5)*pitch;for(let cell=0;cell<p.cells_per_layer;cell++){const raw=offsets.map(([af,rf])=>{const r=center+rf*pitch,a=(cell+af)*ap;return[r*Math.cos(a),r*Math.sin(a)];});cells.push(inset(raw,p.web_thickness/2));const gap=[ [.5,-.5],[.5+p.auxetic_depth,0],[.5,.5],[.5-p.auxetic_depth,0] ].map(([af,rf])=>{const r=center+rf*pitch,a=(cell+af)*ap;return[r*Math.cos(a),r*Math.sin(a)];});cells.push(inset(gap,p.web_thickness/2));}}
    return{ri,ro,wi,wo,cells};
  }
  const pitch=p.layers===1?available:available/(p.layers-1),radii=p.layers===1?[(wi+wo)/2]:Array.from({length:p.layers},(_,i)=>wi+i*pitch),ap=2*Math.PI/p.cells_per_layer;
  const offsets=[[0,-2/3],[.5,-1/3],[.5,1/3],[0,2/3],[-.5,1/3],[-.5,-1/3]],cells=[];
  radii.forEach((r,layer)=>{const stagger=layer%2?.5:0;for(let c=0;c<p.cells_per_layer;c++){const ca=(c+stagger)*ap,raw=offsets.map(([af,rf])=>{const a=ca+af*ap,rr=r+rf*pitch;return[rr*Math.cos(a),rr*Math.sin(a)]});cells.push(inset(raw,p.web_thickness/2))}});
  return{ri,ro,wi,wo,cells};
}
function ringPath(outer,inner){return`M ${outer} 0 A ${outer} ${outer} 0 1 0 ${-outer} 0 A ${outer} ${outer} 0 1 0 ${outer} 0 M ${inner} 0 A ${inner} ${inner} 0 1 1 ${-inner} 0 A ${inner} ${inner} 0 1 1 ${inner} 0`}
function cellPath(poly,curved,amp){let d=`M ${poly[0][0]} ${poly[0][1]}`,sign=area(poly)>0?1:-1;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];if(curved&&amp>0){const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy),nx=sign*-dy/l,ny=sign*dx/l,bend=amp;if(amp>l*.35)throw Error("Curve amplitude is too large for the selected cells.");for(let j=1;j<=24;j++){const t=j/24,offset=bend*Math.sin(Math.PI*t);d+=` L ${p[0]+t*dx+offset*nx} ${p[1]+t*dy+offset*ny}`}}else d+=` L ${q[0]} ${q[1]}`}return d+" Z"}
function node(name,attrs={}){const el=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}

function render(){
  tireModel.clear();
  const p=values(),shape=$('#tire-shape'),dims=$('#dimension-layer'),clip=$('#web-clip');shape.replaceChildren();dims.replaceChildren();clip.replaceChildren();
  try{
    const spoke=['vertical_spoke','s_curve'].includes(p.mode),g=spoke?spokeGeometry(p):geometry(p),margin=12,extent=g.ro+margin;$('#preview').setAttribute('viewBox',`${-extent} ${-extent} ${extent*2} ${extent*2}`);
    clip.append(node('path',{d:ringPath(g.wo,g.wi),'fill-rule':'evenodd','clip-rule':'evenodd'}));
    if(spoke){shape.append(node('path',{d:ringPath(g.ro,g.wo),class:'tire-body'}));shape.append(node('path',{d:ringPath(g.wi,g.ri),class:'tire-body'}));[...g.cells,...g.branches].forEach(poly=>shape.append(node('path',{d:cellPath(poly,false,0),class:'tire-body'})));}
    else {shape.append(node('path',{d:ringPath(g.ro,g.ri),class:'tire-body'}));const cg=node('g',{'clip-path':'url(#web-clip)'});g.cells.forEach(poly=>cg.append(node('path',{d:cellPath(poly,false,0),class:'cell'})));shape.append(cg);}
    dims.append(node('circle',{cx:0,cy:0,r:g.wi,class:'ring-line'}));dims.append(node('circle',{cx:0,cy:0,r:g.wo,class:'ring-line'}));
    $('#summary-cells').textContent=g.cells.length;$('#summary-size').textContent=`${p.outer_diameter} × ${p.tire_width} mm`;$('#summary-web').textContent=`${g.wi.toFixed(1)}–${g.wo.toFixed(1)} mm`;$('#summary-mode').textContent='Honeycomb straight';$('#design-name').textContent='Expanding honeycomb';
    $('#summary-mode').textContent=spoke?'Vertical spoke':'Honeycomb straight';$('#design-name').textContent=spoke?'Vertical spoke':'Expanding honeycomb';$('#summary-count-label').textContent=spoke?'Total curves':'Total cells';
    if(p.mode==='s_curve'){$('#summary-mode').textContent='S-CURVE spoke';$('#design-name').textContent='S-CURVE spoke';}
    if(p.mode==='auxetic'){$('#summary-mode').textContent='Auxetic shape';$('#design-name').textContent='Auxetic shape';}
    $('#auxetic-dimensions').hidden=p.mode!=='auxetic';
    if(p.mode==='auxetic'){
      $('#summary-cells').textContent=p.cells_per_layer*p.layers;
      const layer=Math.max(1,Math.min(p.layers,Number($('#cell-layer').value)||1)),height=(g.wo-g.wi)/p.layers,radius=g.wi+(layer-.5)*height,width=2*Math.PI*radius/p.cells_per_layer,depth=width*p.auxetic_depth;
      $('#cell-layer').value=layer;$('#cell-layer').max=p.layers;
      $('#cell-height').value=height.toFixed(2);$('#cell-width').value=width.toFixed(2);
      $('#cell-waist').textContent=(width-2*depth).toFixed(2)+' mm';$('#cell-depth').textContent=depth.toFixed(2)+' mm';$('#cell-angle').textContent=(Math.atan2(depth,height/2)*180/Math.PI).toFixed(1)+'°';
    }
    $('#validation-message').textContent='2D preview ready · static website';$('#validation-message').classList.remove('error');$('#export-button').disabled=true;
    tireViewer.update(p);
  }catch(error){$('#validation-message').textContent=error.message;$('#validation-message').classList.add('error');$('#export-button').disabled=true}
}

async function exportStep(){const button=$('#export-button'),old=button.querySelector('span').textContent;button.disabled=true;button.querySelector('span').textContent='Building solid…';try{const response=await fetch('/api/export-step',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values())});if(!response.ok){const data=await response.json();throw Error(data.detail||'STEP generation failed')}const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1]||'SophiStudio-airless.step';a.click();URL.revokeObjectURL(url);$('#validation-message').textContent='STEP generated successfully'}catch(error){$('#validation-message').textContent=error.message;$('#validation-message').classList.add('error')}finally{button.disabled=false;button.querySelector('span').textContent=old}}

$$('[data-key]').forEach(input=>input.addEventListener('input',render));
$('#cell-layer').addEventListener('change',render);
$('#cell-height').addEventListener('change',()=>{const p=values(),gap=(p.outer_diameter-p.inner_diameter)/2-p.inner_band-p.outer_band,target=Number($('#cell-height').value);if(target>0)$('[data-key="layers"]').value=Math.max(1,Math.min(12,Math.round(gap/target)));render();});
$('#cell-width').addEventListener('change',()=>{const p=values(),gap=(p.outer_diameter-p.inner_diameter)/2-p.inner_band-p.outer_band,layer=Math.max(1,Math.min(p.layers,Number($('#cell-layer').value)||1)),radius=p.inner_diameter/2+p.inner_band+(layer-.5)*gap/p.layers,target=Number($('#cell-width').value);if(target>0)$('[data-key="cells_per_layer"]').value=Math.max(3,Math.min(80,Math.round(2*Math.PI*radius/target)));render();});
function syncPattern() {const mode=$('input[name="pattern"]:checked').value,spoke=['vertical_spoke','s_curve'].includes(mode),s=mode==='s_curve',auxetic=mode==='auxetic';$('#honeycomb-parameters').hidden=spoke;$('#spoke-parameters').hidden=!spoke;$('#cell-heading').textContent=auxetic?'Auxetic cells':'Honeycomb';$('#auxetic-depth-field').hidden=!auxetic;$('#spoke-heading').textContent=s?'S-CURVE spoke':'Vertical spoke';$('#curve-distance-field').hidden=s;$('#s-ratio-field').hidden=!s;$('#curve-help').textContent=s?'Ratio = sideways bend / ring gap. 0 is straight; 0.15 gives a 15% bend on each side.':'Curve distance is the sideways bow at the middle of each spoke.';$('#pattern-note').textContent=auxetic?'Re-entrant cells have inward-folding sides. Inward cell depth controls the waist of each cell.':spoke?'Curved ribs connect the inner and outer rings across the full tire width.':'Outer and inner cells are trimmed by circular boundaries for clean ring transitions.';render();}
$$('input[name="pattern"]').forEach(input=>input.addEventListener('change',syncPattern));
$('#reset-button').addEventListener('click',()=>{$$('[data-key]').forEach(el=>el.value=defaults[el.dataset.key]);syncPattern()});
$('#grid-button').addEventListener('click',e=>{e.currentTarget.classList.toggle('active');$('#preview-shell').classList.toggle('grid-on')});
function setView(mode){viewMode=mode;const is3d=mode==='3d';$('#preview-shell').classList.toggle('view-3d',is3d);$('#view-3d').classList.toggle('active',is3d);$('#view-2d').classList.toggle('active',!is3d);$('#view-label').textContent=is3d?'LIVE 3D VIEW':'LIVE TOP VIEW';$('#view-note').textContent=is3d?'Building 3D model…':'Circular ID / OD trim enabled';tireViewer.setActive(is3d);render();}
$('#view-2d').addEventListener('click',()=>setView('2d'));$('#view-3d').addEventListener('click',()=>setView('3d'));
$('#fit-button').addEventListener('click',()=>{if(viewMode==='3d')tireViewer.fit();else render();});setView('2d');
