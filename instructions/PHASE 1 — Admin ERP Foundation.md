# PHASE 1 — Admin ERP Foundation

Build Phase 1 of a production-ready **Jewellery ERP Admin Portal** using Angular and TypeScript.

The backend Spring Boot APIs already exist. Do not create a new backend or duplicate business logic in the frontend.

## 1. Technology

Use:

- Angular
- TypeScript
- SCSS
- Angular Material/CDK where appropriate
- RxJS
- Reactive Forms
- REST API integration
- JWT authentication
- Lazy-loaded routes
- Standalone Angular components if compatible with the existing project

Avoid unnecessary libraries.

## 2. Design Direction

Create a premium jewellery ERP interface.

Design characteristics:

- Elegant
- Professional
- Modern
- Premium
- Clean
- Enterprise-grade
- Desktop-first but responsive
- Mobile/tablet friendly
- Smooth transitions
- Excellent spacing
- Accessible UI

Use a sophisticated jewellery-inspired visual language without making the application look like an e-commerce website.

Support:

- Light mode
- Dark mode
- Responsive layout
- Collapsible sidebar

Use a configurable primary theme rather than hardcoding colors throughout components.

## 3. Application Layout

Create:

- Login page
- Main application shell
- Sidebar navigation
- Top header
- Breadcrumb
- Page title area
- User profile menu
- Branch selector
- Notification center
- Global search placeholder
- Theme switcher
- Logout
- Loading indicator
- Global error notification
- Confirmation dialog
- Empty-state component

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo │ Search │ Branch │ Notifications │ User              │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│ Dashboard     │                                             │
│ Organization  │                                             │
│ Products      │              PAGE CONTENT                   │
│ Inventory     │                                             │
│ Procurement   │                                             │
│ Sales         │                                             │
│ Customers     │                                             │
│ Repairs       │                                             │
│ Reports       │                                             │
│ Settings      │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

## 4. Project Structure

Create a scalable structure:

```text
src/app
├── core
│   ├── auth
│   ├── guards
│   ├── interceptors
│   ├── services
│   ├── models
│   └── config
│
├── shared
│   ├── components
│   ├── directives
│   ├── pipes
│   └── utilities
│
├── layout
│   ├── shell
│   ├── sidebar
│   ├── header
│   ├── breadcrumb
│   └── notifications
│
├── features
│   ├── dashboard
│   ├── organization
│   ├── users
│   ├── products
│   ├── inventory
│   ├── procurement
│   ├── pricing
│   ├── customers
│   ├── crm
│   ├── loyalty
│   ├── repairs
│   ├── exchange
│   ├── warehouse
│   ├── finance
│   ├── reports
│   ├── compliance
│   └── settings
│
└── app.routes.ts
```

## 5. Authentication

Implement:

- Login
- JWT storage using a secure approach appropriate to the backend
- Authentication service
- HTTP interceptor
- Auth guard
- Logout
- Token expiry handling
- Unauthorized response handling

Do not put authentication logic inside individual pages.

## 6. Permission Architecture

Prepare the frontend for backend-driven permissions.

Example:

```text
PRODUCT_VIEW
PRODUCT_CREATE
PRODUCT_UPDATE
PRODUCT_DELETE

INVENTORY_VIEW
INVENTORY_TRANSFER

SALE_VIEW
SALE_CREATE

PRICE_VIEW
PRICE_UPDATE
```

Create reusable permission utilities/directives so UI elements can later be hidden or disabled according to permissions.

Backend authorization remains the final authority.

## 7. Routing

Create lazy-loaded routes for every major feature.

Do not implement business screens yet.

Use placeholder pages for future modules.

## 8. Reusable Components

Create reusable:

- Data table
- Search box
- Filter panel
- Page header
- Status badge
- Confirm dialog
- Form field wrapper
- Empty state
- Loading state
- Error state
- Pagination
- Modal
- Drawer
- Toast/snackbar
- File upload component
- Image preview

## 9. Dashboard Placeholder

Create the dashboard shell with placeholder cards:

- Total Sales
- Inventory Value
- Jewellery Items
- Customers
- Pending Repairs
- Pending Approvals

Use mock data only for the initial UI.

Clearly separate mock services from actual API services.

## 10. Quality Requirements

Implement:

- Strong TypeScript typing
- No `any` unless absolutely necessary
- Reusable components
- Centralized API configuration
- Environment configuration
- Proper error handling
- Responsive design
- Accessibility
- Clean SCSS
- No duplicated UI code

Do not implement actual business functionality in this phase.

The final result should be a polished ERP shell ready for Phase 2.