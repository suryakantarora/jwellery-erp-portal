# PHASE 5 — Supplier & Procurement

Build the Procurement module.

## Supplier

Screens:

- Supplier list
- Supplier details
- Create supplier
- Edit supplier
- Supplier documents
- Supplier bank details
- Supplier performance

## Procurement workflow

Implement:

```text
Purchase Requisition
       ↓
Approval
       ↓
Purchase Order
       ↓
Goods Receipt
       ↓
Quality Check
       ↓
Inventory
       ↓
Supplier Invoice
```

## Purchase Requisition

Fields:

- Branch
- Requested By
- Items
- Quantity
- Expected Date
- Reason
- Notes

## Purchase Order

Display:

- PO number
- Supplier
- Items
- Metal/stone details
- Expected delivery
- Amount
- Status

## Goods Receipt

Allow receiving jewellery items individually.

Because jewellery is serialized, receiving should support:

```text
PO
 ↓
Receive Item
 ↓
Create/assign Jewellery Item ID
 ↓
Tag RFID/Barcode/QR
 ↓
Quality Check
 ↓
Inventory
```

## Statuses

```text
DRAFT
PENDING_APPROVAL
APPROVED
ORDERED
PARTIALLY_RECEIVED
RECEIVED
CANCELLED
```

Reuse the ERP table, drawer and status components.