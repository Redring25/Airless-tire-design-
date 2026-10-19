// GitHub Pages preview: no Python/CAD backend is available here.
const tireModel={clear(){}};
const tireViewer={update(){},fit(){},setActive(){}};
document.querySelector('.status').textContent='GitHub Pages · 2D preview';
document.querySelector('.weight-panel').innerHTML='<h2>Static preview only</h2><p class="export-help">Explore all four patterns and adjust their dimensions in 2D. STEP export, 3D CAD rendering and CAD-based weight calculations require the Python server. Download the source from GitHub and follow webapp/README.md to use the full application locally.</p><a href="https://github.com/Redring25/Airless-tire-design-/tree/main/webapp">Full application source and instructions</a>';
document.querySelector('#view-3d').disabled=true;
document.querySelector('#view-3d').title='Requires the Python CAD server';
document.querySelector('#export-button').title='STEP export requires the Python CAD server';
document.querySelector('#export-button span').textContent='STEP · local app only';
document.querySelector('.export-panel > .export-help').textContent='This GitHub Pages version is an interactive 2D preview. No CAD backend is connected.';
