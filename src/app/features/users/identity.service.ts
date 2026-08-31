import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiEndpoints } from '../../core/config/api.endpoints';
import { PageQuery, PageResponse } from '../../core/models/api.model';
import {
  CreateUserRequest,
  PermissionDefinition,
  ResetPasswordRequest,
  Role,
  RoleRequest,
  UpdateUserRequest,
  User,
} from '../../core/models/identity.model';
import { ApiService } from '../../core/services/api.service';

export interface UserQuery extends PageQuery {
  readonly search?: string | null;
  readonly branchId?: string | null;
}

/**
 * Users, roles and the permission catalogue.
 *
 * Roles and permissions are reference data for the user editor as well as
 * subjects in their own right, so both are cached and invalidated together
 * whenever a role changes.
 */
@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly api = inject(ApiService);

  private roles$: Observable<Role[]> | null = null;
  private permissions$: Observable<PermissionDefinition[]> | null = null;

  // ---------- users ----------

  searchUsers(query: UserQuery): Observable<PageResponse<User>> {
    return this.api.getPage<User>(ApiEndpoints.users.root, { ...query });
  }

  getUser(id: string): Observable<User> {
    return this.api.get<User>(ApiEndpoints.users.byId(id));
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.api.post<User>(ApiEndpoints.users.root, request);
  }

  updateUser(id: string, request: UpdateUserRequest): Observable<User> {
    return this.api.put<User>(ApiEndpoints.users.byId(id), request);
  }

  resetPassword(id: string, request: ResetPasswordRequest): Observable<void> {
    return this.api.post<void>(ApiEndpoints.users.resetPassword(id), request);
  }

  deactivateUser(id: string): Observable<void> {
    return this.api.delete<void>(ApiEndpoints.users.byId(id));
  }

  // ---------- roles ----------

  listRoles(refresh = false): Observable<Role[]> {
    if (refresh || !this.roles$) {
      this.roles$ = this.api
        .get<Role[]>(ApiEndpoints.roles.root)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.roles$;
  }

  createRole(request: RoleRequest): Observable<Role> {
    return this.api.post<Role>(ApiEndpoints.roles.root, request).pipe(tap(() => this.invalidate()));
  }

  updateRole(id: string, request: RoleRequest): Observable<Role> {
    return this.api
      .put<Role>(ApiEndpoints.roles.byId(id), request)
      .pipe(tap(() => this.invalidate()));
  }

  deleteRole(id: string): Observable<void> {
    return this.api.delete<void>(ApiEndpoints.roles.byId(id)).pipe(tap(() => this.invalidate()));
  }

  // ---------- permissions ----------

  listPermissions(refresh = false): Observable<PermissionDefinition[]> {
    if (refresh || !this.permissions$) {
      this.permissions$ = this.api
        .get<PermissionDefinition[]>(ApiEndpoints.roles.permissions)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.permissions$;
  }

  invalidate(): void {
    this.roles$ = null;
  }
}
