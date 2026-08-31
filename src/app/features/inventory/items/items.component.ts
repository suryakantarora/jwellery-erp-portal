import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { MasterRecord, Product, ProductSize } from '../../../core/models/catalogue.model';
import {
  CreateItemRequest,
  ITEM_STATUSES,
  ItemStatus,
  JewelleryItem,
} from '../../../core/models/inventory.model';
import { Metal, Purity } from '../../../core/models/metal.model';
import { Branch, Location } from '../../../core/models/organization.model';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
  toSortParam,
} from '../../../shared/components/data-table/data-table.model';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { CatalogueService } from '../../products/catalogue.service';
import { MetalService } from '../../products/metal.service';
import { OrganizationService } from '../../organization/organization.service';
import { InventoryService } from '../inventory.service';
import { ScanBoxComponent } from '../scan-box/scan-box.component';

/**
 * The item register: every physical piece the business holds.
 *
 * A row opens the piece's passport rather than a drawer, because an item is a
 * document — identity, weight, stones, history — not a form.
 */
@Component({
  selector: 'app-items',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    ScanBoxComponent,
  ],
  templateUrl: './items.component.html',
})
export class ItemsComponent {
  private readonly inventory = inject(InventoryService);
  private readonly catalogue = inject(CatalogueService);
  private readonly metalApi = inject(MetalService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canCreate = computed(() =>
    this.auth.hasPermission(Permission.INVENTORY_CREATE),
  );

  protected readonly statuses = ITEM_STATUSES;

  protected readonly products = signal<readonly Product[]>([]);
  protected readonly types = signal<readonly MasterRecord[]>([]);
  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly purities = signal<readonly Purity[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly sizes = signal<readonly ProductSize[]>([]);

  protected readonly result = signal<PageResponse<JewelleryItem>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<ItemStatus | ''>('');
  protected readonly branchFilter = signal('');
  protected readonly locationFilter = signal('');
  protected readonly metalFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'itemCode', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JewelleryItem>>>('statusCell');
  private readonly codeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JewelleryItem>>>('codeCell');
  private readonly weightTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JewelleryItem>>>('weightCell');
  private readonly tagsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<JewelleryItem>>>('tagsCell');
  protected readonly templates = computed(() => ({
    status: this.statusTpl(),
    itemCode: this.codeTpl(),
    grossWeight: this.weightTpl(),
    rfidTag: this.tagsTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    itemCode: [''],
    productId: ['', [Validators.required]],
    metalId: [''],
    purityId: [''],
    grossWeight: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    sizeId: [''],
    rfidTag: [''],
    qrCode: [''],
    barcode: [''],
    hallmarkNumber: [''],
    purchaseCost: [null as number | null, [Validators.min(0)]],
    makingCost: [null as number | null, [Validators.min(0)]],
    stoneCost: [null as number | null, [Validators.min(0)]],
    receivedDate: [''],
    locationId: ['', [Validators.required]],
    notes: [''],
  });

  protected readonly columns: readonly TableColumn<JewelleryItem>[] = [
    { key: 'itemCode', header: 'Item', sortable: true, width: '220px' },
    { key: 'productId', header: 'Product', value: (row) => this.productName(row.productId) },
    {
      key: 'metalId',
      header: 'Metal',
      hideOnMobile: true,
      value: (row) => this.metalName(row.metalId),
    },
    { key: 'grossWeight', header: 'Weight', align: 'end', width: '190px' },
    { key: 'rfidTag', header: 'Tags', hideOnMobile: true, width: '150px' },
    {
      key: 'currentLocationId',
      header: 'Location',
      hideOnMobile: true,
      value: (row) => this.locationName(row.currentLocationId),
    },
    {
      key: 'totalCost',
      header: 'Cost',
      numeric: true,
      align: 'end',
      width: '130px',
      value: (row) => row.totalCost,
    },
    { key: 'status', header: 'Status', width: '140px' },
  ];

  protected readonly activeFilterCount = computed(
    () =>
      (this.statusFilter() ? 1 : 0) +
      (this.branchFilter() ? 1 : 0) +
      (this.locationFilter() ? 1 : 0) +
      (this.metalFilter() ? 1 : 0),
  );

  /** Purities of the metal chosen in the create form. */
  protected readonly formPurities = signal<readonly Purity[]>([]);

  protected readonly trackById = (row: JewelleryItem) => row.id;

  constructor() {
    this.catalogue
      .searchProducts({ size: 200, sort: 'sku,asc' })
      .subscribe({ next: (page) => this.products.set(page.content) });
    this.catalogue.listProductTypes().subscribe({ next: (r) => this.types.set(r) });
    this.metalApi.listMetals().subscribe({ next: (r) => this.metals.set(r) });
    this.organization.listAllBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadLocations();
      },
    });
    this.load();
  }

