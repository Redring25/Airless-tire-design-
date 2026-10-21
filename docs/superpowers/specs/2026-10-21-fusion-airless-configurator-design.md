# Fusion 360 Airless Tire Configurator

## Goal

Add a GitHub Pages download surface for one installable Autodesk Fusion 360 Python add-in. When installed, it provides an **Airless Tire Configurator** panel containing commands for Honeycomb straight, Vertical spoke, S-curve spoke, and Auxetic shape tire designs.

## User flow

1. The website’s new **Fusion 360 Add-in** tab explains the add-in and offers one ZIP download.
2. The user extracts the ZIP into their Fusion 360 AddIns directory and registers the included `.manifest` file through Fusion’s Scripts and Add-Ins dialog.
3. Fusion shows the **Airless Tire Configurator** panel in the Design workspace.
4. The user selects one of four commands, changes visible parameter inputs, and clicks OK.
5. The add-in creates a named component containing the chosen airless-tire solid.

## Package layout

`SophiStudio-Airless-Tire-Configurator.zip` contains:

- `AirlessTireConfigurator.py` — Fusion entry point, command definitions, panel lifecycle, parameter dialogs, and model dispatch.
- `AirlessTireConfigurator.manifest` — Fusion add-in registration metadata.
- `lib/geometry.py` — shared validation and Fusion BRep construction helpers.
- `README.md` — installation, launch, and removal instructions.

The published site stores this prebuilt ZIP under `docs/downloads/` and links directly to it. It does not execute Fusion code in the browser.

## Fusion user interface

The add-in uses valid ASCII command IDs prefixed with `SophiStudioAirless` to avoid the prior Fusion `invalid id` error. On `run`, it creates one panel titled **Airless Tire Configurator** in the Design workspace’s Solid tab and promotes four command buttons:

- `Honeycomb straight`
- `Vertical spoke`
- `S-curve spoke`
- `Auxetic shape`

On `stop`, it removes only definitions, controls, and the panel created by this add-in.

## Parameters

All commands accept outer diameter, inner diameter, tire width, outer-ring thickness, inner-ring thickness, pattern count/layers, and web/spoke thickness.

- Honeycomb straight: cells per layer and layers.
- Vertical spoke: curve count, curve thickness, and curve distance.
- S-curve spoke: curve count, curve thickness, and S-curve ratio.
- Auxetic shape: cells per layer, layers, wall thickness, and inward cell depth.

The add-in validates positive dimensions, ensures outer diameter exceeds inner diameter, and prevents boundary rings from occupying the complete radial gap.

## Geometry and export boundary

The add-in creates native Fusion BRep geometry, not an STL approximation. It creates boundary rings first, then patterned webs/spokes inside the radial gap. The user may export resulting Fusion components to STEP from Fusion’s normal export tools.

Geometry is designed as a configurable native Fusion starting point; complex intersections may be simplified where Fusion’s boolean operation requires a robust fallback.

## Verification

- Unit-test pure parameter validation and command-ID/package metadata helpers outside Fusion.
- Inspect the ZIP contents and manifest JSON before publishing.
- Verify every command ID is ASCII-only and every command’s parameter defaults are valid.
- In Fusion 360, confirm the panel is visible after installation, a command dialog opens, and a named component is created for each pattern.

