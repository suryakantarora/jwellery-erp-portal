# PHASE 6 — Pricing & Promotion Engine

Build the complete pricing administration UI.

Pricing must remain configurable and must not be hardcoded into Angular components.

## Modules

Build:

- Metal Rates
- Making Charges
- Wastage Rules
- Stone Pricing
- Tax Rules
- Discount Rules
- Promotion Rules
- Customer Pricing
- Branch Pricing

## Pricing calculation

Display:

```text
Metal Value
+ Making Charges
+ Wastage
+ Stone Value
+ Tax
- Discount
----------------
Final Selling Price
```

## Pricing Calculator

Create an interactive calculator:

Inputs:

- Jewellery Item
- Branch
- Customer
- Metal rate
- Weight
- Purity
- Making charge
- Wastage
- Stone value
- Discount

Output a detailed price breakdown.

## Discount approval

Example:

```text
Salesperson
   ↓
Discount Request
   ↓
Manager Approval
   ↓
Approved Price
```

Display approval history.

## Important

Historical sales must retain the original applied price.

Changing today's gold rate must never change an old invoice.