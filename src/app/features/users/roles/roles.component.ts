import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError, emptyPage } from '../../../core/models/api.model';
import { PermissionDefinition, Role, RoleRequest } from '../../../core/models/identity.model';
import { ConfirmService } from '../../../shared/components/confirm-dialog/confirm.service';
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
import { IdentityService } from '../identity.service';
import { groupPermissions, PermissionGroup } from '../permission-groups';

/**
 * Role master and the permission matrix that defines each role.
 *
 * Permissions are grouped by the module the backend reports, so the matrix
 * follows whatever catalogue the server actually enforces rather than a list
 * hard-coded in the portal.
 */
@Component({
  selector: 'app-roles',
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
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent {
  private readonly identity = inject(IdentityService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly canManage = computed(() => this.auth.hasPermission(Permission.ROLE_MANAGE));

  private readonly all = signal<readonly Role[]>([]);
  protected readonly catalogue = signal<readonly PermissionDefinition[]>([]);
  protected readonly groups = computed<readonly PermissionGroup[]>(() =>
    groupPermissions(this.catalogue()),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly search = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'name', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);

  protected readonly editing = signal<Role | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
  });

  protected readonly result = computed(() =>
    this.error()
      ? emptyPage<Role>(this.size())
      : localPage(this.all(), {
          search: this.search(),
          searchFields: [(row) => row.code, (row) => row.name, (row) => row.description],
          sort: this.sort(),
          sortValues: { permissions: (row) => row.permissions.length },
          page: this.page(),
          size: this.size(),
        }),
  );

  protected readonly columns: readonly TableColumn<Role>[] = [
    {
      key: 'code',
      header: 'Code',
      mono: true,
      sortable: true,
      width: '180px',
      value: (row) => row.code,
    },
    { key: 'name', header: 'Role', sortable: true },
    {
      key: 'permissions',
      header: 'Permissions',
      numeric: true,
      align: 'end',
      sortable: true,
      width: '130px',
    },
    { key: 'systemRole', header: 'Type', width: '130px' },
    { key: 'actions', header: '', width: '150px', align: 'end' },
  ];

  protected readonly trackById = (row: Role) => row.id;

  /** Permission ids ticked, counted per group for the matrix header. */
  protected selectedInGroup(group: PermissionGroup): number {
    const chosen = this.selected();
    return group.permissions.filter((permission) => chosen.has(permission.id)).length;
  }

  protected isSelected(permissionId: string): boolean {
    return this.selected().has(permissionId);
  }

  constructor() {
    this.identity.listPermissions().subscribe({
      next: (permissions) => this.catalogue.set(permissions),
      error: () => this.catalogue.set([]),
    });
    this.load();
  }

  protected load(refresh = true): void {
    this.loading.set(true);
    this.error.set(null);
    this.identity.listRoles(refresh).subscribe({
      next: (roles) => {
        this.all.set(roles);
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

  protected togglePermission(permissionId: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (!next.delete(permissionId)) {
        next.add(permissionId);
      }
      return next;
    });
  }

  /** Ticks or clears an entire module at once. */
  protected toggleGroup(group: PermissionGroup): void {
    const allSelected = this.selectedInGroup(group) === group.permissions.length;
    this.selected.update((current) => {
      const next = new Set(current);
      for (const permission of group.permissions) {
        if (allSelected) {
          next.delete(permission.id);
        } else {
          next.add(permission.id);
        }
      }
      return next;
    });
  }

  protected startCreate(): void {
    this.resetEditor();
    this.editing.set('new');
  }

  protected startEdit(role: Role): void {
    this.resetEditor();

    // A role carries permission codes; the request wants ids.
    const ids = this.catalogue()
      .filter((permission) => role.permissions.includes(permission.code))
      .map((permission) => permission.id);
    this.selected.set(new Set(ids));

    this.form.patchValue({
      code: role.code,
      name: role.name,
      description: role.description ?? '',
    });
    if (role.systemRole || !this.canManage()) {
      this.form.disable();
    }
    this.editing.set(role);
  }

  /** System roles are defined by the platform and cannot be edited. */
  protected readonly editable = computed(() => {
    const target = this.editing();
    return this.canManage() && (target === 'new' || (target !== null && !target.systemRole));
  });

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
    if (!target || !this.editable()) {
      return;
    }

    if (this.selected().size === 0) {
      this.formError.set('Grant at least one permission.');
      return;
    }

    const value = nullifyBlanks(this.form.getRawValue());
    const request: RoleRequest = {
      code: value.code,
      name: value.name,
      description: value.description,
      permissionIds: [...this.selected()],
    };

    const call =
      target === 'new'
        ? this.identity.createRole(request)
        : this.identity.updateRole(target.id, request);

    this.saving.set(true);
    call.subscribe({
      next: (role) => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(
          target === 'new' ? 'Role created' : 'Role updated',
          `${role.code} — ${role.permissions.length} permissions`,
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

  protected async remove(role: Role): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Delete role',
      message: 'The role is removed permanently. Users holding it lose the permissions it granted.',
      detail: `${role.code} — ${role.name}`,
      confirmLabel: 'Delete role',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.identity.deleteRole(role.id).subscribe({
      next: () => {
        this.toast.success('Role deleted', role.name);
        this.load();
      },
      error: (error: AppError) => this.toast.error('Could not delete role', error.message),
    });
  }

  private resetEditor(): void {
    this.form.enable();
    this.form.reset();
    this.selected.set(new Set());
    this.submitted.set(false);
    this.formError.set(null);
  }
}
