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
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError } from '../../../core/models/api.model';
import { MasterRecord, SimpleMasterRequest } from '../../../core/models/catalogue.model';
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
import { CatalogueService } from '../catalogue.service';

type Tab = 'collections' | 'brands';

/**
 * Collections and brands.
 *
 * Both are flat code/name/description masters with identical behaviour, so one
 * screen serves them with the tab deciding which endpoint is called.
 *
 * The backend offers create and list only for these two — there is no update or
 * deactivate route — so an existing record opens read-only.
 */
@Component({
  selector: 'app-collections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './collections.component.html',
})
export class CollectionsComponent {
  private readonly catalogue = inject(CatalogueService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.PRODUCT_CREATE));

  protected readonly tab = signal<Tab>('collections');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'collections', label: 'Collections' },
    { id: 'brands', label: 'Brands' },
  ];

  private readonly records = signal<readonly MasterRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'name', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly editing = signal<MasterRecord | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<MasterRecord>>>('statusCell');
  protected readonly templates = computed(() => ({ status: this.statusTpl() }));

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(255)]],
  });

  protected readonly label = computed(() => (this.tab() === 'brands' ? 'brand' : 'collection'));

  protected readonly columns = computed<readonly TableColumn<MasterRecord>[]>(() => [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '160px',
      value: (row) => row.code,
    },
    {
      key: 'name',
      header: this.tab() === 'brands' ? 'Brand' : 'Collection',
      sortable: true,
      value: (row) => row.name,
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      value: (row) => row.description,
    },
    { key: 'status', header: 'Status', width: '120px' },
  ]);

  protected readonly result = computed(() =>
    localPage(this.records(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly trackById = (row: MasterRecord) => row.id;

  constructor() {
    this.load();
  }

  protected load(refresh = true): void {
    this.loading.set(true);
    this.error.set(null);
    const call =
      this.tab() === 'brands'
        ? this.catalogue.listBrands(refresh)
        : this.catalogue.listCollections(refresh);

    call.subscribe({
      next: (records) => {
        this.records.set(records);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.records.set([]);
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
    this.load(false);
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

  protected startCreate(): void {
    this.form.enable();
    this.form.reset();
    this.submitted.set(false);
    this.formError.set(null);
    this.editing.set('new');
  }

  protected startEdit(record: MasterRecord): void {
    this.form.reset({
      code: record.code,
      name: record.name,
      description: record.description ?? '',
    });
    // No update endpoint exists for brands or collections.
    this.form.disable();
    this.submitted.set(false);
    this.formError.set(null);
    this.editing.set(record);
  }

  protected readonly editable = computed(() => this.canManage() && this.editing() === 'new');

  /** Drawer heading: the record's own name once one is open. */
  protected readonly editingName = computed(() => {
    const target = this.editing();
    return target && target !== 'new' ? target.name : '';
  });

  protected close(): void {
    this.editing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (!this.editable()) {
      return;
    }
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as SimpleMasterRequest;
    const call: Observable<MasterRecord> =
      this.tab() === 'brands'
        ? this.catalogue.createBrand(request)
        : this.catalogue.createCollection(request);

    this.saving.set(true);
    call.subscribe({
      next: (record) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(
          this.tab() === 'brands' ? 'Brand created' : 'Collection created',
          `${record.code} — ${record.name}`,
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
