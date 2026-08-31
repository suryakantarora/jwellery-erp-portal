import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import { Branch, BranchRequest, Company } from '../../../core/models/organization.model';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellDefDirective,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import {
  TableColumn,
  TableSort,
  toSortParam,
} from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { FilterPanelComponent } from '../../../shared/components/filter-panel/filter-panel.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { OrganizationService } from '../organization.service';

/**
 * Branch master — showrooms, warehouses and the head office.
 *
 * `/branches` is server-paged, so search, sort and paging all round-trip.
 * A branch cannot be moved between companies once created, which the edit form
 * reflects by locking the company field.
 */
@Component({
  selector: 'app-branches',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    DataTableComponent,
    CellDefDirective,
    DrawerComponent,
    FilterPanelComponent,
    FormFieldComponent,
    PaginationComponent,
    SearchBoxComponent,
    SpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './branches.component.html',
})
export class BranchesComponent {
  private readonly organization = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.ORGANIZATION_MANAGE),
  );

  protected readonly companies = signal<readonly Company[]>([]);
  protected readonly result = signal<PageResponse<Branch>>(emptyPage(environment.defaultPageSize));
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly companyFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'code', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly activeFilterCount = computed(() => (this.companyFilter() ? 1 : 0));

  protected readonly editing = signal<Branch | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    companyId: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    headOffice: [false],
    addressLine: ['', [Validators.maxLength(255)]],
    city: ['', [Validators.maxLength(100)]],
    country: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    timezone: ['', [Validators.maxLength(50)]],
  });

  protected readonly columns: readonly TableColumn<Branch>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '140px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Branch', sortable: true },
    { key: 'companyId', header: 'Company', hideOnMobile: true },
    { key: 'city', header: 'City', sortable: true, hideOnMobile: true, value: (row) => row.city },
    { key: 'phone', header: 'Phone', hideOnMobile: true, value: (row) => row.phone },
    { key: 'status', header: 'Status', width: '120px' },
    { key: 'actions', header: '', width: '150px', align: 'end' },
  ];

  protected readonly trackById = (row: Branch) => row.id;

  constructor() {
    this.organization.listCompanies().subscribe({
      next: (companies) => this.companies.set(companies),
      error: () => this.companies.set([]),
    });
    this.load();
  }

  protected companyName(id: string): string {
    return this.companies().find((company) => company.id === id)?.name ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.organization
      .searchBranches({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
        companyId: this.companyFilter() || null,
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

  protected onCompanyFilter(event: Event): void {
    this.companyFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.companyFilter.set('');
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
    this.resetForm();
    this.form.patchValue({ companyId: this.companyFilter() || this.companies()[0]?.id || '' });
    this.editing.set('new');
  }

  protected startEdit(branch: Branch): void {
    this.resetForm();
    this.form.patchValue({
      companyId: branch.companyId,
      code: branch.code,
      name: branch.name,
      headOffice: branch.headOffice,
      addressLine: branch.addressLine ?? '',
      city: branch.city ?? '',
      country: branch.country ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      timezone: branch.timezone ?? '',
    });
    // The backend rejects a company change on update, so the field is locked.
    this.form.controls.companyId.disable();
    if (!this.canManage()) {
      this.form.disable();
    }
    this.editing.set(branch);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const target = this.editing();
    if (!target) {
      return;
    }

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as BranchRequest;
    const call =
      target === 'new'
        ? this.organization.createBranch(request)
        : this.organization.updateBranch(target.id, request);

    this.saving.set(true);
    call.subscribe({
      next: (branch) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(
          target === 'new' ? 'Branch created' : 'Branch updated',
          `${branch.code} — ${branch.name}`,
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

  protected async deactivate(branch: Branch): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Deactivate branch',
      message:
        'The branch stops being available for new activity. Its history and stock records are kept.',
      detail: `${branch.code} — ${branch.name}`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.organization.deactivateBranch(branch.id).subscribe({
      next: () => {
        this.toast.success('Branch deactivated', branch.name);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not deactivate branch', error.message),
    });
  }

  private resetForm(): void {
    this.form.enable();
    this.form.reset({ headOffice: false });
    this.submitted.set(false);
    this.formError.set(null);
  }
}
