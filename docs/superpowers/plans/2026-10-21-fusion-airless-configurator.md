# Fusion Airless Tire Configurator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one downloadable Fusion 360 Python add-in ZIP containing four airless-tire generator commands in an Airless Tire Configurator panel.

**Architecture:** The Fusion add-in owns Fusion UI lifecycle and native BRep geometry creation. Pure parameter/metadata helpers remain testable with normal Python. The GitHub Pages site distributes a prebuilt ZIP and explains installation; it does not execute Fusion code.

**Tech Stack:** Autodesk Fusion 360 Python API, Python standard library, vanilla HTML/CSS/JavaScript, ZIP archive.

**Spec:** `docs/superpowers/specs/2026-10-21-fusion-airless-configurator-design.md`

## Global Constraints

- Use ASCII-only command IDs prefixed with `SophiStudioAirless`.
- Create exactly one panel titled **Airless Tire Configurator** with four pattern commands.
- The add-in must clean up only its own UI definitions and controls on stop.
- Website distribution is one ZIP under `docs/downloads/`.
- Native Fusion geometry remains a configurable BRep starting point; users export STEP from Fusion itself.

## Review Focus

- Repeated start/stop does not duplicate the Fusion panel or controls; test cleanup identifiers in Task 2.
- Invalid or inverted inner/outer diameters block model generation; test validation in Task 1.
- Every command has valid default inputs and an ASCII command ID; test metadata in Task 1.
- The ZIP contains the manifest, add-in entry point, geometry module, and README; test archive paths in Task 3.
- The GitHub download link points to the exact generated ZIP; test page copy/link in Task 3.

---

## File Structure

- `fusion_addin/AirlessTireConfigurator/AirlessTireConfigurator.py` — Fusion `run`/`stop`, panel, commands, dialogs, and dispatch.
- `fusion_addin/AirlessTireConfigurator/AirlessTireConfigurator.manifest` — Fusion add-in metadata.
- `fusion_addin/AirlessTireConfigurator/lib/configurator.py` — parameter validation, command metadata, and pattern naming.
- `fusion_addin/AirlessTireConfigurator/lib/geometry.py` — Fusion BRep ring/web/spoke construction.
- `fusion_addin/AirlessTireConfigurator/README.md` — Windows Fusion installation instructions.
- `fusion_addin/tests/test_configurator.py` — pure Python tests runnable without Fusion.
- `docs/downloads/SophiStudio-Airless-Tire-Configurator.zip` — downloadable package.
- `docs/index.html` / `docs/styles.css` — Fusion 360 Add-in tab and ZIP link.

### Task 1: Define testable add-in metadata and parameter validation

**Files:**
- Create: `fusion_addin/AirlessTireConfigurator/lib/configurator.py`
- Create: `fusion_addin/tests/test_configurator.py`

**Interfaces:**
- Produces: `COMMANDS: tuple[dict, ...]` with `id`, `name`, and `pattern` keys.
- Produces: `validate_parameters(values: dict) -> tuple[bool, str]`.
- Produces: `component_name(pattern: str) -> str`.

- [ ] **Step 1: Write failing command-ID/default and dimensional validation tests**

```python
assert all(command['id'].startswith('SophiStudioAirless') and command['id'].isascii() for command in COMMANDS)
assert validate_parameters({'outer_diameter': 80, 'inner_diameter': 80, ...})[0] is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest fusion_addin.tests.test_configurator -v`
Expected: FAIL because the configurator module does not exist.

- [ ] **Step 3: Implement `COMMANDS`, `validate_parameters`, and `component_name`**

Use four metadata entries and reject non-positive values, inverted diameters, or a ring gap less than or equal to zero.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest fusion_addin.tests.test_configurator -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fusion_addin/AirlessTireConfigurator/lib/configurator.py fusion_addin/tests/test_configurator.py
git commit -m "feat: define Fusion configurator commands"
```

### Task 2: Create Fusion panel, commands, and native tire components

**Files:**
- Create: `fusion_addin/AirlessTireConfigurator/AirlessTireConfigurator.py`
- Create: `fusion_addin/AirlessTireConfigurator/lib/geometry.py`
- Create: `fusion_addin/AirlessTireConfigurator/AirlessTireConfigurator.manifest`
- Modify: `fusion_addin/tests/test_configurator.py`

**Interfaces:**
- Consumes: `COMMANDS`, `validate_parameters`, and `component_name` from Task 1.
- Produces: Fusion panel **Airless Tire Configurator** and four commands.
- Produces: `create_tire_component(pattern: str, values: dict) -> adsk.fusion.Component`.

- [ ] **Step 1: Add failing manifest and UI-identifier tests**

```python
assert manifest['runOnStartup'] is False
assert PANEL_ID == 'SophiStudioAirlessPanel'
assert len(COMMANDS) == 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest fusion_addin.tests.test_configurator -v`
Expected: FAIL because panel/manifest constants are absent.

- [ ] **Step 3: Implement Fusion lifecycle and pattern geometry**

Create the Design/Solid panel only if absent, register button definitions from Task 1, collect command dialog values, create boundary-ring BRep geometry plus the selected pattern’s web/spoke bodies, and remove add-in-owned controls/definitions in `stop`.

- [ ] **Step 4: Run pure tests and Fusion smoke test**

Run: `python -m unittest fusion_addin.tests.test_configurator -v`
Expected: PASS.

In Fusion: install the add-in, run each command, and confirm an appropriately named component is created.

- [ ] **Step 5: Commit**

```bash
git add fusion_addin/AirlessTireConfigurator fusion_addin/tests/test_configurator.py
git commit -m "feat: add Fusion airless tire panel"
```

### Task 3: Package and publish the add-in from GitHub Pages

**Files:**
- Create: `fusion_addin/AirlessTireConfigurator/README.md`
- Create: `fusion_addin/tests/test_package.py`
- Create: `docs/downloads/SophiStudio-Airless-Tire-Configurator.zip`
- Modify: `docs/index.html`
- Modify: `docs/styles.css`

**Interfaces:**
- Consumes: add-in package directory from Task 2.
- Produces: a ZIP containing `AirlessTireConfigurator.py`, `.manifest`, `lib/`, and `README.md`.

- [ ] **Step 1: Write failing archive/content and website-link tests**

```python
assert 'AirlessTireConfigurator/AirlessTireConfigurator.manifest' in archive_names
assert 'docs/downloads/SophiStudio-Airless-Tire-Configurator.zip' in page_source
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest fusion_addin.tests.test_package -v`
Expected: FAIL because package/website link do not exist.

- [ ] **Step 3: Add installation guide, build archive, and website download tab**

Write the Fusion installation guide, generate the single ZIP, and add a clearly visible **Fusion 360 Add-in** tab with its direct download and pattern list.

- [ ] **Step 4: Run package and website checks**

Run: `python -m unittest discover -s fusion_addin/tests -v`
Expected: PASS.

Run: `node --check docs/quotation.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fusion_addin docs
git commit -m "feat: publish Fusion configurator download"
```

