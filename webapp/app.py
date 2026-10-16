from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from geometry import TireParameters, export_step, polar_cells, preview_mesh, spoke_profiles


ROOT = Path(__file__).resolve().parent
app = FastAPI(title="SophiStudio Airless Tire Design")


class TireRequest(BaseModel):
    mode: str = "honeycomb"
    inner_diameter: float = Field(80, gt=0)
    outer_diameter: float = Field(160, gt=0)
    tire_width: float = Field(45, gt=0)
    outer_band: float = Field(4, gt=0)
    inner_band: float = Field(2, gt=0)
    cells_per_layer: int = Field(20, ge=3, le=80)
    layers: int = Field(3, ge=1, le=12)
    web_thickness: float = Field(2, gt=0)
    curve_amplitude: float = Field(1.5, ge=0)
    spoke_thickness: float = Field(2, gt=0)
    spoke_count: int = Field(32, ge=3, le=120)
    spoke_distance: float = Field(8, ge=0)
    s_curve_ratio: float = Field(.15, ge=0, le=.3)
    auxetic_depth: float = Field(.25, ge=.05, le=.4)

    def geometry(self) -> TireParameters:
        if self.mode not in {"honeycomb", "vertical_spoke", "s_curve", "auxetic"}:
            raise ValueError("Unknown design mode.")
        return TireParameters(**self.model_dump())


@app.post("/api/validate")
def validate(request: TireRequest):
    try:
        parameters = request.geometry()
        if parameters.mode in {"vertical_spoke", "s_curve"}:
            return {"valid": True, "cell_count": len(spoke_profiles(parameters))}
        _, _, cells = polar_cells(parameters)
        if parameters.mode == "auxetic":
            return {"valid": True, "cell_count": parameters.cells_per_layer*parameters.layers}
        return {"valid": True, "cell_count": len(cells)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/preview-mesh")
def mesh_preview(request: TireRequest):
    try:
        return preview_mesh(request.geometry())
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"3D generation failed: {error}") from error


@app.post("/api/export-step")
def step_export(request: TireRequest, background_tasks: BackgroundTasks):
    try:
        parameters = request.geometry()
        temp = NamedTemporaryFile(prefix="sophistudio_airless_", suffix=".step", delete=False)
        temp.close()
        path = Path(temp.name)
        export_step(parameters, path)
        background_tasks.add_task(path.unlink, missing_ok=True)
        mode = {"vertical_spoke":"vertical-spoke", "s_curve":"s-curve-spoke", "auxetic":"auxetic"}.get(parameters.mode,"honeycomb")
        return FileResponse(path, filename=f"SophiStudio-airless-{mode}.step", media_type="application/step")
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"STEP generation failed: {error}") from error


app.mount("/", StaticFiles(directory=ROOT / "static", html=True), name="static")
