# Browser-native Three.js tire generator

## Goal

Replace the GitHub Pages static preview with a complete browser-native airless-tire generator. It must run entirely from GitHub Pages, provide an interactive 3D tire model, and export the generated model as an STL suitable for downstream 3D-print preparation.

## User-visible scope

- Retain the Sophi Studio layout, tire-pattern tabs, parameter controls, and approximate manufacturing quotation controls.
- Render the selected honeycomb straight, vertical spoke, S-curve spoke, or auxetic pattern as interactive Three.js geometry in the browser.
- Generate an STL download locally in the browser without uploading user geometry to a server.
- Calculate approximate volume and weight from the generated mesh so FDM/LCD quotations work on GitHub Pages.
- Clearly label browser values as mesh-based estimates and STL as a triangulated manufacturing mesh.

## Deliberate boundary

The browser version will not create STEP/AP214. STEP is a parametric CAD exchange format and requires a CAD kernel/backend. The existing Python server remains in the repository for local STEP workflows, but GitHub Pages will offer STL rather than a non-functional STEP button.

## Architecture

`docs/` becomes the self-contained published application:

1. `three.min.js` and `STLExporter.js` are included as versioned static vendor assets, avoiding a runtime dependency on a CDN.
2. A browser geometry module converts the existing parameter state into a ring body and patterned web/spoke meshes. It uses deterministic meshes, then merges them into a Three.js `BufferGeometry`.
3. The Three.js view supports orbit rotation, zoom, 2D/3D mode selection, fit view, and grid visibility. The existing SVG stays only as the 2D schematic.
4. A mesh measurement module calculates signed tetrahedral volume from the indexed triangle mesh. That volume feeds existing material/FDM/LCD quotation calculations.
5. The export control serializes the currently generated mesh through `STLExporter` and downloads a named `.stl` file.

## Geometry expectations

- Boundary rings are annular solids determined by outer/inner diameter, boundary thickness, and tire width.
- Pattern webs span only the gap between the two rings.
- Honeycomb cells grow with radial layer position, preserve the existing 2D shape logic, and are clipped by the two circular boundaries.
- Spoke and auxetic patterns retain their current adjustable count, thickness, bow/ratio, and cell-depth controls. Geometry is intentionally an approximate printable mesh rather than a CAD B-rep.
- Every generated mesh uses millimetres as its design unit. STL itself carries no units; the downloaded filename and UI will state millimetres.

## Failure behaviour

- Invalid parameter combinations show a validation message and keep export disabled.
- If WebGL is unavailable, 2D remains usable and STL export remains available from the generated geometry.
- If the mesh cannot be generated, weight values are cleared and no stale quotation/export is permitted.

## Verification

- Unit-test pure parameter validation, mesh-volume calculation, and STL filename generation.
- Verify locally and from GitHub Pages that each pattern renders, a parameter update changes geometry, and the export downloads a non-empty STL.
- Verify the mesh-based FDM/LCD weight and quotation update after a successful build.

