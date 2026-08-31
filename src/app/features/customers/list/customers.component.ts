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
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  Customer,
  CustomerRequest,
  CustomerStatus,
  CustomerType,
  KYC_STATUSES,
  KycStatus,
} from '../../../core/models/customer.model';
import { Branch } from '../../../core/models/organization.model';
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
import { OrganizationService } from '../../organization/organization.service';
import { CustomerService } from '../customer.service';

/**
 * The customer register.
 *
 * A row opens the customer's 360 profile — at a counter, what is wanted is the
 * whole relationship, not a form.
 */
@Component({
  selector: 'app-customers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MasterPanelComponent, FormFieldComponent, StatusBadgeComponent],
  templateUrl: './customers.component.html',
})
export class CustomersComponent {
  private readonly customers = inject(CustomerService);
  private readonly organization = inject(OrganizationService);
  private readonly branchContext = inject(BranchContextService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.CUSTOMER_MANAGE),
  );

  protected readonly customerTypes = CUSTOMER_TYPES;
  protected readonly statuses = CUSTOMER_STATUSES;
  protected readonly kycStatuses = KYC_STATUSES;

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly result = signal<PageResponse<Customer>>(
    emptyPage(environment.defaultPageSize),
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<CustomerStatus | ''>('');
  protected readonly kycFilter = signal<KycStatus | ''>('');
  protected readonly branchFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'fullName', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly nameTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Customer>>>('nameCell');
  private readonly kycTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Customer>>>('kycCell');
  private readonly statusTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Customer>>>('statusCell');
  private readonly datesTpl =
    viewChild.required<TemplateRef<CellTemplateContext<Customer>>>('datesCell');
  protected readonly templates = computed(() => ({
    fullName: this.nameTpl(),
    kycStatus: this.kycTpl(),
    status: this.statusTpl(),
    dateOfBirth: this.datesTpl(),
  }));

  protected readonly form = this.fb.nonNullable.group({
    customerCode: [''],
    customerType: ['INDIVIDUAL' as CustomerType],
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    companyName: ['', [Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    alternatePhone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    dateOfBirth: [''],
    anniversaryDate: [''],
    gender: [''],
    taxNumber: ['', [Validators.maxLength(50)]],
    registeredBranchId: [''],
    notes: ['', [Validators.maxLength(500)]],
  });

  protected readonly columns: readonly TableColumn<Customer>[] = [
    {
      key: 'customerCode',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '150px',
      value: (row) => row.customerCode,
    },
    { key: 'fullName', header: 'Customer', sortable: true },
    { key: 'phone', header: 'Phone', mono: true, width: '160px', value: (row) => row.phone },
    { key: 'email', header: 'Email', hideOnMobile: true, value: (row) => row.email },
    { key: 'dateOfBirth', header: 'Dates', hideOnMobile: true, width: '170px' },
    { key: 'kycStatus', header: 'KYC', width: '130px' },
    { key: 'status', header: 'Status', width: '130px' },
  ];

  protected readonly activeFilterCount = computed(
    () =>
      (this.statusFilter() ? 1 : 0) + (this.kycFilter() ? 1 : 0) + (this.branchFilter() ? 1 : 0),
  );

  protected readonly trackById = (row: Customer) => row.id;

  constructor() {
    this.organization.listAllBranches().subscribe({ next: (r) => this.branches.set(r) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.customers
      .search({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
        status: this.statusFilter() || null,
        kycStatus: this.kycFilter() || null,
        branchId: this.branchFilter() || null,
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

  protected onFilter(which: 'status' | 'kyc' | 'branch', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    ({
      status: () => this.statusFilter.set(value as CustomerStatus | ''),
      kyc: () => this.kycFilter.set(value as KycStatus | ''),
      branch: () => this.branchFilter.set(value),
    })[which]();
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.statusFilter.set('');
    this.kycFilter.set('');
    this.branchFilter.set('');
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

  protected open(customer: Customer): void {
    void this.router.navigate(['/customers', customer.id]);
  }

  protected startCreate(): void {
    this.form.reset({
      customerType: 'INDIVIDUAL',
      registeredBranchId: this.branchContext.activeBranchId() ?? '',
    });
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

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as CustomerRequest;
    this.saving.set(true);
    this.customers.create(request).subscribe({
      next: (customer) => {
        this.saving.set(false);
        this.creating.set(false);
        this.toast.success('Customer created', `${customer.customerCode} — ${customer.fullName}`);
        void this.router.navigate(['/customers', customer.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.formError.set(unmatched[0] ?? error.message);
      },
    });
  }
}
