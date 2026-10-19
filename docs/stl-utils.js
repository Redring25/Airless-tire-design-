(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SophiStl=api;
})(typeof window==='undefined'?globalThis:window,()=>{
  function createStlFilename(parameters){
    const pattern=String(parameters.mode||'airless').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
    const diameter=Number(parameters.outer_diameter);
    return `sophistudio-${pattern}-${Number.isFinite(diameter)?diameter:'custom'}mm.stl`;
  }
  function stlFromTriangles(triangles){
    const lines=['solid sophistudio-airless'];
    for(const triangle of triangles){
      const [a,b,c]=triangle;
      const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      lines.push(`  facet normal ${nx} ${ny} ${nz}`,'    outer loop',`      vertex ${a.join(' ')}`,`      vertex ${b.join(' ')}`,`      vertex ${c.join(' ')}`,'    endloop','  endfacet');
    }
    lines.push('endsolid sophistudio-airless');
    return lines.join('\n');
  }
  return {createStlFilename,stlFromTriangles};
});
