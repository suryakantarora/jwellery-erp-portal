import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PermissionCode } from '../auth/permissions';

/** Route data understood by {@link permissionGuard}. */
export interface PermissionRouteData {
  /** Codes required to enter the route. */
  readonly permissions?: readonly PermissionCode[];
  /** When true every code is required; otherwise any one suffices. */
  readonly requireAll?: boolean;
}

/**
 * Route-level permission check.
 *
 * Sends an unauthorised user to the forbidden page rather than the login page:
 * they are signed in, they simply may not see this module. Backend
 * authorization is still the real gate.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const data = route.data as PermissionRouteData;
  const required = data.permissions ?? [];

  if (required.length === 0) {
    return true;
  }

  const allowed = data.requireAll
    ? auth.hasAllPermissions(required)
    : auth.hasAnyPermission(required);

  return allowed ? true : router.createUrlTree(['/forbidden']);
};
