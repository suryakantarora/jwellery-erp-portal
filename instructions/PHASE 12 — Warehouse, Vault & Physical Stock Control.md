# PHASE 12 — Warehouse, Vault & Physical Stock Control

Build secure inventory operations.

## Hierarchy

```text
Warehouse
 ├── Vault
 ├── Zone
 ├── Shelf
 └── Tray
```

## Features

- Vault inventory
- Tray management
- Issue item
- Return item
- Transfer item
- Physical stock count
- Stock reconciliation
- Missing item investigation

## High-value authorization

Implement maker/checker UX:

```text
Employee
 ↓
Request
 ↓
Manager Approval
 ↓
Item Released
```

Show:

- Requested by
- Approved by
- Date/time
- Reason
- Item
- Location

## Physical verification

Support:

```text
Expected Items
       ↓
Scan Items
       ↓
Compare
       ↓
Matched
Missing
Unexpected
       ↓
Reconciliation
```

Make this screen optimized for fast scanning.