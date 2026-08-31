import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import {
  Metal,
  MetalRate,
  MetalRequest,
  PublishRateRequest,
  Purity,
  PurityRequest,
  RATE_TYPES,
  RateType,
} from '../../../core/models/metal.model';
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
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { MetalService } from '../metal.service';

type Tab = 'metals' | 'purities' | 'rates';

/** Today in the `yyyy-MM-dd` form the rate endpoints expect. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Metals, their purities and the rate board.
 *
 * Rates are published, not edited. Republishing the same metal, purity, side
 * and day replaces that day's figure — the previous value survives in the audit
 * trail — while every earlier day is left untouched, so a price already captured
 * on a sale can never move under it. The board is therefore the primary view and
 * the only write is "publish".
 */
@Component({
  selector: 'app-metals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    TitleCasePipe,
    PageHeaderComponent,
    MasterPanelComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    DrawerComponent,
    SpinnerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './metals.component.html',
  styleUrl: './metals.component.scss',
})
export class MetalsComponent {
  private readonly metalApi = inject(MetalService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.METAL_MANAGE));
  protected readonly canPublish = computed(() =>
    this.auth.hasPermission(Permission.METAL_RATE_PUBLISH),
  );

  protected readonly rateTypes = RATE_TYPES;

  protected readonly tab = signal<Tab>('rates');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'rates', label: 'Rate board' },
    { id: 'metals', label: 'Metals' },
    { id: 'purities', label: 'Purities' },
  ];

  protected readonly metals = signal<readonly Metal[]>([]);
  protected readonly purities = signal<readonly Purity[]>([]);
  /** Purities are listed per metal, so the screen keeps a chosen metal. */
  protected readonly purityMetalId = signal('');

  protected readonly rates = signal<PageResponse<MetalRate>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  // Matches the default tab. Sorting a rate query by a column that only exists
  // on the metal tables makes the backend reject the whole request.
  protected readonly sort = signal<TableSort | null>({
    field: 'effectiveDate',
    direction: 'desc',
  });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  // Rate-board filters.
  protected readonly rateMetalId = signal('');
  protected readonly ratePurityId = signal('');
  protected readonly rateTypeFilter = signal<RateType | ''>('');

  protected readonly editing = signal<Metal | Purity | 'new' | null>(null);
  protected readonly publishing = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly metalStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Metal>>>('metalStatusCell');
  private readonly purityStatusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Purity>>>('purityStatusCell');
  private readonly purityFinenessTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Purity>>>('finenessCell');
  private readonly rateTypeTpl =
    viewChild.required<TemplateRef<CellTemplateContext<MetalRate>>>('rateTypeCell');
  private readonly ratePublishedTpl =
    viewChild.required<TemplateRef<CellTemplateContext<MetalRate>>>('publishedCell');

  protected readonly metalTemplates = computed(() => ({ active: this.metalStatusTpl() }));
  protected readonly purityTemplates = computed(() => ({
    active: this.purityStatusTpl(),
    fineness: this.purityFinenessTpl(),
  }));
  protected readonly rateTemplates = computed(() => ({
    rateType: this.rateTypeTpl(),
    publishedAt: this.ratePublishedTpl(),
  }));

  protected readonly metalForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    symbol: ['', [Validators.maxLength(10)]],
    weightUnit: ['g', [Validators.maxLength(10)]],
    description: ['', [Validators.maxLength(255)]],
  });

  protected readonly purityForm = this.fb.nonNullable.group({
    metalId: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(50)]],
    fineness: [
      null as number | null,
      [Validators.required, Validators.min(0.0001), Validators.max(1)],
    ],
    displayOrder: [null as number | null],
  });

  protected readonly rateForm = this.fb.nonNullable.group({
    metalId: ['', [Validators.required]],
    purityId: ['', [Validators.required]],
    rateType: ['SELLING' as RateType, [Validators.required]],
    effectiveDate: [today(), [Validators.required]],
    ratePerUnit: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    currency: ['INR', [Validators.minLength(3), Validators.maxLength(3)]],
    notes: ['', [Validators.maxLength(255)]],
  });

  /** Purities of the metal chosen in the publish form, loaded on demand. */
  protected readonly publishPurities = signal<readonly Purity[]>([]);

  protected readonly metalColumns: readonly TableColumn<Metal>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '140px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Metal', sortable: true, value: (row) => row.name },
    {
      key: 'symbol',
      header: 'Symbol',
      align: 'center',
      width: '100px',
      value: (row) => row.symbol,
    },
    {
      key: 'weightUnit',
      header: 'Unit',
      align: 'center',
      width: '90px',
      value: (row) => row.weightUnit,
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      value: (row) => row.description,
    },
    { key: 'active', header: 'Status', width: '120px' },
  ];

  protected readonly purityColumns: readonly TableColumn<Purity>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '140px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Purity', sortable: true, value: (row) => row.name },
    { key: 'fineness', header: 'Fineness', align: 'end', numeric: true, width: '160px' },
    {
      key: 'displayOrder',
      header: 'Order',
      numeric: true,
      align: 'end',
      width: '90px',
      sortable: true,
      value: (row) => row.displayOrder,
    },
    { key: 'active', header: 'Status', width: '120px' },
  ];

  protected readonly rateColumns: readonly TableColumn<MetalRate>[] = [
    {
      key: 'effectiveDate',
      header: 'Effective from',
      mono: true,
      width: '150px',
      value: (row) => row.effectiveDate,
    },
    {
      key: 'metalCode',
      header: 'Metal',
      mono: true,
      width: '120px',
      value: (row) => row.metalCode,
    },
    {
      key: 'purityCode',
      header: 'Purity',
      mono: true,
      width: '110px',
      value: (row) => row.purityCode,
    },
    { key: 'rateType', header: 'Side', width: '120px' },
    {
      key: 'ratePerUnit',
      header: 'Rate per unit',
      numeric: true,
      align: 'end',
      width: '160px',
      value: (row) => row.ratePerUnit,
    },
    {
      key: 'currency',
      header: 'Currency',
      align: 'center',
      width: '110px',
      value: (row) => row.currency,
    },
    { key: 'publishedAt', header: 'Published', hideOnMobile: true, width: '190px' },
    { key: 'notes', header: 'Notes', hideOnMobile: true, value: (row) => row.notes },
  ];

  protected readonly metalPage = computed(() =>
    localPage(this.metals(), {
      search: this.search(),
      searchFields: [(row) => row.code, (row) => row.name, (row) => row.symbol],
      sort: this.sort(),
      page: this.page(),
      size: this.size(),
    }),
  );

  protected readonly purityPage = computed(() =>
    this.purityMetalId()
      ? localPage(this.purities(), {
          search: this.search(),
          searchFields: [(row) => row.code, (row) => row.name],
          sort: this.sort(),
          page: this.page(),
          size: this.size(),
        })
      : emptyPage<Purity>(this.size()),
  );

  protected readonly activeFilterCount = computed(
    () =>
      (this.rateMetalId() ? 1 : 0) +
      (this.ratePurityId() ? 1 : 0) +
      (this.rateTypeFilter() ? 1 : 0),
  );

  /** Purities offered by the rate filter, narrowed to the chosen metal. */
  protected readonly filterPurities = signal<readonly Purity[]>([]);

  protected readonly trackById = (row: { id: string }) => row.id;

  constructor() {
    this.loadMetals();
    this.loadRates();
  }

  protected metalName(id: string): string {
    return this.metals().find((metal) => metal.id === id)?.name ?? '—';
  }

  protected loadMetals(refresh = true): void {
    this.loading.set(true);
    this.metalApi.listMetals(refresh).subscribe({
      next: (metals) => {
        this.metals.set(metals);
        this.loading.set(false);
        if (!this.purityMetalId() && metals.length > 0) {
          this.purityMetalId.set(metals[0].id);
        }
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected loadPurities(): void {
    const metalId = this.purityMetalId();
    if (!metalId) {
      this.purities.set([]);
      return;
    }
    this.loading.set(true);
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => {
        this.purities.set(purities);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.purities.set([]);
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  protected loadRates(): void {
    this.loading.set(true);
    this.error.set(null);
    this.metalApi
      .searchRates({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        metalId: this.rateMetalId() || null,
        purityId: this.ratePurityId() || null,
        rateType: this.rateTypeFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.rates.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => {
          this.rates.set(emptyPage(this.size()));
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
    this.publishing.set(false);
    this.sort.set(
      tab === 'rates'
        ? { field: 'effectiveDate', direction: 'desc' }
        : { field: 'name', direction: 'asc' },
    );
    if (tab === 'purities') {
      this.loadPurities();
    } else if (tab === 'rates') {
      this.loadRates();
    }
  }

  protected onPurityMetalChange(event: Event): void {
    this.purityMetalId.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.loadPurities();
  }

  protected onRateMetalFilter(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.rateMetalId.set(metalId);
    this.ratePurityId.set('');
    this.filterPurities.set([]);
    if (metalId) {
      this.metalApi.listPurities(metalId).subscribe({
        next: (purities) => this.filterPurities.set(purities),
        error: () => this.filterPurities.set([]),
      });
    }
    this.page.set(0);
    this.loadRates();
  }

  protected onRatePurityFilter(event: Event): void {
    this.ratePurityId.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.loadRates();
  }

  protected onRateTypeFilter(event: Event): void {
    this.rateTypeFilter.set((event.target as HTMLSelectElement).value as RateType | '');
    this.page.set(0);
    this.loadRates();
  }

  protected clearRateFilters(): void {
    this.rateMetalId.set('');
    this.ratePurityId.set('');
    this.rateTypeFilter.set('');
    this.filterPurities.set([]);
    this.page.set(0);
    this.loadRates();
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
  }

  protected onSort(sort: TableSort): void {
    this.sort.set(sort);
    this.page.set(0);
    if (this.tab() === 'rates') {
      this.loadRates();
    }
  }

  protected onPage(page: number): void {
    this.page.set(page);
    if (this.tab() === 'rates') {
      this.loadRates();
    }
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    if (this.tab() === 'rates') {
      this.loadRates();
    }
  }

  // ---------- metals and purities ----------

  protected startCreate(): void {
    this.resetForms();
    if (this.tab() === 'purities') {
      this.purityForm.patchValue({ metalId: this.purityMetalId() });
    }
    this.editing.set('new');
  }

  protected startEdit(row: Metal | Purity): void {
    this.resetForms();

    if (this.tab() === 'metals') {
      const metal = row as Metal;
      this.metalForm.patchValue({
        code: metal.code,
        name: metal.name,
        symbol: metal.symbol ?? '',
        weightUnit: metal.weightUnit ?? '',
        description: metal.description ?? '',
      });
      if (!this.canManage()) {
        this.metalForm.disable();
      }
    } else {
      const purity = row as Purity;
      this.purityForm.patchValue({
        metalId: purity.metalId,
        code: purity.code,
        name: purity.name,
        fineness: purity.fineness,
        displayOrder: purity.displayOrder,
      });
      this.purityForm.controls.metalId.disable();
      if (!this.canManage()) {
        this.purityForm.disable();
      }
    }

    this.editing.set(row);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    const target = this.editing();
    if (!target || !this.canManage()) {
      return;
    }

    if (this.tab() === 'metals') {
      if (this.metalForm.invalid) {
        touchAll(this.metalForm);
        return;
      }
      const request = nullifyBlanks(this.metalForm.getRawValue()) as unknown as MetalRequest;
      const call =
        target === 'new'
          ? this.metalApi.createMetal(request)
          : this.metalApi.updateMetal((target as Metal).id, request);

      this.saving.set(true);
      call.subscribe({
        next: (metal) => {
          this.saving.set(false);
          this.editing.set(null);
          this.toast.success(target === 'new' ? 'Metal created' : 'Metal updated', metal.name);
          this.loadMetals();
        },
        error: (error: AppError) => this.onSaveFailed(error, this.metalForm),
      });
      return;
    }

    if (this.purityForm.invalid) {
      touchAll(this.purityForm);
      return;
    }
    const request = nullifyBlanks(this.purityForm.getRawValue()) as unknown as PurityRequest;
    const call =
      target === 'new'
        ? this.metalApi.createPurity(request)
        : this.metalApi.updatePurity((target as Purity).id, request);

    this.saving.set(true);
    call.subscribe({
      next: (purity) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(target === 'new' ? 'Purity created' : 'Purity updated', purity.name);
        this.loadPurities();
      },
      error: (error: AppError) => this.onSaveFailed(error, this.purityForm),
    });
  }

  // ---------- publishing a rate ----------

  protected startPublish(): void {
    this.rateForm.enable();
    this.rateForm.reset({
      metalId: this.rateMetalId() || this.metals()[0]?.id || '',
      purityId: '',
      rateType: 'SELLING',
      effectiveDate: today(),
      currency: 'INR',
      ratePerUnit: null,
      notes: '',
    });
    this.publishPurities.set([]);
    this.submitted.set(false);
    this.formError.set(null);
    this.publishing.set(true);
    this.loadPublishPurities(this.rateForm.controls.metalId.value);
  }

  protected onPublishMetalChange(event: Event): void {
    const metalId = (event.target as HTMLSelectElement).value;
    this.rateForm.patchValue({ purityId: '' });
    this.loadPublishPurities(metalId);
  }

  private loadPublishPurities(metalId: string): void {
    if (!metalId) {
      this.publishPurities.set([]);
      return;
    }
    this.metalApi.listPurities(metalId).subscribe({
      next: (purities) => this.publishPurities.set(purities),
      error: () => this.publishPurities.set([]),
    });
  }

  protected cancelPublish(): void {
    this.publishing.set(false);
  }

  protected publish(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.rateForm.invalid) {
      touchAll(this.rateForm);
      return;
    }

    const request = nullifyBlanks(this.rateForm.getRawValue()) as unknown as PublishRateRequest;
    this.saving.set(true);
    this.metalApi.publishRate({ ...request, branchId: null }).subscribe({
      next: (rate) => {
        this.saving.set(false);
        this.publishing.set(false);
        this.toast.success(
          'Rate published',
          `${rate.metalCode} ${rate.purityCode} — ${rate.ratePerUnit} from ${rate.effectiveDate}`,
        );
        this.page.set(0);
        this.loadRates();
      },
      error: (error: AppError) => this.onSaveFailed(error, this.rateForm),
    });
  }

  private onSaveFailed(error: AppError, form: Parameters<typeof applyServerErrors>[0]): void {
    this.saving.set(false);
    const unmatched = applyServerErrors(form, error);
    this.formError.set(unmatched[0] ?? error.message);
  }

  private resetForms(): void {
    for (const form of [this.metalForm, this.purityForm]) {
      form.enable();
      form.reset();
    }
    this.metalForm.patchValue({ weightUnit: 'g' });
    this.submitted.set(false);
    this.formError.set(null);
  }
}
