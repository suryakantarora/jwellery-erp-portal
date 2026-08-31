import { Permission, PermissionCode } from '../core/auth/permissions';
import { IconName } from '../shared/components/icon/icon.registry';

/** A single entry in the sidebar; children render as a collapsible group. */
export interface NavItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route?: string;
  /** Any one of these permissions reveals the item. Empty means always shown. */
  readonly permissions?: readonly PermissionCode[];
  readonly children?: readonly NavChild[];
}

export interface NavChild {
  readonly label: string;
  readonly route: string;
  readonly permissions?: readonly PermissionCode[];
}

export interface NavSection {
  readonly label: string;
  readonly items: readonly NavItem[];
}

/**
 * The sidebar's information architecture, following the module list in the
 * roadmap. Child routes are declared here even where the module is a Phase 1
 * placeholder, so navigation does not have to be rebuilt phase by phase.
 */
export const NAVIGATION: readonly NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Organization',
        icon: 'organization',
        permissions: [Permission.ORGANIZATION_VIEW],
        children: [
          { label: 'Companies', route: '/organization/companies' },
          { label: 'Branches', route: '/organization/branches' },
          { label: 'Locations', route: '/organization/locations' },
        ],
      },
      {
        label: 'Users & Access',
        icon: 'users',
        permissions: [Permission.USER_VIEW, Permission.ROLE_VIEW],
        children: [
          { label: 'Users', route: '/users', permissions: [Permission.USER_VIEW] },
          { label: 'Roles', route: '/users/roles', permissions: [Permission.ROLE_VIEW] },
          {
            label: 'Permissions',
            route: '/users/permissions',
            permissions: [Permission.ROLE_VIEW],
          },
        ],
      },
    ],
  },
  {
    label: 'Merchandise',
    items: [
      {
        label: 'Products',
        icon: 'products',
        permissions: [Permission.PRODUCT_VIEW, Permission.METAL_VIEW, Permission.GEMSTONE_VIEW],
        children: [
          { label: 'Catalogue', route: '/products', permissions: [Permission.PRODUCT_VIEW] },
          { label: 'Designs', route: '/products/designs', permissions: [Permission.PRODUCT_VIEW] },
          {
            label: 'Categories',
            route: '/products/categories',
            permissions: [Permission.PRODUCT_VIEW],
          },
          {
            label: 'Collections',
            route: '/products/collections',
            permissions: [Permission.PRODUCT_VIEW],
          },
          {
            label: 'Metals & Rates',
            route: '/products/metals',
            permissions: [Permission.METAL_VIEW],
          },
          {
            label: 'Gemstones',
            route: '/products/gemstones',
            permissions: [Permission.GEMSTONE_VIEW],
          },
        ],
      },
      {
        label: 'Inventory',
        icon: 'inventory',
        permissions: [Permission.INVENTORY_VIEW],
        children: [
          { label: 'Jewellery Items', route: '/inventory/items' },
          { label: 'Stock', route: '/inventory/stock' },
          { label: 'Transfers', route: '/inventory/transfers' },
          { label: 'Valuation', route: '/inventory/valuation' },
        ],
      },
      {
        label: 'Warehouse & Vault',
        icon: 'warehouse',
        route: '/warehouse',
        permissions: [Permission.WAREHOUSE_VIEW],
      },
      {
        label: 'Procurement',
        icon: 'procurement',
        permissions: [Permission.PROCUREMENT_VIEW, Permission.SUPPLIER_VIEW],
        children: [
          {
            label: 'Suppliers',
            route: '/procurement/suppliers',
            permissions: [Permission.SUPPLIER_VIEW],
          },
          {
            label: 'Purchase Orders',
            route: '/procurement/orders',
            permissions: [Permission.PROCUREMENT_VIEW],
          },
          {
            label: 'Goods Receipt',
            route: '/procurement/receipts',
            permissions: [Permission.PROCUREMENT_VIEW],
          },
        ],
      },
      {
        label: 'Pricing',
        icon: 'pricing',
        route: '/pricing',
        permissions: [Permission.PRICE_CHANGE],
      },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Sales', icon: 'finance', route: '/sales', permissions: [Permission.SALE_VIEW] },
      {
        label: 'Customers',
        icon: 'customers',
        route: '/customers',
        permissions: [Permission.CUSTOMER_VIEW],
      },
      { label: 'CRM', icon: 'crm', route: '/crm', permissions: [Permission.CRM_VIEW] },
      {
        label: 'Loyalty',
        icon: 'loyalty',
        route: '/loyalty',
        permissions: [Permission.LOYALTY_VIEW],
      },
      {
        label: 'Exchange & Buyback',
        icon: 'exchange',
        route: '/exchange',
        permissions: [Permission.EXCHANGE_VIEW],
      },
      {
        label: 'Repairs',
        icon: 'repairs',
        route: '/repairs',
        permissions: [Permission.REPAIR_VIEW],
      },
    ],
  },
  {
    label: 'Control',
    items: [
      {
        label: 'Finance',
        icon: 'finance',
        route: '/finance',
        permissions: [Permission.FINANCE_VIEW],
      },
      {
        label: 'Approvals',
        icon: 'approvals',
        route: '/notifications/approvals',
        permissions: [Permission.NOTIFICATION_VIEW],
      },
      {
        label: 'Reports',
        icon: 'reports',
        route: '/reports',
        permissions: [Permission.REPORT_VIEW],
      },
      {
        label: 'Compliance',
        icon: 'compliance',
        route: '/compliance',
        permissions: [Permission.COMPLIANCE_REPORT, Permission.AUDIT_VIEW],
      },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ],
  },
];
