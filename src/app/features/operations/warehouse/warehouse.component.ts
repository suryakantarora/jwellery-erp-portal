import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { JewelleryItem } from '../../../core/models/inventory.model';
import {
  BIN_TYPES,
  Bin,
  BinType,
  STOCK_COUNT_STATUSES,
  StockCount,
  StockCountStatus,
} from '../../../core/models/operations.model';
import { Branch, Location } from '../../../core/models/organization.model';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
  toSortParam,
} from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { InventoryService } from '../../inventory/inventory.service';
import { OrganizationService } from '../../organization/organization.service';
import { OperationsService } from '../operations.service';

type Tab = 'counts' | 'bins';

/**
 * Physical stock control: the vault's own storage structure, and the counts
 * that prove what is actually in it.
 *
 * A count is deliberately blind — the operator records what they *find*, and
 * the system works out what is missing or unexpected. That variance needs
 * approval before it touches stock.
 */
@Component({
  selector: 'app-warehouse',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    DrawerComponent,
    FormFieldComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './warehouse.component.html',
  styleUrl: './warehouse.component.scss',
})
export class WarehouseComponent {
  private readonly operations = inject(OperationsService);
  private readonly inventory = inject(InventoryService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.WAREHOUSE_MANAGE),
  );
  protected readonly canCount = computed(() =>
    this.auth.hasPermission(Permission.STOCK_COUNT_PERFORM),
  );
  protected readonly canApprove = computed(() =>
    this.auth.hasPermission(Permission.STOCK_COUNT_APPROVE),
  );

  protected readonly binTypes = BIN_TYPES;
  protected readonly statuses = STOCK_COUNT_STATUSES;

  protected readonly tab = signal<Tab>('counts');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'counts', label: 'Stock counts' },
    { id: 'bins', label: 'Storage structure' },
  ];

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly binLocationId = signal('');
  protected readonly bins = signal<readonly Bin[]>([]);

  protected readonly counts = signal<PageResponse<StockCount>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusFilter = signal<StockCountStatus | ''>('');
  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'countDate', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly viewing = signal<StockCount | null>(null);
  protected readonly counting = signal(false);
  /** Pieces the operator has recorded as found during a count. */
  protected readonly foundItems = signal<ReadonlySet<string>>(new Set());
  protected readonly expectedItems = signal<readonly JewelleryItem[]>([]);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly refTpl =
    viewChild.required<TemplateRef<CellTemplateContext<StockCount>>>('refCell');
  private readonly locationTpl =
    viewChild.required<TemplateRef<CellTemplateContext<StockCount>>>('locationCell');
  private readonly varianceTpl =
    viewChild.required<TemplateRef<CellTemplateContext<StockCount>>>('varianceCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<StockCount>>>('statusCell');
  private readonly actionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<StockCount>>>('actionsCell');
  private readonly binTypeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Bin>>>('binTypeCell');
  private readonly binActiveTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Bin>>>('binActiveCell');
  private readonly binActionsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Bin>>>('binActionsCell');

  protected readonly countTemplates = computed(() => ({
    referenceNumber: this.refTpl(),
    locationId: this.locationTpl(),
    expectedCount: this.varianceTpl(),
    status: this.statusTpl(),
    actions: this.actionsTpl(),
  }));

  protected readonly binTemplates = computed(() => ({
    binType: this.binTypeTpl(),
    active: this.binActiveTpl(),
    actions: this.binActionsTpl(),
  }));

  protected readonly countForm = this.fb.nonNullable.group({
    locationId: ['', [Validators.required]],
    notes: [''],
  });

  protected readonly binForm = this.fb.nonNullable.group({
    locationId: ['', [Validators.required]],
    parentId: [''],
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    binType: ['SHELF' as BinType, [Validators.required]],
    capacity: [null as number | null, [Validators.min(1)]],
    description: [''],
  });

  protected readonly countColumns: readonly TableColumn<StockCount>[] = [
    { key: 'referenceNumber', header: 'Count', width: '210px' },
    { key: 'locationId', header: 'Location' },
    { key: 'expectedCount', header: 'Result', width: '260px' },
    {
      key: 'countedBy',
      header: 'Counted by',
      mono: true,
      hideOnMobile: true,
      width: '140px',
      value: (row) => row.countedBy,
    },
    { key: 'status', header: 'Status', width: '160px' },
    { key: 'actions', header: '', width: '190px', align: 'end' },
  ];

  protected readonly binColumns: readonly TableColumn<Bin>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Storage', sortable: true, value: (row) => row.name },
    { key: 'binType', header: 'Kind', width: '140px' },
    {
      key: 'capacity',
      header: 'Capacity',
      numeric: true,
      align: 'end',
      width: '120px',
      value: (row) => row.capacity,
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      value: (row) => row.description,
    },
    { key: 'active', header: 'Status', width: '120px' },
    { key: 'actions', header: '', width: '130px', align: 'end' },
  ];

  protected readonly binPage = computed(() =>
    this.binLocationId()
      ? localPage(this.bins(), {
          search: this.search(),
          searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
          sort: this.sort(),
          page: this.page(),
          size: this.size(),
        })
      : emptyPage<Bin>(this.size()),
  );

  protected readonly trackById = (row: { id: string }) => row.id;

  constructor() {
    this.organization.listAllBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadLocations(branches);
      },
    });
    this.load();
  }

  private loadLocations(branches: readonly Branch[]): void {
    const collected: Location[] = [];
    let outstanding = branches.length;
    if (outstanding === 0) {
      return;
    }
    for (const branch of branches) {
      this.organization.listLocations(branch.id).subscribe({
        next: (locations) => collected.push(...locations),
        error: () => undefined,
        complete: () => {
          outstanding -= 1;
          if (outstanding === 0) {
            this.locations.set(collected);
            if (!this.binLocationId() && collected.length > 0) {
              this.binLocationId.set(collected[0].id);
            }
          }
        },
      });
    }
  }

  protected locationName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.locations().find((location) => location.id === id)?.name ?? '—';
  }

  protected load(): void {
    if (this.tab() === 'bins') {
      this.loadBins();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.operations
      .searchStockCounts({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        status: this.statusFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.counts.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.counts.set(emptyPage(this.size()));
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected loadBins(): void {
    const locationId = this.binLocationId();
    if (!locationId) {
      this.bins.set([]);
      return;
    }
    this.loading.set(true);
    this.operations.listBins(locationId).subscribe({
      next: (bins) => {
        this.bins.set(bins);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.bins.set([]);
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.search.set('');
    this.statusFilter.set('');
    this.page.set(0);
    this.creating.set(false);
    this.sort.set(
      tab === 'counts'
        ? { field: 'countDate', direction: 'desc' }
        : { field: 'code', direction: 'asc' },
    );
    this.load();
  }

  protected onBinLocation(event: Event): void {
    this.binLocationId.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.loadBins();
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StockCountStatus | '');
    this.page.set(0);
    this.load();
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    if (this.tab() === 'counts') {
      this.load();
    }
  }

  protected onPage(page: number): void {
    this.page.set(page);
    if (this.tab() === 'counts') {
      this.load();
    }
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    if (this.tab() === 'counts') {
      this.load();
    }
  }

  // ---------- creating ----------

  protected startCreate(): void {
    const branchId = this.branchContext.activeBranchId();
    const inBranch = this.locations().filter((location) => location.branchId === branchId);
    const preferred = inBranch[0]?.id ?? this.locations()[0]?.id ?? '';

    this.countForm.reset({ locationId: preferred, notes: '' });
    this.binForm.reset({
      locationId: this.binLocationId(),
      binType: 'SHELF',
      parentId: '',
      capacity: null,
    });
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected close(): void {
    this.creating.set(false);
    this.viewing.set(null);
    this.counting.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.tab() === 'bins') {
      if (this.binForm.invalid) {
        touchAll(this.binForm);
        return;
      }
      const value = this.binForm.getRawValue();
      this.saving.set(true);
      this.operations
        .createBin({
          locationId: value.locationId,
          parentId: value.parentId || null,
          code: value.code,
          name: value.name,
          binType: value.binType,
          capacity: value.capacity,
          description: value.description || null,
        })
        .subscribe({
          next: (bin) => {
            this.saving.set(false);
            this.creating.set(false);
            this.toast.success('Storage created', `${bin.code} — ${bin.name}`);
            this.loadBins();
          },
          error: (error: AppError) => {
            this.saving.set(false);
            this.formError.set(error.message);
          },
        });
      return;
    }

    if (this.countForm.invalid) {
      touchAll(this.countForm);
      return;
    }
    const value = this.countForm.getRawValue();
    this.saving.set(true);
    this.operations.startCount(value.locationId, value.notes || null).subscribe({
      next: (count) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success(
          'Count started',
          `${count.referenceNumber} — ${count.expectedCount} expected`,
        );
        this.load();
        this.view(count);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  // ---------- counting ----------

  protected view(count: StockCount): void {
    this.viewing.set(count);
    this.operations.getStockCount(count.id).subscribe({
      next: (fresh) => this.viewing.set(fresh),
      error: () => undefined,
    });
  }

  /** Opens the count sheet, listing what the system believes is there. */
  protected startCounting(): void {
    const count = this.viewing();
    if (!count) {
      return;
    }
    this.foundItems.set(new Set());
    this.formError.set(null);
    this.counting.set(true);

    this.inventory
      .searchItems({ locationId: count.locationId, size: 300, sort: 'itemCode,asc' })
      .subscribe({
        next: (page) => this.expectedItems.set(page.content),
        error: () => this.expectedItems.set([]),
      });
  }

  protected toggleFound(itemId: string): void {
    this.foundItems.update((current) => {
      const next = new Set(current);
      if (!next.delete(itemId)) {
        next.add(itemId);
      }
      return next;
    });
  }

  protected isFound(itemId: string): boolean {
    return this.foundItems().has(itemId);
  }

  protected markAllFound(): void {
    this.foundItems.set(new Set(this.expectedItems().map((item) => item.id)));
  }

  protected submitCount(): void {
    const count = this.viewing();
    if (!count) {
      return;
    }

    this.saving.set(true);
    this.operations.submitCount(count.id, [...this.foundItems()], null).subscribe({
      next: (fresh) => {
        this.saving.set(false);
        this.counting.set(false);
        this.viewing.set(fresh);
        this.toast.success(
          'Count submitted',
          fresh.hasVariance
            ? `${fresh.missingCount} missing, ${fresh.unexpectedCount} unexpected`
            : 'No variance',
        );
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formError.set(error.message);
      },
    });
  }

  protected async approve(count: StockCount): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Approve the count',
      message: count.hasVariance
        ? 'The variance is accepted and stock is corrected to what was found.'
        : 'The count is confirmed and closed.',
      detail: `${count.referenceNumber} — ${count.missingCount} missing, ${count.unexpectedCount} unexpected`,
      confirmLabel: 'Approve',
      tone: count.hasVariance ? 'danger' : 'default',
    });
    if (!confirmed) {
      return;
    }

    this.operations.approveCount(count.id).subscribe({
      next: (fresh) => {
        this.viewing.set(fresh);
        this.toast.success('Count approved', count.referenceNumber);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not approve the count', error.message),
    });
  }

  protected async cancelCount(count: StockCount): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Cancel the count',
      message: 'Nothing is corrected and the count is abandoned.',
      detail: count.referenceNumber,
      confirmLabel: 'Cancel count',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.operations.cancelCount(count.id).subscribe({
      next: (fresh) => {
        this.viewing.set(fresh);
        this.toast.success('Count cancelled', count.referenceNumber);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not cancel the count', error.message),
    });
  }

  protected async deactivateBin(bin: Bin): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Deactivate storage',
      message: 'Nothing new can be assigned here. Its history is kept.',
      detail: `${bin.code} — ${bin.name}`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.operations.deactivateBin(bin.id).subscribe({
      next: () => {
        this.toast.success('Storage deactivated', bin.code);
        this.loadBins();
      },
      error: (error: AppError) => this.toast.error('Could not deactivate', error.message),
    });
  }
}
