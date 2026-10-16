# SophiStudio — Airless Tire Design

A local tire-design website with 2D/3D previews, direct STEP export, and
approximate product-weight calculations. FastAPI and CadQuery build the CAD solid.

## Run locally

```powershell
cd webapp
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Install Python 3.12 (64-bit) first. Internet access is needed to install the
dependencies; the ZIP does not include Python or a virtual environment.
Open `http://127.0.0.1:8000`. Keep the terminal running; Ctrl+C stops the server.

## Design modes

- **Honeycomb straight:** expanding polar honeycomb.
- **Vertical spoke:** curved spokes with secondary branches.
- **S-CURVE spoke:** adjustable opposing bends.
- **Auxetic shape:** re-entrant cells with adjustable dimensions.

Patterns retain solid ID/OD bands and export the full tire width.

## Weight estimates

TPU 90, TPU 120, and custom materials have editable density, initially 1.20 g/cm³.
FDM estimates use adjustable infill and shell thickness; LCD estimates use solid
CAD volume and editable resin density. Estimates exclude supports and waste.
Unchanged geometry reuses its CAD measurement for immediate recalculation.

## Deployment

The service can run on any Python host that supports CadQuery's native wheels.
Because STEP export is CPU-bound, use a persistent server/container rather than
an edge-function runtime.
