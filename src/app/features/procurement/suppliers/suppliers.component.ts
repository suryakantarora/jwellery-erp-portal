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
  SUPPLIER_STATUSES,
  Supplier,
  SupplierRequest,
  SupplierStatus,
} from '../../../core/models/procurement.model';
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
import { ProcurementService } from '../procurement.service';

/**
 * Supplier master.
 *
 * A row opens the supplier's own page, where contacts, bank details and trading
 * history live; the drawer here creates one.
 */
@Component({
  selector: 'app-suppliers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MasterPanelComponent, FormFieldComponent, StatusBadgeComponent],
  templateUrl: './suppliers.component.html',
})
export class SuppliersComponent {
  private readonly procurement = inject(ProcurementService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.SUPPLIER_MANAGE),
  );
  protected readonly statuses = SUPPLIER_STATUSES;

  protected readonly result = signal<PageResponse<Supplier>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<SupplierStatus | ''>('');
  protected readonly sort = signal<TableSort | null>({ field: 'name', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly nameTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Supplier>>>('nameCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Supplier>>>('statusCell');
  private readonly termsTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Supplier>>>('termsCell');
  protected readonly templates = computed(() => ({
    name: this.nameTpl(),
    status: this.statusTpl(),
    paymentTermsDays: this.termsTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    legalName: ['', [Validators.maxLength(200)]],
    taxNumber: ['', [Validators.maxLength(50)]],
    supplierType: ['', [Validators.maxLength(30)]],
    addressLine: ['', [Validators.maxLength(255)]],
    city: ['', [Validators.maxLength(100)]],
    country: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    currency: ['INR', [Validators.minLength(3), Validators.maxLength(3)]],
    paymentTermsDays: [null as number | null, [Validators.min(0)]],
    creditLimit: [null as number | null, [Validators.min(0)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  protected readonly columns: readonly TableColumn<Supplier>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Supplier', sortable: true },
    { key: 'city', header: 'City', hideOnMobile: true, value: (row) => row.city },
    { key: 'phone', header: 'Phone', hideOnMobile: true, value: (row) => row.phone },
    { key: 'paymentTermsDays', header: 'Terms', width: '160px' },
    {
      key: 'creditLimit',
      header: 'Credit limit',
      numeric: true,
      align: 'end',
      width: '140px',
      value: (row) => row.creditLimit,
    },
    { key: 'status', header: 'Status', width: '120px' },
  ];

  protected readonly trackById = (row: Supplier) => row.id;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.procurement
      .searchSuppliers({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
        status: this.statusFilter() || null,
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

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as SupplierStatus | '');
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.statusFilter.set('');
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

  protected open(supplier: Supplier): void {
    void this.router.navigate(['/procurement/suppliers', supplier.id]);
  }

  protected startCreate(): void {
    this.form.enable();
    this.form.reset({ currency: 'INR' });
    this.submitted.set(false);
    this.formError.set(null);
    this.creating.set(true);
  }

  protected close(): void {
    this.creating.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as SupplierRequest;
    this.saving.set(true);
    this.procurement.createSupplier(request).subscribe({
      next: (supplier) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Supplier created', `${supplier.code} — ${supplier.name}`);
        void this.router.navigate(['/procurement/suppliers', supplier.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }
}