  protected productName(id: string | null): string {
    if (!id) {
      return '—';
    }
    const product = this.products().find((entry) => entry.id === id);
    return product ? `${product.sku} · ${product.name}` : '—';
  }

  protected metalName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.metals().find((metal) => metal.id === id)?.name ?? '—';
  }

  protected locationName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.locations().find((location) => location.id === id)?.name ?? '—';
  }

  /** Locations across every branch, so the filter and form can name any of them. */
  private loadLocations(): void {
    const branches = this.branches();
    if (branches.length === 0) {
      return;
    }
    const collected: Location[] = [];
    let outstanding = branches.length;
    for (const branch of branches) {
      this.organization.listLocations(branch.id).subscribe({
        next: (locations) => collected.push(...locations),
        error: () => undefined,
        complete: () => {
          outstanding -= 1;
          if (outstanding === 0) {
            this.locations.set(collected);
          }
        },
      });
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inventory
      .searchItems({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
        status: this.statusFilter() || null,
        branchId: this.branchFilter() || null,
        locationId: this.locationFilter() || null,
        metalId: this.metalFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.result.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.result.set(emptyPage(this.size()));
          this.error.set(error);
          this.loading.set(false);
        },
      });
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
    this.load();
  }

  protected onFilter(which: 'status' | 'branch' | 'location' | 'metal', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    ({
      status: () => this.statusFilter.set(value as ItemStatus | ''),
      branch: () => this.branchFilter.set(value),
      location: () => this.locationFilter.set(value),
      metal: () => this.metalFilter.set(value),
    })[which]();
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.statusFilter.set('');
    this.branchFilter.set('');
    this.locationFilter.set('');
    this.metalFilter.set('');
    this.page.set(0);
    this.load();
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    this.load();
  }

  protected onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    this.load();
  }

  protected openItem(item: JewelleryItem): void {
    void this.router.navigate(['/inventory/items', item.id]);
  }

  /** A scan resolves straight to the piece's passport. */
  protected onScan(item: JewelleryItem): void {
    void this.router.navigate(['/inventory/items', item.id]);
  }

  // ---------- creating ----------

  protected startCreate(): void {
    this.form.enable();
    this.form.reset({
      locationId: this.defaultLocationId(),
      receivedDate: new Date().toISOString().slice(0, 10),
    });
    this.formPurities.set([]);
    this.sizes.set([]);
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  private defaultLocationId(): string {
    const branchId = this.branchContext.activeBranchId();
    const inBranch = this.locations().filter((location) => location.branchId === branchId);
    return inBranch[0]?.id ?? this.locations()[0]?.id ?? '';
  }

  /** Choosing a product carries its metal, purity, weight and sizes across. */
  protected onProductChange(event: Event): void {
    const product = this.products().find(
      (entry) => entry.id === (event.target as HTMLSelectElement).value,
    );
    if (!product) {
      return;
    }

    this.form.patchValue({
      metalId: product.defaultMetalId ?? '',
      purityId: '',
      grossWeight: product.nominalGrossWeight ?? this.form.controls.grossWeight.value,
    });

    if (product.defaultMetalId) {
      this.metalApi.listPurities(product.defaultMetalId).subscribe({
        next: (purities) => {
          this.formPurities.set(purities);
          if (product.defaultPurityId) {
            this.form.patchValue({ purityId: product.defaultPurityId });
          }
        },
        error: () => this.formPurities.set([]),
      });
    } else {
      this.formPurities.set([]);
    }

    this.catalogue.listSizes(product.productTypeId).subscribe({
      next: (sizes) => this.sizes.set(sizes),
      error: () => this.sizes.set([]),
    });
  }

  protected onMetalChange(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.form.patchValue({ purityId: '' });
    if (!metalId) {
      this.formPurities.set([]);
      return;
    }
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => this.formPurities.set(purities),
      error: () => this.formPurities.set([]),
    });
  }

  protected close(): void {
    this.creating.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (!this.canCreate()) {
      return;
    }
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const request = {
      ...(nullifyBlanks(this.form.getRawValue()) as unknown as CreateItemRequest),
      supplierId: null,
      stones: [],
    };

    this.saving.set(true);
    this.inventory.createItem(request).subscribe({
      next: (item) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Item created', `${item.itemCode} — draft, awaiting quality check`);
        void this.router.navigate(['/inventory/items', item.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }
}
