import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';
import { AppError, PageResponse } from '../../../core/models/api.model';
import { CellTemplateContext, TableColumn, TableSort } from '../data-table/data-table.model';
import { DataTableComponent } from '../data-table/data-table.component';
import { DrawerComponent, DrawerSize } from '../drawer/drawer.component';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { SearchBoxComponent } from '../search-box/search-box.component';
import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * The shape every master-data screen in the portal shares: a header with a
 * create action, a searchable and sortable table, a pager, and a side drawer
 * holding the record's form.
 *
 * The host page owns the data, the form and every API call; this component owns
 * only the layout and the drawer's open/closed presentation. That split is what
 * lets categories, brands, metals, gemstones and the rest reuse one screen
 * instead of copying the same 200 lines each time.
 *
 * Two slots are projected: the default slot is the drawer's form body, and
 * `[panelFilters]` is an optional filter row under the toolbar.
 */
@Component({
  selector: 'app-master-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    DataTableComponent,
    DrawerComponent,
    PaginationComponent,
    SearchBoxComponent,
    SpinnerComponent,
  ],
  templateUrl: './master-panel.component.html',
})
export class MasterPanelComponent<T> {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
  /** Omit the page header when the panel sits inside a tabbed screen. */
  readonly showHeader = input(true);

  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly page = input.required<PageResponse<T>>();
  readonly loading = input(false);
  readonly error = input<AppError | null>(null);
  readonly sort = input<TableSort | null>(null);
  readonly trackBy = input<(row: T, index: number) => unknown>((_, index) => index);
  readonly cellTemplates = input<Record<string, TemplateRef<CellTemplateContext<T>>> | null>(null);

  readonly searchPlaceholder = input('Search…');
  readonly searchable = input(true);
  readonly emptyTitle = input('No records found');
  readonly emptyMessage = input('Nothing matches the current filters.');

  readonly canManage = input(false);
  readonly createLabel = input('New record');
  /** Disables the create action, e.g. before a required parent is chosen. */
  readonly createDisabled = input(false);

  /**
   * Null closes the drawer; any other value opens it.
   *
   * Deliberately untyped: a screen that edits more than one kind of record
   * would otherwise widen `T` to a union and break its column definitions.
   */
  readonly editing = input<unknown>(null);
  readonly drawerTitle = input('');
  readonly drawerSubtitle = input('');
  readonly drawerSize = input<DrawerSize>('md');
  /** Form id the footer's submit button targets. */
  readonly formId = input.required<string>();
  readonly saving = input(false);
  readonly saveLabel = input('Save changes');
  /** False renders the drawer read-only, e.g. for a user without the permission. */
  readonly editable = input(true);

  readonly create = output<void>();
  readonly search = output<string>();
  readonly sortChange = output<TableSort>();
  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();
  readonly rowClick = output<T>();
  readonly retry = output<void>();
  readonly dismiss = output<void>();
}
