import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AppError } from '../../../core/models/api.model';
import { PermissionDefinition, Role } from '../../../core/models/identity.model';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { IdentityService } from '../identity.service';
import { groupPermissions, PermissionGroup } from '../permission-groups';

/** A permission alongside the roles that grant it. */
interface PermissionRow {
  readonly permission: PermissionDefinition;
  readonly roles: readonly string[];
}

interface PermissionRowGroup {
  readonly module: string;
  readonly label: string;
  readonly rows: readonly PermissionRow[];
}

/**
 * Read-only browser over the permission catalogue the backend enforces.
 *
 * Permissions are not editable — they are defined in the platform's own
 * catalogue — so this screen exists to answer "what does this permission mean,
 * and who currently holds it".
 */
@Component({
  selector: 'app-permissions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, SearchBoxComponent, LoadingStateComponent, ErrorStateComponent],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.scss',
})
export class PermissionsComponent {
  private readonly identity = inject(IdentityService);

  private readonly groups = signal<readonly PermissionGroup[]>([]);
  private readonly roles = signal<readonly Role[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly search = signal('');

  protected readonly total = computed(() =>
    this.groups().reduce((sum, group) => sum + group.permissions.length, 0),
  );

  /** Groups filtered by the search term, each permission carrying its roles. */
  protected readonly visible = computed<readonly PermissionRowGroup[]>(() => {
    const term = this.search().trim().toLowerCase();
    const roles = this.roles();

    return this.groups()
      .map((group) => ({
        module: group.module,
        label: group.label,
        rows: group.permissions
          .filter(
            (permission) =>
              !term ||
              permission.code.toLowerCase().includes(term) ||
              (permission.description ?? '').toLowerCase().includes(term) ||
              group.label.toLowerCase().includes(term),
          )
          .map((permission) => ({
            permission,
            roles: roles
              .filter((role) => role.superAdmin || role.permissions.includes(permission.code))
              .map((role) => role.code),
          })),
      }))
      .filter((group) => group.rows.length > 0);
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      permissions: this.identity.listPermissions(true),
      roles: this.identity.listRoles(true),
    }).subscribe({
      next: ({ permissions, roles }) => {
        this.groups.set(groupPermissions(permissions));
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }
}
