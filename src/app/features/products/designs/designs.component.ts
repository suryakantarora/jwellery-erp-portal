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
import { Design, DesignRequest, MasterRecord } from '../../../core/models/catalogue.model';
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

/**
 * Jewellery designs — the drawing a product is made from.
 *
 * A design is upstream of a product: several SKUs in different metals or sizes
 * can all realise the same design, which is why weight here is *nominal*.
 */
@Component({
  selector: 'app-designs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MasterPanelComponent, FormFieldComponent, StatusBadgeComponent],
  templateUrl: './designs.component.html',
})
export class DesignsComponent {
  private readonly catalogue = inject(CatalogueService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canCreate = computed(() => this.auth.hasPermission(Permission.PRODUCT_CREATE));
  protected readonly canUpdate = computed(() => this.auth.hasPermission(Permission.PRODUCT_UPDATE));

  protected readonly types = signal<readonly MasterRecord[]>([]);
  protected readonly collections = signal<readonly MasterRecord[]>([]);
  protected readonly brands = signal<readonly MasterRecord[]>([]);

  protected readonly result = signal<PageResponse<Design>>(emptyPage(environment.defaultPageSize));
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly collectionFilter = signal('');
  protected readonly typeFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'designCode', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly editing = signal<Design | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Design>>>('statusCell');
  private readonly weightTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Design>>>('weightCell');
  protected readonly templates = computed(() => ({
    status: this.statusTpl(),
    nominalGrossWeight: this.weightTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    designCode: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    productTypeId: [''],
    collectionId: [''],
    brandId: [''],
    designer: ['', [Validators.maxLength(150)]],
    nominalGrossWeight: [null as number | null, [Validators.min(0.0001)]],
    description: [''],
  });

  protected readonly columns: readonly TableColumn<Design>[] = [
    {
      key: 'designCode',
      header: 'Design code',
      mono: true,
      sortable: true,
      width: '170px',
      value: (row) => row.designCode,
    },
    { key: 'name', header: 'Design', sortable: true, value: (row) => row.name },
    {
      key: 'productTypeId',
      header: 'Type',
      hideOnMobile: true,
      value: (row) => nameOf(this.types(), row.productTypeId),
    },
    {
      key: 'collectionId',
      header: 'Collection',
      hideOnMobile: true,
      value: (row) => nameOf(this.collections(), row.collectionId),
    },
    {
      key: 'brandId',
      header: 'Brand',
      hideOnMobile: true,
      value: (row) => nameOf(this.brands(), row.brandId),
    },
    { key: 'designer', header: 'Designer', hideOnMobile: true, value: (row) => row.designer },
    { key: 'nominalGrossWeight', header: 'Nominal wt.', align: 'end', width: '140px' },
    { key: 'status', header: 'Status', width: '120px' },
  ];

  protected readonly activeFilterCount = computed(
    () => (this.collectionFilter() ? 1 : 0) + (this.typeFilter() ? 1 : 0),
  );

  protected readonly editingName = computed(() => {
    const target = this.editing();
    return target && target !== 'new' ? target.name : '';
  });

  protected readonly editable = computed(() =>
    this.editing() === 'new' ? this.canCreate() : this.canUpdate(),
  );

  protected readonly trackById = (row: Design) => row.id;

  constructor() {
    this.catalogue.listProductTypes().subscribe({ next: (r) => this.types.set(r) });
    this.catalogue.listCollections().subscribe({ next: (r) => this.collections.set(r) });
    this.catalogue.listBrands().subscribe({ next: (r) => this.brands.set(r) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalogue
      .searchDesigns({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
        collectionId: this.collectionFilter() || null,
        productTypeId: this.typeFilter() || null,
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

  protected onCollectionFilter(event: Event): void {
    this.collectionFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.load();
  }

  protected onTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.collectionFilter.set('');
    this.typeFilter.set('');
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

  protected startCreate(): void {
    this.form.enable();
    this.form.reset();
    this.submitted.set(false);
    this.formError.set(null);
    this.editing.set('new');
  }

  protected startEdit(design: Design): void {
    this.form.enable();
    this.form.reset({
      designCode: design.designCode,
      name: design.name,
      productTypeId: design.productTypeId ?? '',
      collectionId: design.collectionId ?? '',
      brandId: design.brandId ?? '',
      designer: design.designer ?? '',
      nominalGrossWeight: design.nominalGrossWeight,
      description: design.description ?? '',
    });
    if (!this.canUpdate()) {
      this.form.disable();
    }
    this.submitted.set(false);
    this.formError.set(null);
    this.editing.set(design);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const target = this.editing();
    if (!target || !this.editable()) {
      return;
    }
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as DesignRequest;
    const call =
      target === 'new'
        ? this.catalogue.createDesign(request)
        : this.catalogue.updateDesign(target.id, request);

    this.saving.set(true);
    call.subscribe({
      next: (design) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(
          target === 'new' ? 'Design created' : 'Design updated',
          `${design.designCode} — ${design.name}`,
        );
        this.load();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }
}
