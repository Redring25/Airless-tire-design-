// Local canvas renderer for the tessellated CAD solid; no remote libraries.
// Load CAD properties even in 2D or without WebGL. Revision checks reject stale builds.
const tireModel = (() => {
  let timer, revision=0;
  function clear(){clearTimeout(timer);revision++;window.dispatchEvent(new Event('model-pending'));}
  function update(parameters,done=()=>{}){
    clear();const current=revision;
    timer=setTimeout(async()=>{
      try{
        window.dispatchEvent(new Event('model-building'));
        const response=await fetch('/api/preview-mesh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parameters)});
        const data=await response.json();
        if(current!==revision)return;
        if(!response.ok)throw Error(data.detail||'CAD model could not be built');
        window.dispatchEvent(new CustomEvent('model-ready',{detail:data}));done(data);
      }catch(error){if(current===revision)window.dispatchEvent(new CustomEvent('model-error',{detail:error.message}));}
    },650);
  }
  return {clear,update};
})();
const tireViewer = (() => {
  const canvas = document.querySelector('#preview-3d');
  const gl = canvas.getContext('webgl',{antialias:true,alpha:true,preserveDrawingBuffer:true});
  if (!gl) { document.querySelector('#view-note').textContent='3D rendering is unavailable in this browser'; return {update:tireModel.update,fit(){},setActive(){}}; }
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 position; attribute vec3 color; varying vec3 shade; void main(){gl_Position=vec4(position,1.0);shade=color;}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec3 shade; void main(){gl_FragColor=vec4(shade,1.0);}'));
  gl.linkProgram(program);gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,offset] of [['position',0],['color',12]]){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,offset);}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.clearColor(0,0,0,0);
  let mesh = null, angleX = -.55, angleY = .55, zoom = 1;
  let dragging = false, previous, pendingFrame = false;
  let active = true;
  const note = document.querySelector('#view-note');
  function schedule() {
    if (pendingFrame) return;
    pendingFrame = true;
    requestAnimationFrame(() => { pendingFrame = false; draw(); });
  }
  function draw() {
    if (!active) return;
    const {width, height} = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width*dpr) || canvas.height !== Math.round(height*dpr)) {
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    }
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if (!mesh) return;
    const cx=Math.cos(angleX),sx=Math.sin(angleX),cy=Math.cos(angleY),sy=Math.sin(angleY);
    const extent = mesh.vertices.reduce((maximum,v)=>Math.max(maximum,Math.hypot(...v)),1);
    const scale = Math.min(width,height)*.39/extent*zoom;
    const points = mesh.vertices.map(([x,y,z]) => {
      const yy=y*cx-z*sx,zz=y*sx+z*cx;
      return [x*cy+zz*sy,yy,-x*sy+zz*cy];
    });
    const faces = mesh.triangles.map(indices => {
      const a=points[indices[0]],b=points[indices[1]],c=points[indices[2]];
      return {a,b,c,z:(a[2]+b[2]+c[2])/3};
    });
    const packed=[];
    for (const {a,b,c} of faces) {
      const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
      const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      const length=Math.hypot(nx,ny,nz)||1;
      const light=.35+.65*Math.abs((nx*-.35+ny*.45+nz*.82)/length);
      const color=[(16+light*34)/255,(35+light*55)/255,(66+light*80)/255];
      for(const point of [a,b,c])packed.push(point[0]*scale*2/width,point[1]*scale*2/height,-point[2]/(extent*4),...color);
    }
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(packed),gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES,0,packed.length/6);
  }
  function update(parameters) {
    mesh=null;schedule();if(active)note.textContent='Building 3D model…';
    tireModel.update(parameters,data=>{mesh=data;if(active)note.textContent='Drag to rotate · Scroll to zoom';schedule();});
  }
  window.addEventListener('model-error',e=>{if(active)note.textContent=e.detail;});
  canvas.addEventListener('pointerdown',e=>{dragging=true;previous=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;angleY+=(e.clientX-previous[0])*.009;angleX-=(e.clientY-previous[1])*.009;previous=[e.clientX,e.clientY];schedule();});
  canvas.addEventListener('pointerup',()=>dragging=false);
  canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.3,Math.min(3,zoom*Math.exp(-e.deltaY*.001)));schedule();},{passive:false});
  new ResizeObserver(schedule).observe(canvas);
  return {update,fit(){angleX=-.55;angleY=.55;zoom=1;schedule();},setActive(value){active=value;schedule();}};
})();
