# Manufacturing Quotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser-local FDM/LCD manufacturing quotations in CNY, including a 15% tax calculation and Excel/PDF exports based on measured tire weight.

**Architecture:** A focused quotation module owns pure CNY calculation rules, browser state, and client-side export payloads. The existing weight module publishes a validated pair of FDM/LCD weights and an invalidation event; the quotation module consumes those events, updates its panel, and disables exports until a valid selected weight exists.

**Tech Stack:** Browser JavaScript, current FastAPI/CadQuery local app, SheetJS (`xlsx`) for `.xlsx` creation, jsPDF for PDF creation, Node test runner, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-10-19-manufacturing-quotation-design.md`

## Global Constraints

- Currency is Chinese yuan, formatted with `¥` and two decimal places.
- Tax rate is fixed at 15% in this first version.
- Calculations and exports stay in the browser; no quotation/customer data is sent to the server.
- FDM uses the calculated FDM weight; LCD uses the calculated LCD weight.
- Exports are enabled only after a positive selected manufacturing weight and valid pricing inputs are available.
- The GitHub Pages static 2D preview does not produce a weight-based quotation.

## Review Focus

- A decimal material price such as `¥86.50/kg` must retain precision through base price, tax, and total.
- A quantity of zero, a negative cost, or a missing CAD weight must disable exports and explain why.
- Switching FDM/LCD after both weights exist must immediately switch the weight basis without rebuilding CAD.
- A geometry change during an existing quote must invalidate price totals and exports until a fresh weight arrives.
- Excel and PDF files must contain the displayed design, manufacturing, and total values—not merely download successfully.

---

### Task 1: Pure quotation calculation contract

**Files:**
- Create: `webapp/static/quotation.js`
- Create: `webapp/tests/test_quotation.cjs`

**Interfaces:**
- Produces: `calculateQuotation(input)` where `input` is `{partWeightG, quantity, materialPriceCnyPerKg, setupCostCny, additionalCostCny, taxRate}` and the return value is `{partWeightKg, totalMaterialWeightKg, materialCostCny, basePriceCny, taxCny, totalCny, taxRate}`.
- Produces: `formatCny(value)` returning a `¥` two-decimal string.
- Produces: `validateQuotationInput(input)` returning `{valid: boolean, message: string}`.

- [ ] **Step 1: Write failing calculation and validation tests**

```javascript
test('calculates a 15 percent FDM quotation in CNY',()=>{
  const result=calculateQuotation({partWeightG:188.3,quantity:10,materialPriceCnyPerKg:86.5,setupCostCny:50,additionalCostCny:20,taxRate:.15});
  assert.equal(result.totalMaterialWeightKg,1.883);
  assert.equal(result.materialCostCny,162.8795);
  assert.equal(result.basePriceCny,232.8795);
  assert.equal(result.taxCny,34.931925);
  assert.equal(result.totalCny,267.811425);
});
```

Include tests that reject zero quantity, negative costs, and missing/non-positive part weight.

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `node --test tests/test_quotation.cjs`

Expected: FAIL because `quotation.js` and its exported functions do not exist.

- [ ] **Step 3: Implement quotation calculation functions in `webapp/static/quotation.js`**

Implement exact kilogram conversion and the formula in the spec without early rounding; round only when rendering `formatCny`. Validate quantity as a positive integer and every cost as finite and non-negative.

- [ ] **Step 4: Run the quotation calculation tests**

Run: `node --test tests/test_quotation.cjs`

Expected: PASS, including decimal-price, invalid-input, and tax assertions.

- [ ] **Step 5: Commit the calculation contract**

```bash
git add webapp/static/quotation.js webapp/tests/test_quotation.cjs
git commit -m "feat: add quotation calculations"
```

### Task 2: Weight-to-quotation state bridge and panel

**Files:**
- Modify: `webapp/static/weight.js`
- Modify: `webapp/static/index.html`
- Modify: `webapp/static/styles.css`
- Modify: `webapp/static/quotation.js`
- Modify: `webapp/static/app.js`
- Test: `webapp/tests/test_quotation.cjs`

**Interfaces:**
- Consumes: `calculateQuotation(input)`, `validateQuotationInput(input)`, and `formatCny(value)` from Task 1.
- Produces: a `quotation-weights-ready` `CustomEvent` with `{fdmWeightG, lcdWeightG, materialName, tireSummary}` after valid weights are calculated.
- Produces: a `quotation-weights-invalid` event when model geometry invalidates the measured weights.

- [ ] **Step 1: Write failing event/state tests**

Add tests for a valid FDM selection returning the FDM weight, a valid LCD selection returning the LCD weight, and an invalidated model disabling quote validity.

- [ ] **Step 2: Run targeted tests to verify the new state assertions fail**

Run: `node --test tests/test_quotation.cjs`

Expected: FAIL because weight-selection and invalidation state have not been implemented.

- [ ] **Step 3: Add the Manufacturing quotation panel to `webapp/static/index.html`**

Place it after the existing single-product weight section. Add FDM/LCD manufacturing controls; quantity; material price in `¥/kg`; machine/setup cost; additional cost; read-only selected weight and total material weight; base price; 15% tax; total quote; inline validation text; and disabled Excel/PDF export buttons. Include `quotation.js` after `weight.js`.

- [ ] **Step 4: Implement the state bridge and panel controller**

In `weight.js`, dispatch `quotation-weights-ready` only after both displayed FDM and LCD values are valid. Dispatch `quotation-weights-invalid` during the existing `model-pending` and model-error states. In `quotation.js`, retain pricing entries but clear calculated totals and disable exports whenever the invalidation event arrives. On a manufacturing selector or pricing input change, recompute using the selected weight without triggering CAD regeneration.

- [ ] **Step 5: Add responsive quotation-panel styles**

Use the existing input-grid, summary, validation, and button visual system. Make total quote visually distinct while keeping the right panel scrollable at desktop and mobile widths.

- [ ] **Step 6: Run browser integration validation**

Use Playwright to calculate weight, select FDM then LCD, enter `10`, `86.5`, `50`, and `20`, and assert the quoted total is `¥267.81` for the FDM fixture. Change a geometry parameter and assert export buttons disable until a new weight is calculated.

- [ ] **Step 7: Commit the quotation panel and event bridge**

```bash
git add webapp/static/weight.js webapp/static/quotation.js webapp/static/index.html webapp/static/styles.css webapp/static/app.js webapp/tests/test_quotation.cjs
git commit -m "feat: add FDM and LCD quotation panel"
```

### Task 3: Client-side Excel and PDF exports

**Files:**
- Modify: `webapp/static/index.html`
- Modify: `webapp/static/quotation.js`
- Modify: `webapp/static/styles.css`
- Test: `webapp/tests/test_quotation.cjs`

**Interfaces:**
- Consumes: valid quotation result and the current design/manufacturing summary from Task 2.
- Produces: `buildQuotationRecord(state)` containing all rows required by the spec.
- Produces: `exportQuotationXlsx(record)` and `exportQuotationPdf(record)` that each initiate one client-side download.

- [ ] **Step 1: Write failing export-record tests**

Add tests that a quotation record includes the exact FDM/LCD method, tire pattern, OD, ID, width, selected part weight, quantity, all pricing components, 15% tax, total, and the estimate notice.

- [ ] **Step 2: Run targeted export-record tests to verify they fail**

Run: `node --test tests/test_quotation.cjs`

Expected: FAIL because the export record builder does not exist.

- [ ] **Step 3: Add pinned client-side export libraries**

Add pinned SheetJS and jsPDF browser script tags in `webapp/static/index.html`, before `quotation.js`. Load only from their documented CDN distribution URLs and show an inline export error if either global is unavailable.

- [ ] **Step 4: Implement export record and download functions**

Generate one `Quotation` worksheet with labels and values in CNY for Excel. Generate a one-page PDF with the same headings and notice. Use safe, date-stamped filenames beginning `SophiStudio-quotation-`. Keep all export work in browser memory.

- [ ] **Step 5: Run browser download tests**

Use Playwright download interception after a valid calculation. Assert the Excel download ends in `.xlsx`, the PDF download ends in `.pdf`, both files are non-empty, and extracted workbook/PDF text includes the total quote and `15%` tax.

- [ ] **Step 6: Commit quotation exports**

```bash
git add webapp/static/index.html webapp/static/quotation.js webapp/static/styles.css webapp/tests/test_quotation.cjs
git commit -m "feat: export manufacturing quotations"
```

### Task 4: Static preview behavior and regression verification

**Files:**
- Modify: `docs/index.html`
- Modify: `docs/static-mode.js`
- Modify: `docs/app.js`
- Test: `webapp/tests/test_geometry.py`
- Test: `webapp/tests/test_weight.cjs`
- Test: `webapp/tests/test_quotation.cjs`

**Interfaces:**
- Consumes: static-mode behavior that has no CAD service or valid measured weight.
- Produces: a GitHub Pages preview that explains quotation requires the local CAD app and does not expose broken quote-export controls.

- [ ] **Step 1: Write the failing static-preview browser assertion**

Assert the local static `docs/index.html` shows the 2D preview and a clear `Quotation requires the local CAD app` message, with no enabled quote-export control.

- [ ] **Step 2: Run the static-preview assertion to verify it fails**

Run the existing file-based Playwright static-preview command.

Expected: FAIL because the quotation section is not yet represented in static-mode behavior.

- [ ] **Step 3: Update static preview copy and controls**

Keep the four pattern controls functional. Replace or hide the weight/quotation action area in static mode with the exact local-app limitation, ensuring no unsupported calculation or export action can run.

- [ ] **Step 4: Run all regression checks**

Run: `node --test tests/test_weight.cjs tests/test_quotation.cjs`

Run: `.\.venv\Scripts\python.exe -m unittest discover -s tests -v`

Run: the desktop and mobile Playwright flow for the local application and the static file preview.

Expected: all existing geometry/weight tests, quotation tests, static-preview test, and browser flows pass with no page errors.

- [ ] **Step 5: Commit the static behavior and verification updates**

```bash
git add docs webapp/tests
git commit -m "fix: explain quotation limits in static preview"
```
