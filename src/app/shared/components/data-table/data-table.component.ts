import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  Directive,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AppError } from '../../../core/models/api.model';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { CellTemplateContext, TableColumn, TableSort } from './data-table.model';

/**
 * Registers a custom cell template for one column.
 *
 * ```html
 * <ng-template appCell="status" [appCellOf]="rows()" let-row>
 *   <app-status-badge [status]="row.status" />
 * </ng-template>
 * ```
 *
 * `appCellOf` carries no behaviour: binding the same array the table renders
 * is what lets TypeScript infer `T`, so `let-row` is typed inside the template
 * instead of falling back to `unknown`.
 */
@Directive({ selector: '[appCell]' })
export class CellDefDirective<T = unknown> {
  readonly appCell = input.required<string>();
  readonly appCellOf = input<readonly T[] | undefined>(undefined);

  constructor(readonly template: TemplateRef<CellTemplateContext<T>>) {}

  /** Lets the template keep its context type when used with `let-` bindings. */
  static ngTemplateContextGuard<T>(
    _directive: CellDefDirective<T>,
    _context: unknown,
  ): _context is CellTemplateContext<T> {
    return true;
  }
}

/**
 * The portal's single table implementation.
 *
 * Sorting and paging are *server*-driven: the table emits intent and the page
 * re-queries, because ERP lists are far too large to sort in the browser.
 * Loading, empty and error states are handled here so no list screen has to
 * re-implement them.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    IconComponent,
    SpinnerComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> {
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly trackBy = input<(row: T, index: number) => unknown>((_, index) => index);

  readonly loading = input(false);
  readonly error = input<AppError | null>(null);
  readonly sort = input<TableSort | null>(null);

  readonly emptyTitle = input('No records found');
  readonly emptyMessage = input('Nothing matches the current filters.');
  /** Renders each row as a button so the whole row opens the record. */
  readonly rowClickable = input(false);
  readonly selectedKey = input<unknown>(null);

  readonly sortChange = output<TableSort>();
  readonly rowClick = output<T>();
  readonly retry = output<void>();

  /**
   * Cell templates passed as an input rather than projected.
   *
   * Content projection cannot cross a wrapper component, so a screen built on
   * a shared panel hands its templates down this way instead.
   */
  readonly cellTemplates = input<Record<string, TemplateRef<CellTemplateContext<T>>> | null>(null);

  private readonly cellDefs = contentChildren(CellDefDirective<T>);

  /** Column key → template, from the projected `appCell` templates and the input. */
  protected readonly templates = computed(() => {
    const map = new Map<string, TemplateRef<CellTemplateContext<T>>>();
    for (const [key, template] of Object.entries(this.cellTemplates() ?? {})) {
      map.set(key, template);
    }
    for (const def of this.cellDefs()) {
      map.set(def.appCell(), def.template);
    }
    return map;
  });

  protected readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.rows().length === 0,
  );

  /** Keeps the header row visible while a refresh is in flight. */
  protected readonly showBody = computed(() => this.rows().length > 0);

  protected templateFor(key: string): TemplateRef<CellTemplateContext<T>> | null {
    return this.templates().get(key) ?? null;
  }

  protected cellText(column: TableColumn<T>, row: T): string {
    const raw = column.value?.(row);
    if (raw === null || raw === undefined || raw === '') {
      return '—';
    }
    return String(raw);
  }

  protected onSort(column: TableColumn<T>): void {
    if (!column.sortable) {
      return;
    }
    const field = column.sortField ?? column.key;
    const active = this.sort();
    const direction = active?.field === field && active.direction === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ field, direction });
  }

  protected sortDirectionFor(column: TableColumn<T>): 'asc' | 'desc' | null {
    const active = this.sort();
    const field = column.sortField ?? column.key;
    return active?.field === field ? active.direction : null;
  }

  protected ariaSortFor(column: TableColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortable) {
      return null;
    }
    const direction = this.sortDirectionFor(column);
    return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
  }
}
