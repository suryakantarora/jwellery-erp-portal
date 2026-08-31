import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage } from '../../../core/models/api.model';
import { Company, CompanyRequest } from '../../../core/models/organization.model';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import {
  CellDefDirective,
  DataTableComponent,
} from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableSort } from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { localPage } from '../../../shared/utilities/list.utils';
import { OrganizationService } from '../organization.service';

/**
 * Company master.
 *
 * `/companies` returns the whole list rather than a page — an organisation has
 * a handful of legal entities — so search, sort and paging run in the browser
 * against the loaded rows.
 */
@Component({
  selector: 'app-companies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    DataTableComponent,
    CellDefDirective,
    DrawerComponent,
    FormFieldComponent,
    PaginationComponent,
    SearchBoxComponent,
    SpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent {
  private readonly organization = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() =>
    this.auth.hasPermission(Permission.ORGANIZATION_MANAGE),
  );

  private readonly all = signal<readonly Company[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'name', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  /** Editing target: a company, `'new'`, or null when the drawer is closed. */
  protected readonly editing = signal<Company | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    legalName: ['', [Validators.maxLength(200)]],
    taxNumber: ['', [Validators.maxLength(50)]],
    registrationNumber: ['', [Validators.maxLength(50)]],
    baseCurrency: ['', [Validators.minLength(3), Validators.maxLength(3)]],
    addressLine: ['', [Validators.maxLength(255)]],
    city: ['', [Validators.maxLength(100)]],
    country: ['', [Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
  });

  protected readonly result = computed(() =>
    this.error()
      ? emptyPage<Company>(this.size())
      : localPage(this.all(), {
          search: this.search(),
          searchFields: [
            (row) => row.code,
            (row) => row.name,
            (row) => row.legalName,
            (row) => row.taxNumber,
            (row) => row.city,
          ],
          sort: this.sort(),
          page: this.page(),
          size: this.size(),
        }),
  );

  protected readonly columns: readonly TableColumn<Company>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '140px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Company', sortable: true },
    {
      key: 'taxNumber',
      header: 'Tax number',
      mono: true,
      hideOnMobile: true,
      value: (row) => row.taxNumber,
    },
    {
      key: 'baseCurrency',
      header: 'Currency',
      align: 'center',
      width: '110px',
      value: (row) => row.baseCurrency,
    },
    { key: 'city', header: 'City', hideOnMobile: true, sortable: true, value: (row) => row.city },
    { key: 'status', header: 'Status', width: '120px' },
    { key: 'actions', header: '', width: '90px', align: 'end' },
  ];

  protected readonly trackById = (row: Company) => row.id;

  constructor() {
    this.load();
  }

  protected load(refresh = true): void {
    this.loading.set(true);
    this.error.set(null);
    this.organization.listCompanies(refresh).subscribe({
      next: (companies) => {
        this.all.set(companies);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
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
    this.resetForm();
    this.editing.set('new');
  }

  protected startEdit(company: Company): void {
    this.resetForm();
    this.form.patchValue({
      code: company.code,
      name: company.name,
      legalName: company.legalName ?? '',
      taxNumber: company.taxNumber ?? '',
      registrationNumber: company.registrationNumber ?? '',
      baseCurrency: company.baseCurrency ?? '',
      addressLine: company.addressLine ?? '',
      city: company.city ?? '',
      country: company.country ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
    });
    if (!this.canManage()) {
      this.form.disable();
    }
    this.editing.set(company);
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

    const request = nullifyBlanks(this.form.getRawValue()) as unknown as CompanyRequest;
    const call =
      target === 'new'
        ? this.organization.createCompany(request)
        : this.organization.updateCompany(target.id, request);

    this.saving.set(true);
    call.subscribe({
      next: (company) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(
          target === 'new' ? 'Company created' : 'Company updated',
          `${company.code} — ${company.name}`,
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

  private resetForm(): void {
    this.form.enable();
    this.form.reset();
    this.submitted.set(false);
    this.formError.set(null);
  }
}
