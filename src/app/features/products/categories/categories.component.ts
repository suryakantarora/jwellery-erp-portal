import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
  TemplateRef,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage } from '../../../core/models/api.model';
import {
  CategoryRequest,
  MasterRecord,
  ProductSize,
  ProductTypeRequest,
  SizeRequest,
} from '../../../core/models/catalogue.model';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
} from '../../../shared/components/data-table/data-table.model';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { CatalogueService, nameOf } from '../catalogue.service';

type Tab = 'categories' | 'types' | 'sizes';

/**
 * The taxonomy behind the catalogue: categories, the product types inside them
 * and the sizes a sizeable type offers.
 *
 * All three are small lists the backend returns unpaged, and all three are
 * edited the same way, so they share one screen and one panel component rather
 * than three near-identical pages.
 */
@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent {
  private readonly catalogue = inject(CatalogueService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(
    () =>
      this.auth.hasPermission(Permission.PRODUCT_CREATE) ||
      this.auth.hasPermission(Permission.PRODUCT_UPDATE),
  );

  protected readonly tab = signal<Tab>('categories');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'categories', label: 'Categories' },
    { id: 'types', label: 'Product types' },
    { id: 'sizes', label: 'Sizes' },
  ];

  protected readonly categories = signal<readonly MasterRecord[]>([]);
  protected readonly types = signal<readonly MasterRecord[]>([]);
  protected readonly sizes = signal<readonly ProductSize[]>([]);
  /** Sizes are scoped to one product type, which the operator picks. */
  protected readonly sizeTypeId = signal('');

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'name', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly editing = signal<MasterRecord | ProductSize | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  // A cell template is typed by the row it renders, so the sizes table gets its
  // own status template rather than borrowing the masters' one.
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<MasterRecord>>>('statusCell');
  private readonly parentTpl =
    viewChild.required<TemplateRef<CellTemplateContext<MasterRecord>>>('parentCell');
  private readonly sizeableTpl =
    viewChild.required<TemplateRef<CellTemplateContext<MasterRecord>>>('sizeableCell');
  private readonly sizeStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<ProductSize>>>('sizeStatusCell');

  protected readonly categoryForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    parentId: [''],
    displayOrder: [null as number | null],
    description: ['', [Validators.maxLength(255)]],
  });

  protected readonly typeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: [''],
    sizeable: [false],
    description: ['', [Validators.maxLength(255)]],
  });

  protected readonly sizeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    label: ['', [Validators.required, Validators.maxLength(50)]],
    standard: ['', [Validators.maxLength(30)]],
    displayOrder: [null as number | null],
  });

  /** Only sizeable product types can own sizes. */
  protected readonly sizeableTypes = computed(() =>
    this.types().filter((type) => type.sizeable === true),
  );

  protected readonly categoryColumns: readonly TableColumn<MasterRecord>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Category', sortable: true, value: (row) => row.name },
    { key: 'parentId', header: 'Inside', hideOnMobile: true },
    {
      key: 'displayOrder',
      header: 'Order',
      numeric: true,
      align: 'end',
      width: '90px',
      sortable: true,
      value: (row) => row.displayOrder,
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      value: (row) => row.description,
    },
    { key: 'status', header: 'Status', width: '120px' },
  ];

  protected readonly typeColumns: readonly TableColumn<MasterRecord>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Product type', sortable: true, value: (row) => row.name },
    { key: 'parentId', header: 'Category', hideOnMobile: true },
    { key: 'sizeable', header: 'Sizeable', align: 'center', width: '120px' },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      value: (row) => row.description,
    },
    { key: 'status', header: 'Status', width: '120px' },
  ];

  protected readonly sizeColumns: readonly TableColumn<ProductSize>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'label', header: 'Label', sortable: true, value: (row) => row.label },
    { key: 'standard', header: 'Standard', hideOnMobile: true, value: (row) => row.standard },
    {
      key: 'displayOrder',
      header: 'Order',
      numeric: true,
      align: 'end',
      width: '90px',
      sortable: true,
      value: (row) => row.displayOrder,
    },
    { key: 'status', header: 'Status', width: '120px' },
  ];

  protected readonly masterTemplates = computed(() => ({
    status: this.statusTpl(),
    parentId: this.parentTpl(),
    sizeable: this.sizeableTpl(),
  }));

  protected readonly sizeTemplates = computed(() => ({ status: this.sizeStatusTpl() }));

  protected readonly categoryPage = computed(() =>
    localPage(this.categories(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly typePage = computed(() =>
    localPage(this.types(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly sizePage = computed(() =>
    this.sizeTypeId()
      ? localPage(this.sizes(), {
          search: this.search(),
          searchFields: [(row) => row.code, (row) => row.label, (row) => row.standard],
          sort: this.sort(),
          page: this.page(),
          size: this.size(),
        })
      : emptyPage<ProductSize>(this.size()),
  );

  protected readonly trackById = (row: { id: string }) => row.id;
  protected readonly categoryName = (id: string | null) => nameOf(this.categories(), id);

  constructor() {
    this.load();
  }

  protected load(refresh = true): void {
    this.loading.set(true);
    this.error.set(null);
    this.catalogue.listCategories(refresh).subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error: AppError) => this.error.set(error),
    });
    this.catalogue.listProductTypes(refresh).subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
    if (this.tab() === 'sizes' && this.sizeTypeId()) {
      this.loadSizes();
    }
  }

  protected loadSizes(): void {
    const productTypeId = this.sizeTypeId();
    if (!productTypeId) {
      this.sizes.set([]);
      return;
    }
    this.loading.set(true);
    this.catalogue.listSizes(productTypeId).subscribe({
      next: (sizes) => {
        this.sizes.set(sizes);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.sizes.set([]);
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.search.set('');
    this.page.set(0);
    this.editing.set(null);
    if (tab === 'sizes') {
      const preferred = this.sizeTypeId() || this.sizeableTypes()[0]?.id || '';
      this.sizeTypeId.set(preferred);
      this.loadSizes();
    }
  }

  protected onSizeTypeChange(event: Event): void {
    this.sizeTypeId.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.loadSizes();
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
  }

  // ---------- editing ----------

  protected startCreate(): void {
    this.resetForms();
    this.editing.set('new');
  }

  protected startEdit(row: MasterRecord | ProductSize): void {
    this.resetForms();

    if (this.tab() === 'categories') {
      const record = row as MasterRecord;
      this.categoryForm.patchValue({
        code: record.code,
        name: record.name,
        parentId: record.parentId ?? '',
        displayOrder: record.displayOrder,
        description: record.description ?? '',
      });
      if (!this.canManage()) {
        this.categoryForm.disable();
      }
    } else if (this.tab() === 'types') {
      const record = row as MasterRecord;
      this.typeForm.patchValue({
        code: record.code,
        name: record.name,
        categoryId: record.parentId ?? '',
        sizeable: record.sizeable === true,
        description: record.description ?? '',
      });
      if (!this.canManage()) {
        this.typeForm.disable();
      }
    } else {
      // Sizes have no update endpoint, so an existing size opens read-only.
      const record = row as ProductSize;
      this.sizeForm.patchValue({
        code: record.code,
        label: record.label,
        standard: record.standard ?? '',
        displayOrder: record.displayOrder,
      });
      this.sizeForm.disable();
    }

    this.editing.set(row);
  }

  /** Sizes are append-only on the backend; an existing one cannot be saved. */
  protected readonly editable = computed(() => {
    if (!this.canManage()) {
      return false;
    }
    return this.tab() !== 'sizes' || this.editing() === 'new';
  });

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

    if (this.tab() === 'categories') {
      this.saveCategory(target);
    } else if (this.tab() === 'types') {
      this.saveType(target);
    } else {
      this.saveSize();
    }
  }

  private saveCategory(target: MasterRecord | ProductSize | 'new'): void {
    if (this.categoryForm.invalid) {
      touchAll(this.categoryForm);
      return;
    }
    const request = nullifyBlanks(this.categoryForm.getRawValue()) as unknown as CategoryRequest;
    const call =
      target === 'new'
        ? this.catalogue.createCategory(request)
        : this.catalogue.updateCategory((target as MasterRecord).id, request);
    this.commit(
      call,
      this.categoryForm,
      target === 'new' ? 'Category created' : 'Category updated',
    );
  }

  private saveType(target: MasterRecord | ProductSize | 'new'): void {
    if (this.typeForm.invalid) {
      touchAll(this.typeForm);
      return;
    }
    const request = nullifyBlanks(this.typeForm.getRawValue()) as unknown as ProductTypeRequest;
    const call =
      target === 'new'
        ? this.catalogue.createProductType(request)
        : this.catalogue.updateProductType((target as MasterRecord).id, request);
    this.commit(
      call,
      this.typeForm,
      target === 'new' ? 'Product type created' : 'Product type updated',
    );
  }

  private saveSize(): void {
    if (this.sizeForm.invalid) {
      touchAll(this.sizeForm);
      return;
    }
    const request: SizeRequest = {
      ...(nullifyBlanks(this.sizeForm.getRawValue()) as unknown as Omit<
        SizeRequest,
        'productTypeId'
      >),
      productTypeId: this.sizeTypeId(),
    };
    this.commit(this.catalogue.createSize(request), this.sizeForm, 'Size created');
  }

  /** Shared success/failure handling for all three of this screen's masters. */
  private commit(
    call: Observable<{ code: string; name?: string; label?: string }>,
    form: FormGroup,
    successTitle: string,
  ): void {
    this.saving.set(true);
    call.subscribe({
      next: (record) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(successTitle, `${record.code} — ${record.name ?? record.label ?? ''}`);
        if (this.tab() === 'sizes') {
          this.loadSizes();
        } else {
          this.load();
        }
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }

  private resetForms(): void {
    for (const form of [this.categoryForm, this.typeForm, this.sizeForm]) {
      form.enable();
      form.reset();
    }
    this.typeForm.patchValue({ sizeable: false });
    this.submitted.set(false);
    this.formError.set(null);
  }
}
