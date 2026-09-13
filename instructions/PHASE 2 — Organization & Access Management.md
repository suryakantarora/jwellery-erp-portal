# PHASE 2 — Organization & Access Management

Continue the Jewellery ERP Admin Portal from Phase 1.

Do not redesign the existing shell. Reuse the existing layout, components, services and theme.

Connect to the existing Spring Boot backend APIs.

## Modules

Build:

1. Company Management
2. Branch Management
3. Location Management
4. Showroom Management
5. Warehouse Management
6. Vault Management
7. Counter Management
8. User Management
9. Role Management
10. Permission Management

## Organization hierarchy

Implement:

```text
Company
 ├── Head Office
 ├── Branch
 │   ├── Showroom
 │   ├── Counter
 │   ├── Vault
 │   └── Store Room
 └── Central Warehouse
```

## Features

Each master should support:

- List
- Search
- Filter
- Sort
- Pagination
- Create
- View
- Edit
- Activate/deactivate
- Validation
- Confirmation dialogs

## User Management

Display:

- Name
- Employee ID
- Email
- Phone
- Roles
- Branch
- Status
- Last Login

Support:

- Create user
- Edit user
- Assign roles
- Assign branches
- Activate/deactivate
- Reset password workflow

## Role Management

Support:

- Role creation
- Role editing
- Permission assignment
- Permission grouping

Example:

```text
Product
 ├── View
 ├── Create
 ├── Update
 └── Delete

Inventory
 ├── View
 ├── Transfer
 ├── Adjust
 └── Approve
```

## UX

Use:

- Data tables
- Side drawers for editing
- Confirmation dialogs
- Status badges
- Permission matrix
- Breadcrumbs
- Empty states
- Loading states

All APIs must use the existing API service architecture.

Do not hardcode business data.

The frontend must respect permissions returned/configured by the backend.