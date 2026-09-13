# PHASE 9 — Sales & POS Administration

Build ERP-side sales management.

## Screens

- Sales list
- Sale details
- Quotations
- Invoices
- Returns
- Payments
- Refunds
- Daily closing

## Sale details

Show:

```text
Invoice
Customer
Salesperson
Branch
Items
Metal Details
Stone Details
Price Breakdown
Discount
Tax
Payments
Balance
```

## Jewellery sale

Display the actual serialized items sold.

Example:

```text
Item ID
JW-00001245

22K Gold
Gross Weight: 12.45g
Stone: Diamond
Selling Price: ...
```

## Returns

Implement the UI for:

```text
Invoice
 ↓
Select Item
 ↓
Return Reason
 ↓
Approval
 ↓
Refund / Store Credit
 ↓
Inventory Status Update
```

Backend remains responsible for actual business validation.