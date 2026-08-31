import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { UserStatus } from '../../../core/models/auth.model';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import {
  CreateUserRequest,
  Role,
  UpdateUserRequest,
  User,
  USER_STATUSES,
} from '../../../core/models/identity.model';
import { Branch } from '../../../core/models/organization.model';
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
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { applyServerErrors, nullifyBlanks, touchAll } from '../../../shared/utilities/form.utils';
import { OrganizationService } from '../../organization/organization.service';
import { IdentityService } from '../identity.service';

/**
 * Staff accounts: identity, the roles they hold and the branches they may work
 * in.
 *
 * The backend returns a user's roles as *codes*, so the editor resolves them
 * against the role catalogue to pre-tick the right boxes and sends ids back.
 */
@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    DataTableComponent,
    CellDefDirective,
    DrawerComponent,
    FilterPanelComponent,
    FormFieldComponent,
    ModalComponent,
    PaginationComponent,
    SearchBoxComponent,
    SpinnerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  private readonly identity = inject(IdentityService);
  private readonly organization = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.USER_MANAGE));
  protected readonly statuses = USER_STATUSES;

  protected readonly roles = signal<readonly Role[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly result = signal<PageResponse<User>>(emptyPage(environment.defaultPageSize));
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly branchFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'username', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly activeFilterCount = computed(() => (this.branchFilter() ? 1 : 0));

  protected readonly editing = signal<User | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  /** Role and branch ids ticked in the editor. */
  protected readonly selectedRoles = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedBranches = signal<ReadonlySet<string>>(new Set());

  protected readonly resetTarget = signal<User | null>(null);
  protected readonly resetting = signal(false);
  protected readonly resetSubmitted = signal(false);
  protected readonly resetError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30)]],
    employeeCode: ['', [Validators.maxLength(50)]],
    status: ['ACTIVE' as UserStatus, [Validators.required]],
    primaryBranchId: [''],
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
    mustChangePassword: [true],
  });

  protected readonly columns: readonly TableColumn<User>[] = [
    { key: 'fullName', header: 'Name', sortable: true, sortField: 'fullName' },
    {
      key: 'employeeCode',
      header: 'Employee ID',
      mono: true,
      hideOnMobile: true,
      value: (row) => row.employeeCode,
    },
    { key: 'contact', header: 'Contact', hideOnMobile: true },
    { key: 'roles', header: 'Roles' },
    { key: 'primaryBranchId', header: 'Branch', hideOnMobile: true },
    { key: 'status', header: 'Status', width: '120px' },
    { key: 'lastLoginAt', header: 'Last login', hideOnMobile: true, width: '150px' },
    { key: 'actions', header: '', width: '190px', align: 'end' },
  ];

  protected readonly trackById = (row: User) => row.id;

  constructor() {
    this.identity.listRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([]),
    });
    this.organization.listAllBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.load();
  }

  protected branchName(id: string | null): string {
    if (!id) {
      return '—';
    }
    return this.branches().find((branch) => branch.id === id)?.name ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.identity
      .searchUsers({
        page: this.page(),
        size: this.size(),
        sort: toSortParam(this.sort()),
        search: this.search() || null,
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

  protected onBranchFilter(event: Event): void {
    this.branchFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
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

  // ---------- role and branch assignment ----------

  protected toggleRole(roleId: string): void {
    this.selectedRoles.update((current) => toggle(current, roleId));
  }

  protected toggleBranch(branchId: string): void {
    this.selectedBranches.update((current) => toggle(current, branchId));
  }

  protected isRoleSelected(roleId: string): boolean {
    return this.selectedRoles().has(roleId);
  }

  protected isBranchSelected(branchId: string): boolean {
    return this.selectedBranches().has(branchId);
  }

  /** Branches offered as "primary": those the user is assigned to. */
  protected readonly primaryBranchOptions = computed(() => {
    const assigned = this.selectedBranches();
    return assigned.size === 0
      ? this.branches()
      : this.branches().filter((branch) => assigned.has(branch.id));
  });

  // ---------- editing ----------

  protected startCreate(): void {
    this.resetEditor();
    this.form.controls.password.enable();
    this.editing.set('new');
  }

  protected startEdit(user: User): void {
    this.resetEditor();

    // Roles arrive as codes; map them back onto catalogue ids.
    const roleIds = this.roles()
      .filter((role) => user.roles.includes(role.code))
      .map((role) => role.id);
    this.selectedRoles.set(new Set(roleIds));
    this.selectedBranches.set(new Set(user.branchIds ?? []));

    this.form.patchValue({
      username: user.username,
      fullName: user.fullName,
      email: user.email ?? '',
      phone: user.phone ?? '',
      employeeCode: user.employeeCode ?? '',
      status: user.status,
      primaryBranchId: user.primaryBranchId ?? '',
    });

    // Username and password are set at creation only.
    this.form.controls.username.disable();
    this.form.controls.password.disable();
    if (!this.canManage()) {
      this.form.disable();
    }
    this.editing.set(user);
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

    if (this.selectedRoles().size === 0) {
      this.formError.set('Assign at least one role.');
      return;
    }

    const value = nullifyBlanks(this.form.getRawValue());
    const roleIds = [...this.selectedRoles()];
    const branchIds = [...this.selectedBranches()];

    this.saving.set(true);

    if (target === 'new') {
      const request: CreateUserRequest = {
        username: value.username,
        password: value.password,
        fullName: value.fullName,
        email: value.email,
        phone: value.phone,
        employeeCode: value.employeeCode,
        primaryBranchId: value.primaryBranchId,
        roleIds,
        branchIds,
      };
      this.identity.createUser(request).subscribe({
        next: (user) => this.onSaved(user, 'User created'),
        error: (error: AppError) => this.onSaveFailed(error),
      });
      return;
    }

    const request: UpdateUserRequest = {
      fullName: value.fullName,
      email: value.email,
      phone: value.phone,
      employeeCode: value.employeeCode,
      status: value.status,
      primaryBranchId: value.primaryBranchId,
      roleIds,
      branchIds,
    };
    this.identity.updateUser(target.id, request).subscribe({
      next: (user) => this.onSaved(user, 'User updated'),
      error: (error: AppError) => this.onSaveFailed(error),
    });
  }

  protected async deactivate(user: User): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Deactivate user',
      message: 'The account can no longer sign in. Its history and audit trail are kept.',
      detail: `${user.fullName} (${user.username})`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.identity.deactivateUser(user.id).subscribe({
      next: () => {
        this.toast.success('User deactivated', user.fullName);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not deactivate user', error.message),
    });
  }

  // ---------- password reset ----------

  protected startReset(user: User): void {
    this.resetForm.reset({ mustChangePassword: true, newPassword: '' });
    this.resetSubmitted.set(false);
    this.resetError.set(null);
    this.resetTarget.set(user);
  }

  protected cancelReset(): void {
    this.resetTarget.set(null);
  }

  protected submitReset(): void {
    this.resetSubmitted.set(true);
    this.resetError.set(null);

    const user = this.resetTarget();
    if (!user) {
      return;
    }
    if (this.resetForm.invalid) {
      touchAll(this.resetForm);
      return;
    }

    this.resetting.set(true);
    this.identity.resetPassword(user.id, this.resetForm.getRawValue()).subscribe({
      next: () => {
        this.resetting.set(false);
        this.resetTarget.set(null);
        this.toast.success(
          'Password reset',
          `Share the new password with ${user.fullName} over a secure channel.`,
        );
      },
      error: (error: AppError) => {
        this.resetting.set(false);
        const unmatched = applyServerErrors(this.resetForm, error);
        this.resetError.set(unmatched[0] ?? error.message);
      },
    });
  }

  private onSaved(user: User, title: string): void {
    this.saving.set(false);
    this.editing.set(null);
    this.toast.success(title, `${user.fullName} (${user.username})`);
    this.load();
  }

  private onSaveFailed(error: AppError): void {
    this.saving.set(false);
    const unmatched = applyServerErrors(this.form, error);
    this.formError.set(unmatched[0] ?? error.message);
  }

  private resetEditor(): void {
    this.form.enable();
    this.form.reset({ status: 'ACTIVE', primaryBranchId: '' });
    this.selectedRoles.set(new Set());
    this.selectedBranches.set(new Set());
    this.submitted.set(false);
    this.formError.set(null);
  }
}

function toggle(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current);
  if (!next.delete(id)) {
    next.add(id);
  }
  return next;
}
