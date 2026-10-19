# Manufacturing Quotation Design

## Purpose

Extend the existing local CAD application with a quotation section in the Model Output panel. The user can choose FDM or LCD manufacturing, use the corresponding calculated part weight, price one or more parts in Chinese yuan, apply a fixed 15% tax rate, and export the quotation to Excel and PDF.

## Scope

The quotation remains a browser-local tool. It does not store customer data, quote history, tax registrations, payment information, or production orders.

The GitHub Pages static preview remains a 2D design preview. It cannot create weight-based quotes because it does not have the Python CAD service that produces measured volume and weight.

## User Flow

1. The user completes a CAD weight calculation.
2. The user selects FDM or LCD under Manufacturing quotation.
3. The page uses the matching calculated single-part weight:
   - FDM: `FDM estimated weight`.
   - LCD: `LCD estimated weight`.
4. The user enters quantity, material price (CNY/kg), machine/setup cost (CNY), and additional cost (CNY).
5. The page displays a live calculation and enables exports only while all inputs and the selected weight are valid.
6. The user downloads an Excel or PDF quotation.

## Calculation Rules

All displayed and exported currency is Chinese yuan, formatted as `¥` with two decimal places. Tax rate is fixed at 15% for this first version.

```
single_part_weight_kg = selected_weight_g / 1000
total_material_weight_kg = single_part_weight_kg * quantity
material_cost = total_material_weight_kg * material_price_cny_per_kg
base_price = material_cost + machine_setup_cost + additional_cost
tax = base_price * 0.15
total_quote = base_price + tax
```

Input validation:

- Quantity must be a positive whole number.
- Material price must be zero or greater.
- Machine/setup and additional costs must be zero or greater.
- A quotation cannot be exported unless the selected manufacturing method has a calculated positive weight.

## Interface

The existing weight section keeps its FDM and LCD settings. A new `Manufacturing quotation` subsection follows it and contains:

- Manufacturing selector: FDM or LCD.
- Read-only weight used per part and total material weight.
- Quantity, material price/kg, machine/setup cost, and additional cost inputs.
- Read-only base price, 15% tax, and total quotation.
- `Export Excel` and `Export PDF` buttons.

Changing the manufacturing method updates the selected weight and quote immediately. Changing tire geometry invalidates the current weight and disables quotation exports until weight is recalculated.

## Export Content

Both exports include:

- Title: `Sophi Studio Airless Tire Design — Manufacturing Quotation`.
- Generation date/time in the browser's local timezone.
- Tire pattern, outer diameter, inner diameter, and tire width.
- Manufacturing method, selected material, selected single-part weight, quantity, and total material weight.
- Material price, machine/setup cost, additional cost, base price, 15% tax, and total quotation.
- Notice: values are estimated from the current CAD design; manufacturing validation is required before production.

Excel is an `.xlsx` workbook with a single `Quotation` sheet. PDF is a one-page landscape or portrait quotation suitable for download and printing.

## Components and Data Flow

- `weight.js` exposes the current valid FDM and LCD estimate through a browser event or a small shared read-only state interface.
- A new quotation module owns pricing inputs, validation, calculation, UI updates, and export payload creation.
- Export helpers create client-side files only. They never send quote data to the server.
- The existing model lifecycle dispatches an invalidation event when geometry changes; the quotation module clears dependent totals and disables exports until a fresh calculated weight arrives.

## Error Handling

- Missing or invalid number fields show an inline message and disable both export buttons.
- If a library or browser download fails, show an actionable message and retain the quote inputs.
- When a geometry change invalidates the weight, show `Recalculate weight before creating a quotation.`

## Testing

- Unit-test calculation rules, including quantity, selected manufacturing weight, 15% tax, invalid inputs, and rounding.
- Browser-test that FDM and LCD selection changes the weight used for a quote.
- Browser-test that quote exports are disabled before weight calculation and enabled after it.
- Browser-test generated Excel and PDF download paths and verify files are non-empty.
- Run all existing geometry and weight regression tests.
