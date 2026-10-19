const test=require('node:test');
const assert=require('node:assert/strict');
const {createStlFilename,stlFromTriangles}=require('../stl-utils.js');

test('names browser exports with the pattern and millimetre diameter',()=>{
  assert.equal(createStlFilename({mode:'auxetic',outer_diameter:160}),'sophistudio-auxetic-160mm.stl');
});

test('serializes a triangle as printable ASCII STL',()=>{
  const stl=stlFromTriangles([[[0,0,0],[10,0,0],[0,10,0]]]);
  assert.match(stl,/solid sophistudio-airless/);
  assert.match(stl,/facet normal 0 0 100/);
  assert.match(stl,/vertex 10 0 0/);
  assert.match(stl,/endsolid sophistudio-airless/);
});
