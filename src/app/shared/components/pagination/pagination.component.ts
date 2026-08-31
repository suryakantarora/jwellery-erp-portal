import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../icon/icon.component';

/**
 * Pager for the backend's zero-based `PageResponse`.
 *
 * Page numbers are shown one-based to the operator while every event emits the
 * zero-based index the API expects.
 */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <nav class="pagination" aria-label="Pagination">
      <p class="pagination__summary">
        @if (totalElements() === 0) {
          No records
        } @else {
          {{ rangeStart() }}–{{ rangeEnd() }} of
          <strong class="numeric">{{ totalElements().toLocaleString() }}</strong>
        }
      </p>

      <div class="pagination__controls">
        <label class="pagination__size">
          <span class="visually-hidden">Rows per page</span>
          <select class="select" [value]="size()" (change)="onSizeChange($event)">
            @for (option of pageSizeOptions; track option) {
              <option [value]="option" [selected]="option === size()">{{ option }} / page</option>
            }
          </select>
        </label>

        <div class="pagination__buttons">
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            [disabled]="page() === 0"
            (click)="goTo(0)"
            aria-label="First page"
          >
            <app-icon name="chevronsLeft" [size]="15" />
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            [disabled]="page() === 0"
            (click)="goTo(page() - 1)"
            aria-label="Previous page"
          >
            <app-icon name="chevronLeft" [size]="15" />
          </button>

          <span class="pagination__position numeric">
            {{ page() + 1 }} of {{ Math.max(totalPages(), 1) }}
          </span>

          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            [disabled]="isLastPage()"
            (click)="goTo(page() + 1)"
            aria-label="Next page"
          >
            <app-icon name="chevronRight" [size]="15" />
          </button>
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            [disabled]="isLastPage()"
            (click)="goTo(totalPages() - 1)"
            aria-label="Last page"
          >
            <app-icon name="chevronsRight" [size]="15" />
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: `
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .pagination__summary {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .pagination__controls {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .pagination__size .select {
      width: auto;
      height: 30px;
      font-size: var(--text-sm);
    }

    .pagination__buttons {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .pagination__position {
      padding: 0 var(--space-3);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      white-space: nowrap;
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly Math = Math;
  protected readonly pageSizeOptions = environment.pageSizeOptions;

  protected readonly rangeStart = computed(() => this.page() * this.size() + 1);
  protected readonly rangeEnd = computed(() =>
    Math.min((this.page() + 1) * this.size(), this.totalElements()),
  );
  protected readonly isLastPage = computed(() => this.page() >= this.totalPages() - 1);

  protected goTo(page: number): void {
    const target = Math.min(Math.max(page, 0), Math.max(this.totalPages() - 1, 0));
    if (target !== this.page()) {
      this.pageChange.emit(target);
    }
  }

  protected onSizeChange(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
