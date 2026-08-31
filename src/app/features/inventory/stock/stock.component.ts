import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AppError } from '../../../core/models/api.model';
import { InventoryValuationReport, StockAgeingReport } from '../../../core/models/inventory.model';
import { Branch } from '../../../core/models/organization.model';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { OrganizationService } from '../../organization/organization.service';
import { InventoryService } from '../inventory.service';

/**
 * Stock on hand, and what it is worth.
 *
 * Both figures come from the backend's own reports rather than being summed in
 * the browser: valuation applies today's metal rate to net metal weight, which
 * is a calculation the server must own if the number is to match finance.
 *
 * The same screen serves two routes — an overview leading with where stock sits
 * and how long it has been there, and a valuation view leading with money.
 */
@Component({
  selector: 'app-stock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss',
})
export class StockComponent {
  private readonly inventory = inject(InventoryService);
  private readonly organization = inject(OrganizationService);

  /** `valuation` leads with money; the default leads with where stock is. */
  readonly view = input<'overview' | 'valuation'>('overview');

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly branchFilter = signal('');

  protected readonly valuation = signal<InventoryValuationReport | null>(null);
  protected readonly ageing = signal<StockAgeingReport | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly isValuation = computed(() => this.view() === 'valuation');

  protected readonly title = computed(() =>
    this.isValuation() ? 'Inventory valuation' : 'Stock overview',
  );

  protected readonly description = computed(() =>
    this.isValuation()
      ? 'Stock at cost and at today’s metal rate, by location, metal and status.'
      : 'Where stock sits, what it is made of, and how long it has been held.',
  );

  /** Share of the largest bucket, so the ageing bars have a scale. */
  protected readonly ageingPeak = computed(() =>
    Math.max(1, ...(this.ageing()?.buckets ?? []).map((bucket) => bucket.itemCount)),
  );

  constructor() {
    this.organization.listAllBranches().subscribe({
      next: (branches) => this.branches.set(branches),
    });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const branchId = this.branchFilter() || null;

    forkJoin({
      valuation: this.inventory.valuation(branchId),
      ageing: this.inventory.ageing(branchId),
    }).subscribe({
      next: ({ valuation, ageing }) => {
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

  protected onBranchChange(event: Event): void {
    this.branchFilter.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  protected barWidth(count: number): string {
    return `${Math.round((count / this.ageingPeak()) * 100)}%`;
  }
}
