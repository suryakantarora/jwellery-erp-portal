import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { DashboardSnapshot } from './dashboard.model';

/**
 * Placeholder dashboard data.
 *
 * MOCK ONLY — this is not an API client and must not be mistaken for one. The
 * reporting endpoints land in Phase 15; at that point this service is replaced
 * by a real `DashboardService` calling `/reports`, and the component below is
 * left untouched because it only depends on {@link DashboardSnapshot}.
 */
@Injectable({ providedIn: 'root' })
export class DashboardMockService {
  /** Resolves after a short delay so the loading states are exercised. */
  load(): Observable<DashboardSnapshot> {
    return of(SNAPSHOT).pipe(delay(450));
  }
}

const SNAPSHOT: DashboardSnapshot = {
  metrics: [
    {
      key: 'sales',
      label: 'Total Sales',
      value: '₹ 4.82 Cr',
      caption: 'Month to date, all branches',
      icon: 'finance',
      delta: 12.4,
      tone: 'success',
    },
    {
      key: 'inventory-value',
      label: 'Inventory Value',
      value: '₹ 31.6 Cr',
      caption: 'Valued at today’s metal rate',
      icon: 'inventory',
      delta: 2.1,
      tone: 'accent',
    },
    {
      key: 'items',
      label: 'Jewellery Items',
      value: '18,472',
      caption: 'Serialized pieces in stock',
      icon: 'gem',
      delta: -1.8,
      tone: 'neutral',
    },
    {
      key: 'customers',
      label: 'Customers',
      value: '9,315',
      caption: '218 added this month',
      icon: 'customers',
      delta: 3.6,
      tone: 'info',
    },
    {
      key: 'repairs',
      label: 'Pending Repairs',
      value: '64',
      caption: '11 past their promised date',
      icon: 'repairs',
      delta: null,
      tone: 'warning',
    },
    {
      key: 'approvals',
      label: 'Pending Approvals',
      value: '23',
      caption: 'Transfers, discounts and buybacks',
      icon: 'approvals',
      delta: null,
      tone: 'danger',
    },
  ],
  salesTrend: [
    { label: 'Mar', value: 312 },
    { label: 'Apr', value: 348 },
    { label: 'May', value: 401 },
    { label: 'Jun', value: 372 },
    { label: 'Jul', value: 434 },
    { label: 'Aug', value: 482 },
  ],
  inventoryByCategory: [
    { label: 'Rings', value: 28 },
    { label: 'Necklaces', value: 24 },
    { label: 'Bangles', value: 19 },
    { label: 'Earrings', value: 16 },
    { label: 'Chains', value: 13 },
  ],
  activity: [
    {
      id: '1',
      title: 'Transfer TRF-2841 received',
      detail: 'Central Warehouse → Jubilee Hills Showroom · 42 items',
      at: '18 minutes ago',
      icon: 'inventory',
    },
    {
      id: '2',
      title: 'Gold 22K rate published',
      detail: 'Effective from 09:00 · Sell ₹ 7,120 / g',
      at: '2 hours ago',
      icon: 'pricing',
    },
    {
      id: '3',
      title: 'Purchase order PO-1192 approved',
      detail: 'Sri Lakshmi Bullion · ₹ 88.4 L',
      at: '4 hours ago',
      icon: 'procurement',
    },
    {
      id: '4',
      title: 'Buyback BB-0335 awaiting approval',
      detail: 'Banjara Hills Counter 2 · 84.6 g at 91.6% purity',
      at: 'Yesterday',
      icon: 'exchange',
    },
  ],
};
