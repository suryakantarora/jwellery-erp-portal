# PHASE 4 — Jewellery Item & Serialized Inventory

Build the core Jewellery Inventory module.

Every physical jewellery item must be treated as a unique serialized item.

## Jewellery Item

Create screens for:

- Item list
- Item creation
- Item details
- Edit where permitted
- Item status
- Item location
- Item movement history
- Item reservation

## Item fields

Display:

```text
Item ID
Product
Design
Metal
Purity
Gross Weight
Net Metal Weight
Stone Weight
RFID
QR Code
Barcode
Purchase Cost
Current Price
Current Location
Current Status
```

## Item status

```text
AVAILABLE
RESERVED
IN_TRANSIT
SOLD
UNDER_REPAIR
RETURNED
EXCHANGED
BUYBACK
SCRAPPED
```

## Digital Jewellery Passport

Create a premium detail page.

Sections:

1. Product
2. Metal
3. Weight
4. Gemstones
5. Certificate
6. RFID / QR / Barcode
7. Cost and price
8. Current location
9. Current status
10. Lifecycle timeline

Example:

```text
PURCHASED
   ↓
QUALITY CHECK
   ↓
RFID TAGGED
   ↓
WAREHOUSE
   ↓
SHOWROOM
   ↓
COUNTER
   ↓
SOLD
```

## Inventory

Build:

- Inventory dashboard
- Stock list
- Stock by branch
- Stock by location
- Stock by category
- Stock by metal
- Stock aging
- Inventory valuation

## Transfers

Build:

```text
Create Transfer
      ↓
Approval
      ↓
Dispatch
      ↓
In Transit
      ↓
Receive
      ↓
Completed
```

## RFID / Barcode / QR

Prepare reusable scanning interfaces.

Support:

- Barcode input
- QR scanning integration point
- RFID integration point

Do not implement device-specific hardware logic unless APIs already exist.

## Important

Never treat jewellery inventory as:

```text
SKU + Quantity
```

Instead use:

```text
Product
   ↓
Unique Jewellery Item
   ↓
Serialized Inventory
```

Make this module highly polished and production-oriented.