# Browser Three.js STL Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the GitHub Pages application a standalone Three.js airless-tire generator with interactive 3D mesh preview, mesh-based weight estimates, and STL export.

**Architecture:** Add focused browser modules that convert current UI parameters to a deterministic triangle mesh, measure mesh volume, and export the mesh through Three.js. Replace `static-mode.js` stubs with the browser geometry/viewer, while preserving `app.js` as the shared parameter/2D controller and leaving the local Python/CAD backend intact.

**Tech Stack:** Vanilla JavaScript, Three.js r160, Three.js STLExporter, static GitHub Pages, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-19-browser-threejs-stl-design.md`

## Global Constraints

- The published application must work from static GitHub Pages without a Python/CAD server.
- Preserve the existing Sophi Studio visual system and tire pattern controls.
- Browser export is STL in millimetres, not STEP/AP214.
- The local backend remains available for local STEP workflows.
- Weight and quotation values are mesh-based estimates; invalid mesh state must disable export and clear stale values.

## Review Focus

- A browser without WebGL still permits 2D inspection and STL export from generated geometry; test this in the viewer fallback task.
- Invalid diameter, band, layer, and thickness combinations do not generate a mesh or enable stale export; test in the mesh validation task.
- Each of the four supported patterns produces a non-empty, finite mesh; test per-pattern in the browser mesh task.
- Mesh volume stays positive after an ordinary parameter update and can feed current weight logic; test in the volume task.
- Generated STL has the expected mm filename and non-empty triangle payload; test in the export task.

---

## File Structure

- `docs/vendor/three.module.min.js` — pinned Three.js runtime checked into static publishing tree.
- `docs/vendor/STLExporter.js` — pinned Three.js STL export helper.
- `docs/browser-mesh.js` — pure parameter validation, annular/pattern mesh construction, and volume utilities.
- `docs/browser-viewer.js` — Three.js scene, orbit controls, view toggles, mesh lifecycle, and model events.
- `docs/browser-export.js` — STL download and export availability state.
- `docs/static-mode.js` — remove backend stubs, wire the static page to browser modules and mesh-based weight events.
- `docs/weight.js` — browser volume-to-FDM/LCD weight state, adapted from the local calculation UI.
- `docs/quotation.js` — browser quotation and PDF/XLSX export state, copied from the local app's tested module.
- `docs/index.html` / `docs/styles.css` — load browser modules and relabel the UI to STL/mesh estimates.
- `docs/tests/browser-mesh.test.cjs` — pure mesh construction/measurement tests.
- `docs/tests/browser-export.test.cjs` — filename and STL export tests using test doubles.

### Task 1: Establish browser mesh primitives and validation

**Files:**
- Create: `docs/browser-mesh.js`
- Create: `docs/tests/browser-mesh.test.cjs`

**Interfaces:**
- Produces: `validateBrowserParameters(parameters) -> {valid:boolean, message:string}`
- Produces: `createBrowserMesh(parameters) -> {positions:Float32Array, indices:Uint32Array, volumeMm3:number}`
- Produces: `measureMeshVolume(positions, indices) -> number`

- [ ] **Step 1: Write failing validation and volume tests**

```js
assert.equal(validateBrowserParameters({outer_diameter: 80, inner_diameter: 80}).valid, false);
assert.equal(measureMeshVolume(cube.positions, cube.indices), 1000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test docs/tests/browser-mesh.test.cjs`
Expected: FAIL because browser mesh exports do not exist.

- [ ] **Step 3: Implement parameter validation and signed-tetrahedron volume measurement**

Implement the exact interfaces in `docs/browser-mesh.js`; return zero or invalid state for non-finite mesh data.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test docs/tests/browser-mesh.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/browser-mesh.js docs/tests/browser-mesh.test.cjs
git commit -m "feat: add browser mesh validation and measurement"
```

### Task 2: Generate meshes for the supported patterns

**Files:**
- Modify: `docs/browser-mesh.js`
- Modify: `docs/tests/browser-mesh.test.cjs`

**Interfaces:**
- Consumes: `validateBrowserParameters(parameters)`.
- Produces: `createBrowserMesh(parameters)` for `honeycomb`, `vertical_spoke`, `s_curve`, and `auxetic` patterns.

- [ ] **Step 1: Add failing pattern-mesh tests**

```js
for (const pattern of ['honeycomb','vertical_spoke','s_curve','auxetic']) {
  const mesh=createBrowserMesh({...defaults, pattern});
  assert.ok(mesh.indices.length > 0);
  assert.ok(mesh.volumeMm3 > 0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test docs/tests/browser-mesh.test.cjs`
Expected: FAIL because pattern mesh geometry is missing.

- [ ] **Step 3: Implement ring and patterned web/spoke mesh generation**

Build closed annular ring meshes and radial web profiles with the current pattern controls; merge them into indexed millimetre geometry and recalculate `volumeMm3`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test docs/tests/browser-mesh.test.cjs`
Expected: PASS for all four patterns.

- [ ] **Step 5: Commit**

```bash
git add docs/browser-mesh.js docs/tests/browser-mesh.test.cjs
git commit -m "feat: generate browser tire meshes"
```

### Task 3: Render the generated mesh in Three.js

**Files:**
- Create: `docs/browser-viewer.js`
- Create: `docs/vendor/three.module.min.js`
- Modify: `docs/index.html`
- Modify: `docs/styles.css`

**Interfaces:**
- Consumes: `createBrowserMesh(parameters)`.
- Produces: `window.tireModel.update(parameters, done)` and `window.tireViewer.{fit,setActive}` compatible with `docs/app.js`.
- Emits: `model-pending`, `model-ready` with `{volumeMm3}`, and `model-error`.

- [ ] **Step 1: Add an interaction check script for Three.js viewer lifecycle**

Create a browser smoke script that asserts a canvas exists, model-ready fires for default parameters, and the view controls preserve usable UI state.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node docs/tests/browser-viewer-smoke.cjs`
Expected: FAIL because the browser viewer module is not loaded.

- [ ] **Step 3: Add pinned Three.js and implement the browser viewer**

Create the scene/camera/lights/renderer, turn browser mesh arrays into `THREE.BufferGeometry`, keep 2D/3D toggles and fit behaviour, and make WebGL failure leave the 2D UI plus mesh pipeline available.

- [ ] **Step 4: Run the smoke check and static-server visual check**

Run: `node docs/tests/browser-viewer-smoke.cjs`
Expected: PASS.

Run: `python -m http.server 8080 --directory docs`
Expected: page loads with a visible 3D default tire and no JavaScript errors.

- [ ] **Step 5: Commit**

```bash
git add docs/browser-viewer.js docs/vendor docs/index.html docs/styles.css docs/tests/browser-viewer-smoke.cjs
git commit -m "feat: render tire meshes with Three.js"
```

### Task 4: Add browser STL export and mesh-based weight integration

**Files:**
- Create: `docs/browser-export.js`
- Create: `docs/vendor/STLExporter.js`
- Create: `docs/tests/browser-export.test.cjs`
- Create: `docs/weight.js`
- Create: `docs/quotation.js`
- Modify: `docs/static-mode.js`
- Modify: `docs/index.html`
- Modify: `docs/styles.css`

**Interfaces:**
- Consumes: current generated `THREE.BufferGeometry` and `model-ready.detail.volumeMm3`.
- Produces: `createStlFilename(parameters) -> string` and `downloadBrowserStl(geometry, filename)`.
- Emits: the existing weight-ready event shape expected by `docs/quotation.js`.

- [ ] **Step 1: Write failing filename/STL export tests**

```js
assert.equal(createStlFilename({pattern:'auxetic',outer_diameter:160}), 'sophistudio-auxetic-160mm.stl');
assert.ok(createAsciiStl(triangleGeometry).includes('facet normal'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test docs/tests/browser-export.test.cjs`
Expected: FAIL because exporter helpers do not exist.

- [ ] **Step 3: Implement STL export and static mesh state wiring**

Use the pinned `STLExporter` for browser downloads, change visual copy from STEP to STL, and map `volumeMm3` to the existing material/FDM/LCD weight calculations and quotation events. Restore the existing local weight/quotation controls and modules under `docs/`, adapting their source event from CAD response to `model-ready.detail.volumeMm3`.

- [ ] **Step 4: Run export and regression checks**

Run: `node --test docs/tests/browser-mesh.test.cjs docs/tests/browser-export.test.cjs`
Expected: PASS.

Run: `node --test webapp/tests/test_weight.cjs webapp/tests/test_quotation.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/browser-export.js docs/vendor/STLExporter.js docs/tests/browser-export.test.cjs docs/static-mode.js docs/weight.js docs/quotation.js docs/index.html docs/styles.css
git commit -m "feat: export browser tire meshes as STL"
```

### Task 5: Publish verification and documentation

**Files:**
- Modify: `README.md` or create: `docs/README.md`
- Modify: `docs/index.html`

**Interfaces:**
- Consumes: browser generator and exporter from Tasks 1–4.
- Produces: GitHub Pages instructions that distinguish direct STL export from local STEP export.

- [ ] **Step 1: Add a failing documentation assertion**

Add a test or content check that requires the published page to mention `STL`, `millimetres`, and local-only `STEP`.

- [ ] **Step 2: Run the check to verify it fails**

Run: `node docs/tests/browser-page-copy.test.cjs`
Expected: FAIL before the copy is updated.

- [ ] **Step 3: Update published copy and usage documentation**

Document direct STL export, mesh-based quotation estimates, and the retained local Python workflow for exact STEP export.

- [ ] **Step 4: Run final verification**

Run: `node --test docs/tests/*.test.cjs webapp/tests/test_weight.cjs webapp/tests/test_quotation.cjs`
Expected: PASS.

Run: `python -m http.server 8080 --directory docs`
Expected: all four patterns render, a parameter change refreshes the mesh/weight, and an STL download is non-empty.

- [ ] **Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: explain browser STL workflow"
```

