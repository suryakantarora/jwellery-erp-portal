export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'SUSPENDED';

/** Authenticated principal, roles and effective permissions. */
export interface AuthenticatedUser {
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

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

export interface AuthResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: string;
  readonly accessTokenExpiresAt: string;
  readonly mustChangePassword: boolean;
  readonly user: AuthenticatedUser;
}

export interface RefreshTokenRequest {
  readonly refreshToken: string;
}

export interface ChangePasswordRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

/** Tokens as held by the session store, with expiry as an epoch millisecond. */
export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
}
