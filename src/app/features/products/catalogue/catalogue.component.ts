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
import {
  Design,
  MAKING_CHARGE_TYPES,
  MasterRecord,
  Product,
  ProductRequest,
} from '../../../core/models/catalogue.model';
import { Metal, Purity } from '../../../core/models/metal.model';
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
import { CatalogueService, nameOf } from '../catalogue.service';
import { MetalService } from '../metal.service';

/**
 * The product catalogue.
 *
 * A row opens the product's detail page rather than a drawer — a product
 * carries enough context (design, metal, pricing defaults, tax) that a full
 * page reads better than a panel. The drawer here is for creating one.
 */
@Component({
  selector: 'app-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MasterPanelComponent, FormFieldComponent, StatusBadgeComponent],
  templateUrl: './catalogue.component.html',
})
export class CatalogueComponent {
  private readonly catalogue = inject(CatalogueService);
  private readonly metalApi = inject(MetalService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canCreate = computed(() => this.auth.hasPermission(Permission.PRODUCT_CREATE));

  protected readonly makingChargeTypes = MAKING_CHARGE_TYPES;

  protected readonly categories = signal<readonly MasterRecord[]>([]);
  protected readonly types = signal<readonly MasterRecord[]>([]);
  protected readonly brands = signal<readonly MasterRecord[]>([]);
  protected readonly collections = signal<readonly MasterRecord[]>([]);
  protected readonly designs = signal<readonly Design[]>([]);
  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly purities = signal<readonly Purity[]>([]);

  protected readonly result = signal<PageResponse<Product>>(emptyPage(environment.defaultPageSize));
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly categoryFilter = signal('');
  protected readonly typeFilter = signal('');
  protected readonly brandFilter = signal('');
  protected readonly collectionFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'sku', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Product>>>('statusCell');
  private readonly skuTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Product>>>('skuCell');
  private readonly weightTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Product>>>('weightCell');
  protected readonly templates = computed(() => ({
    status: this.statusTpl(),
    name: this.skuTpl(),
    nominalGrossWeight: this.weightTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    productTypeId: ['', [Validators.required]],
    designId: [''],
    categoryId: [''],
    brandId: [''],
    collectionId: [''],
    defaultMetalId: [''],
    defaultPurityId: [''],
    nominalGrossWeight: [null as number | null, [Validators.min(0.0001)]],
    defaultMakingChargeType: [''],
    defaultMakingChargeValue: [null as number | null, [Validators.min(0)]],
    defaultWastagePercentage: [null as number | null, [Validators.min(0)]],
    hsnCode: ['', [Validators.maxLength(30)]],
    description: [''],
  });

  protected readonly columns: readonly TableColumn<Product>[] = [
    {
      key: 'sku',
      header: 'SKU',
      mono: true,
      sortable: true,
      width: '160px',
      value: (row) => row.sku,
    },
    { key: 'name', header: 'Product', sortable: true },
    {
      key: 'productTypeId',
      header: 'Type',
      hideOnMobile: true,
      value: (row) => nameOf(this.types(), row.productTypeId),
    },
    {
      key: 'categoryId',
      header: 'Category',
      hideOnMobile: true,
      value: (row) => nameOf(this.categories(), row.categoryId),
    },
    {
      key: 'defaultMetalId',
      header: 'Metal',
      hideOnMobile: true,
      value: (row) => this.metalName(row.defaultMetalId),
    },
    { key: 'nominalGrossWeight', header: 'Nominal wt.', align: 'end', width: '140px' },
    {
      key: 'hsnCode',
      header: 'HSN',
      mono: true,
      hideOnMobile: true,
      width: '120px',
      value: (row) => row.hsnCode,
    },
    { key: 'status', header: 'Status', width: '120px' },
  ];

  protected readonly activeFilterCount = computed(
    () =>
      (this.categoryFilter() ? 1 : 0) +
      (this.typeFilter() ? 1 : 0) +
      (this.brandFilter() ? 1 : 0) +
      (this.collectionFilter() ? 1 : 0),
  );

  /** Purities of the metal chosen in the create form. */
  protected readonly formPurities = signal<readonly Purity[]>([]);

  protected readonly trackById = (row: Product) => row.id;

  constructor() {
    this.catalogue.listCategories().subscribe({ next: (r) => this.categories.set(r) });
    this.catalogue.listProductTypes().subscribe({ next: (r) => this.types.set(r) });
    this.catalogue.listBrands().subscribe({ next: (r) => this.brands.set(r) });
    this.catalogue.listCollections().subscribe({ next: (r) => this.collections.set(r) });
    this.metalApi.listMetals().subscribe({ next: (r) => this.metals.set(r) });
    this.catalogue
      .searchDesigns({ size: 200, sort: 'designCode,asc' })
      .subscribe({ next: (page) => this.designs.set(page.content) });
    this.load();
  }

  protected metalName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.metals().find((metal) => metal.id === id)?.name ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalogue
      .searchProducts({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
        categoryId: this.categoryFilter() || null,
        productTypeId: this.typeFilter() || null,
        brandId: this.brandFilter() || null,
        collectionId: this.collectionFilter() || null,
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

  protected onFilter(which: 'category' | 'type' | 'brand' | 'collection', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const target = {
      category: this.categoryFilter,
      type: this.typeFilter,
      brand: this.brandFilter,
      collection: this.collectionFilter,
    }[which];
    target.set(value);
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.categoryFilter.set('');
    this.typeFilter.set('');
    this.brandFilter.set('');
    this.collectionFilter.set('');
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

  protected openProduct(product: Product): void {
    void this.router.navigate(['/products', product.id]);
  }

  // ---------- creating ----------

  protected startCreate(): void {
    this.form.enable();
    this.form.reset({ productTypeId: this.typeFilter() || '' });
    this.formPurities.set([]);
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected onMetalChange(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.form.patchValue({ defaultPurityId: '' });
    if (!metalId) {
      this.formPurities.set([]);
      return;
    }
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => this.formPurities.set(purities),
      error: () => this.formPurities.set([]),
    });
  }

  /** Picking a design pre-fills the fields the design already decides. */
  protected onDesignChange(event: Event): void {
    const design = this.designs().find(
      (entry) => entry.id === (event.target as HTMLSelectElement).value,
    );
    if (!design) {
      return;
    }
    this.form.patchValue({
      productTypeId: design.productTypeId ?? this.form.controls.productTypeId.value,
      collectionId: design.collectionId ?? '',
      brandId: design.brandId ?? '',
      nominalGrossWeight: design.nominalGrossWeight ?? this.form.controls.nominalGrossWeight.value,
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

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as ProductRequest;
    this.saving.set(true);
    this.catalogue.createProduct(request).subscribe({
      next: (product) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Product created', `${product.sku} — ${product.name}`);
        void this.router.navigate(['/products', product.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }
}
