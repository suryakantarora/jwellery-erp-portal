import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AppError } from '../../../core/models/api.model';
import { SalesReport } from '../../../core/models/control.model';
import { InventoryValuationReport, StockAgeingReport } from '../../../core/models/inventory.model';
import { Branch } from '../../../core/models/organization.model';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { OrganizationService } from '../../organization/organization.service';
import { ControlService } from '../control.service';

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The management dashboard: what was sold, what is on hand, and what it is
 * worth.
 *
 * Every figure comes from the backend's own reports rather than being summed in
 * the browser — a number a manager acts on must be the same number finance
 * sees.
 */
@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, PageHeaderComponent, LoadingStateComponent, ErrorStateComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  private readonly control = inject(ControlService);
  private readonly organization = inject(OrganizationService);

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly branchFilter = signal('');
  protected readonly from = signal(monthStart());
  protected readonly to = signal(today());

  protected readonly sales = signal<SalesReport | null>(null);
  protected readonly valuation = signal<InventoryValuationReport | null>(null);
  protected readonly ageing = signal<StockAgeingReport | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  /** Largest day in the period, so the sales bars have a scale. */
  protected readonly peakDay = computed(() =>
    Math.max(1, ...(this.sales()?.byDay ?? []).map((day) => day.totalAmount ?? 0)),
  );

  protected readonly peakBucket = computed(() =>
    Math.max(1, ...(this.ageing()?.buckets ?? []).map((bucket) => bucket.itemCount)),
  );

  constructor() {
    this.organization.listAllBranches().subscribe({ next: (r) => this.branches.set(r) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const branchId = this.branchFilter() || null;

    forkJoin({
      sales: this.control.salesReport(this.from(), this.to(), branchId),
      valuation: this.control.inventoryValuation(branchId),
      ageing: this.control.stockAgeing(branchId),
    }).subscribe({
      next: ({ sales, valuation, ageing }) => {
        this.sales.set(sales);
        this.valuation.set(valuation);
        this.ageing.set(ageing);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected onDate(which: 'from' | 'to', event: Event): void {
    (which === 'from' ? this.from : this.to).set((event.target as HTMLInputElement).value);
    this.load();
  }

  protected onBranch(event: Event): void {
    this.branchFilter.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  protected dayWidth(amount: number | null): string {
    return `${Math.round(((amount ?? 0) / this.peakDay()) * 100)}%`;
  }

  protected bucketWidth(count: number): string {
    return `${Math.round((count / this.peakBucket()) * 100)}%`;
  }
}
