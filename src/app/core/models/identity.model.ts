import { UserStatus } from './auth.model';

/**
 * A staff account as returned by `/users`.
 *
 * `roles` carries role *codes*, not ids — the role editor resolves them
 * against the role catalogue when populating the edit form.
 */
export interface User {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly employeeCode: string | null;
  readonly status: UserStatus;
  readonly primaryBranchId: string | null;
  readonly branchIds: string[];
  readonly roles: string[];
  readonly permissions: string[];
  readonly lastLoginAt: string | null;
}

export interface CreateUserRequest {
  readonly username: string;
  readonly password: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly employeeCode: string | null;
  readonly primaryBranchId: string | null;
  readonly roleIds: string[];
  readonly branchIds: string[];
}

export interface UpdateUserRequest {
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly employeeCode: string | null;
  readonly status: UserStatus;
  readonly primaryBranchId: string | null;
  readonly roleIds: string[];
  readonly branchIds: string[];
}

export interface ResetPasswordRequest {
  readonly newPassword: string;
  readonly mustChangePassword: boolean;
}

export interface Role {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly systemRole: boolean;
  readonly superAdmin: boolean;
  /** Permission codes granted by the role. */
  readonly permissions: string[];
}

export interface RoleRequest {
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissionIds: string[];
}

/** One entry of the backend's permission catalogue. */
export interface PermissionDefinition {
  readonly id: string;
  readonly code: string;
  readonly module: string;
  readonly description: string | null;
}

export const USER_STATUSES: ReadonlyArray<{ value: UserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'SUSPENDED', label: 'Suspended' },
];
