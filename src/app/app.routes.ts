import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { Permission } from './core/auth/permissions';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Sign in · Jewellery ERP',
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { breadcrumb: 'Dashboard' },
        title: 'Dashboard · Jewellery ERP',
      },

      // --- Phase 2: organization, users and roles --------------------------
      {
        path: 'organization',
        data: { breadcrumb: 'Organization' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'companies' },
          {
            path: 'companies',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/organization/companies/companies.component').then(
                (m) => m.CompaniesComponent,
              ),
            data: { breadcrumb: 'Companies', permissions: [Permission.ORGANIZATION_VIEW] },
            title: 'Companies · Jewellery ERP',
          },
          {
            path: 'branches',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/organization/branches/branches.component').then(
                (m) => m.BranchesComponent,
              ),
            data: { breadcrumb: 'Branches', permissions: [Permission.ORGANIZATION_VIEW] },
            title: 'Branches · Jewellery ERP',
          },
          {
            path: 'locations',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/organization/locations/locations.component').then(
                (m) => m.LocationsComponent,
              ),
            data: { breadcrumb: 'Locations', permissions: [Permission.ORGANIZATION_VIEW] },
            title: 'Locations · Jewellery ERP',
          },
        ],
      },

      {
        path: 'users',
        data: { breadcrumb: 'Users & Access' },
        children: [
          {
            path: '',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/users/users/users.component').then((m) => m.UsersComponent),
            data: { breadcrumb: 'Users', permissions: [Permission.USER_VIEW] },
            title: 'Users · Jewellery ERP',
          },
          {
            path: 'roles',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/users/roles/roles.component').then((m) => m.RolesComponent),
            data: { breadcrumb: 'Roles', permissions: [Permission.ROLE_VIEW] },
            title: 'Roles · Jewellery ERP',
          },
          {
            path: 'permissions',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/users/permissions/permissions.component').then(
                (m) => m.PermissionsComponent,
              ),
            data: { breadcrumb: 'Permissions', permissions: [Permission.ROLE_VIEW] },
            title: 'Permissions · Jewellery ERP',
          },
        ],
      },

      // --- Phase 3: product, metal and gemstone master data ----------------
      {
        path: 'products',
        data: { breadcrumb: 'Products' },
        children: [
          {
            path: '',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/catalogue/catalogue.component').then(
                (m) => m.CatalogueComponent,
              ),
            data: { breadcrumb: 'Catalogue', permissions: [Permission.PRODUCT_VIEW] },
            title: 'Product catalogue · Jewellery ERP',
          },
          {
            path: 'designs',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/designs/designs.component').then(
                (m) => m.DesignsComponent,
              ),
            data: { breadcrumb: 'Designs', permissions: [Permission.PRODUCT_VIEW] },
            title: 'Designs · Jewellery ERP',
          },
          {
            path: 'categories',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/categories/categories.component').then(
                (m) => m.CategoriesComponent,
              ),
            data: { breadcrumb: 'Categories', permissions: [Permission.PRODUCT_VIEW] },
            title: 'Categories & types · Jewellery ERP',
          },
          {
            path: 'collections',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/collections/collections.component').then(
                (m) => m.CollectionsComponent,
              ),
            data: { breadcrumb: 'Collections', permissions: [Permission.PRODUCT_VIEW] },
            title: 'Collections & brands · Jewellery ERP',
          },
          {
            path: 'metals',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/metals/metals.component').then((m) => m.MetalsComponent),
            data: { breadcrumb: 'Metals & Rates', permissions: [Permission.METAL_VIEW] },
            title: 'Metals & rates · Jewellery ERP',
          },
          {
            path: 'gemstones',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/gemstones/gemstones.component').then(
                (m) => m.GemstonesComponent,
              ),
            data: { breadcrumb: 'Gemstones', permissions: [Permission.GEMSTONE_VIEW] },
            title: 'Gemstones · Jewellery ERP',
          },
          {
            path: ':id',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/products/product-detail/product-detail.component').then(
                (m) => m.ProductDetailComponent,
              ),
            data: { breadcrumb: 'Product', permissions: [Permission.PRODUCT_VIEW] },
            title: 'Product · Jewellery ERP',
          },
        ],
      },

      // --- Phase 4: serialized inventory -----------------------------------
      {
        path: 'inventory',
        data: { breadcrumb: 'Inventory' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'items' },
          {
            path: 'items',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/inventory/items/items.component').then((m) => m.ItemsComponent),
            data: { breadcrumb: 'Jewellery Items', permissions: [Permission.INVENTORY_VIEW] },
            title: 'Jewellery items · Jewellery ERP',
          },
          {
            path: 'items/:id',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/inventory/passport/passport.component').then(
                (m) => m.PassportComponent,
              ),
            data: { breadcrumb: 'Passport', permissions: [Permission.INVENTORY_VIEW] },
            title: 'Jewellery passport · Jewellery ERP',
          },
          {
            path: 'stock',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/inventory/stock/stock.component').then((m) => m.StockComponent),
            data: {
              breadcrumb: 'Stock',
              permissions: [Permission.INVENTORY_VIEW],
              view: 'overview',
            },
            title: 'Stock overview · Jewellery ERP',
          },
          {
            path: 'transfers',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/inventory/transfers/transfers.component').then(
                (m) => m.TransfersComponent,
              ),
            data: { breadcrumb: 'Transfers', permissions: [Permission.INVENTORY_VIEW] },
            title: 'Stock transfers · Jewellery ERP',
          },
          {
            path: 'valuation',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/inventory/stock/stock.component').then((m) => m.StockComponent),
            data: {
              breadcrumb: 'Valuation',
              permissions: [Permission.INVENTORY_VIEW],
              view: 'valuation',
            },
            title: 'Inventory valuation · Jewellery ERP',
          },
        ],
      },

      // --- Phases 5 to 17 ---------------------------------------------------
      {
        path: 'procurement',
        data: { breadcrumb: 'Procurement' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'suppliers' },
          {
            path: 'suppliers',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/procurement/suppliers/suppliers.component').then(
                (m) => m.SuppliersComponent,
              ),
            data: { breadcrumb: 'Suppliers', permissions: [Permission.SUPPLIER_VIEW] },
            title: 'Suppliers · Jewellery ERP',
          },
          {
            path: 'suppliers/:id',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/procurement/supplier-detail/supplier-detail.component').then(
                (m) => m.SupplierDetailComponent,
              ),
            data: { breadcrumb: 'Supplier', permissions: [Permission.SUPPLIER_VIEW] },
            title: 'Supplier · Jewellery ERP',
          },
          {
            path: 'orders',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/procurement/orders/orders.component').then(
                (m) => m.OrdersComponent,
              ),
            data: { breadcrumb: 'Purchase Orders', permissions: [Permission.PROCUREMENT_VIEW] },
            title: 'Procurement · Jewellery ERP',
          },
          {
            path: 'receipts',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/procurement/receipts/receipts.component').then(
                (m) => m.ReceiptsComponent,
              ),
            data: { breadcrumb: 'Goods Receipt', permissions: [Permission.PROCUREMENT_VIEW] },
            title: 'Goods receipt · Jewellery ERP',
          },
        ],
      },

      {
        path: 'pricing',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/pricing/pricing.component').then((m) => m.PricingComponent),
        data: { breadcrumb: 'Pricing', permissions: [Permission.PRODUCT_VIEW] },
        title: 'Pricing engine · Jewellery ERP',
      },

      {
        path: 'customers',
        data: { breadcrumb: 'Customers' },
        children: [
          {
            path: '',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/customers/list/customers.component').then(
                (m) => m.CustomersComponent,
              ),
            data: { breadcrumb: 'Customers', permissions: [Permission.CUSTOMER_VIEW] },
            title: 'Customers · Jewellery ERP',
          },
          {
            path: ':id',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/customers/profile/customer-profile.component').then(
                (m) => m.CustomerProfileComponent,
              ),
            data: { breadcrumb: 'Customer 360', permissions: [Permission.CUSTOMER_VIEW] },
            title: 'Customer 360 · Jewellery ERP',
          },
        ],
      },

      {
        path: 'crm',
        canActivate: [permissionGuard],
        loadComponent: () => import('./features/crm/crm.component').then((m) => m.CrmComponent),
        data: { breadcrumb: 'CRM', permissions: [Permission.CRM_VIEW] },
        title: 'CRM · Jewellery ERP',
      },

      {
        path: 'loyalty',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/loyalty/loyalty.component').then((m) => m.LoyaltyComponent),
        data: { breadcrumb: 'Loyalty', permissions: [Permission.LOYALTY_VIEW] },
        title: 'Loyalty · Jewellery ERP',
      },

      {
        path: 'sales',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/sales/sales.component').then((m) => m.SalesComponent),
        data: { breadcrumb: 'Sales', permissions: [Permission.SALE_VIEW] },
        title: 'Sales · Jewellery ERP',
      },

      {
        path: 'exchange',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/operations/exchange/exchange.component').then(
            (m) => m.ExchangeComponent,
          ),
        data: { breadcrumb: 'Exchange & Buyback', permissions: [Permission.EXCHANGE_VIEW] },
        title: 'Exchange & buyback · Jewellery ERP',
      },

      {
        path: 'repairs',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/operations/repairs/repairs.component').then((m) => m.RepairsComponent),
        data: { breadcrumb: 'Repairs', permissions: [Permission.REPAIR_VIEW] },
        title: 'Repairs · Jewellery ERP',
      },

      {
        path: 'warehouse',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/operations/warehouse/warehouse.component').then(
            (m) => m.WarehouseComponent,
          ),
        data: { breadcrumb: 'Warehouse & Vault', permissions: [Permission.WAREHOUSE_VIEW] },
        title: 'Warehouse & vault · Jewellery ERP',
      },

      {
        path: 'finance',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/control/finance/finance.component').then((m) => m.FinanceComponent),
        data: { breadcrumb: 'Finance', permissions: [Permission.FINANCE_VIEW] },
        title: 'Finance · Jewellery ERP',
      },

      {
        path: 'notifications',
        data: { breadcrumb: 'Notifications' },
        children: [
          {
            path: '',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/control/notifications/notifications.component').then(
                (m) => m.NotificationsComponent,
              ),
            data: {
              breadcrumb: 'Notifications',
              permissions: [Permission.NOTIFICATION_VIEW],
              view: 'outbox',
            },
            title: 'Notifications · Jewellery ERP',
          },
          {
            path: 'approvals',
            canActivate: [permissionGuard],
            loadComponent: () =>
              import('./features/control/notifications/notifications.component').then(
                (m) => m.NotificationsComponent,
              ),
            data: {
              breadcrumb: 'Approvals',
              permissions: [Permission.NOTIFICATION_VIEW],
              view: 'approvals',
            },
            title: 'Approval centre · Jewellery ERP',
          },
        ],
      },

      {
        path: 'reports',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/control/reports/reports.component').then((m) => m.ReportsComponent),
        data: { breadcrumb: 'Reports', permissions: [Permission.REPORT_VIEW] },
        title: 'Reports · Jewellery ERP',
      },

      {
        path: 'compliance',
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/control/compliance/compliance.component').then(
            (m) => m.ComplianceComponent,
          ),
        data: {
          breadcrumb: 'Compliance',
          permissions: [Permission.COMPLIANCE_REPORT, Permission.AUDIT_VIEW],
        },
        title: 'Compliance & audit · Jewellery ERP',
      },

      {
        path: 'settings',
        data: { breadcrumb: 'Settings' },
        children: [
          {
            path: '',
            canActivate: [authGuard],
            loadComponent: () =>
              import('./features/settings/system/system-settings.component').then(
                (m) => m.SystemSettingsComponent,
              ),
            data: { breadcrumb: 'Settings' },
            title: 'Settings · Jewellery ERP',
          },
          {
            path: 'profile',
            loadComponent: () =>
              import('./features/settings/profile.component').then((m) => m.ProfileComponent),
            data: { breadcrumb: 'My profile' },
            title: 'My profile · Jewellery ERP',
          },
        ],
      },

      {
        path: 'forbidden',
        loadComponent: () =>
          import('./features/errors/forbidden.component').then((m) => m.ForbiddenComponent),
        data: { breadcrumb: 'Access denied' },
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/errors/not-found.component').then((m) => m.NotFoundComponent),
        data: { breadcrumb: 'Not found' },
      },
    ],
  },
];
