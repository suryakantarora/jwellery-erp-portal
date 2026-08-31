import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEndpoints } from '../config/api.endpoints';
import {
  AuthenticatedUser,
  AuthResult,
  ChangePasswordRequest,
  LoginRequest,
} from '../models/auth.model';
import { ApiService } from '../services/api.service';
import { SessionStore } from './session.store';
import { SKIP_AUTH_REFRESH } from '../interceptors/http-context.tokens';

/**
 * Owns everything about the signed-in identity: login, refresh, logout, and the
 * profile that drives permissions and the branch selector.
 *
 * No component should touch tokens directly — they read `user()` and the
 * derived signals here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly currentUser = signal<AuthenticatedUser | null>(null);
  private readonly profileLoaded = signal(false);
  private readonly passwordChangeRequired = signal(false);

  /** In-flight refresh, shared so parallel 401s trigger only one round-trip. */
  private refreshInFlight$: Observable<AuthResult> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.session.current() !== null);
  readonly mustChangePassword = this.passwordChangeRequired.asReadonly();
  readonly permissions = computed(() => new Set(this.currentUser()?.permissions ?? []));
  readonly roles = computed(() => this.currentUser()?.roles ?? []);
  readonly isProfileLoaded = this.profileLoaded.asReadonly();

  login(credentials: LoginRequest): Observable<AuthResult> {
    return this.api
      .post<AuthResult>(ApiEndpoints.auth.login, credentials, {
        context: SKIP_AUTH_REFRESH(),
      })
      .pipe(tap((result) => this.acceptAuthResult(result)));
  }

  /**
   * Loads `/auth/me` for a session restored from storage.
   *
   * Resolves to null rather than erroring when the stored token is no longer
   * good, so the app-initializer can boot straight to the login page.
   */
  loadProfile(): Observable<AuthenticatedUser | null> {
    if (!this.session.hasSession()) {
      this.profileLoaded.set(true);
      return of(null);
    }

    return this.api.get<AuthenticatedUser>(ApiEndpoints.auth.me).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.session.clear();
        this.currentUser.set(null);
        return of(null);
      }),
      finalize(() => this.profileLoaded.set(true)),
    );
  }

  /** Exchanges the refresh token for a new access token. */
  refresh(): Observable<AuthResult> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.session.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInFlight$ = this.api
      .post<AuthResult>(
        ApiEndpoints.auth.refresh,
        { refreshToken },
        { context: SKIP_AUTH_REFRESH() },
      )
      .pipe(
        tap((result) => this.acceptAuthResult(result)),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    return this.refreshInFlight$;
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api
      .post<void>(ApiEndpoints.auth.changePassword, request)
      .pipe(tap(() => this.passwordChangeRequired.set(false)));
  }

  /**
   * Revokes the refresh token server-side, then clears local state.
   *
   * The redirect happens regardless of whether the revoke call succeeds: a user
   * who clicked "sign out" must end up signed out locally either way.
   */
  logout(redirectTo = '/login'): void {
    const refreshToken = this.session.refreshToken();
    const finish = () => {
      this.clearSession();
      void this.router.navigateByUrl(redirectTo);
    };

    if (!refreshToken) {
      finish();
      return;
    }

    this.api
      .post<void>(ApiEndpoints.auth.logout, { refreshToken }, { context: SKIP_AUTH_REFRESH() })
      .pipe(catchError(() => EMPTY))
      .subscribe({ next: finish, complete: finish });
  }

  /**
   * Drops local state without calling the backend. Used when the server has
   * already rejected the session, where a logout call would only 401 again.
   */
  clearSession(): void {
    this.session.clear();
    this.currentUser.set(null);
    this.passwordChangeRequired.set(false);
    this.refreshInFlight$ = null;
  }

  /** Sends the user to the login page, remembering where they were headed. */
  redirectToLogin(returnUrl?: string): void {
    void this.router.navigate(['/login'], {
      queryParams: returnUrl && returnUrl !== '/login' ? { returnUrl } : undefined,
    });
  }

  hasPermission(code: string): boolean {
    return this.permissions().has(code);
  }

  hasAnyPermission(codes: readonly string[]): boolean {
    if (codes.length === 0) {
      return true;
    }
    const held = this.permissions();
    return codes.some((code) => held.has(code));
  }

  hasAllPermissions(codes: readonly string[]): boolean {
    const held = this.permissions();
    return codes.every((code) => held.has(code));
  }

  hasRole(code: string): boolean {
    return this.roles().includes(code);
  }

  /** Seconds of life left on the access token, for the refresh interceptor. */
  isAccessTokenExpiring(): boolean {
    return this.session.isAccessTokenExpiring(environment.tokenRefreshLeewaySeconds);
  }

  private acceptAuthResult(result: AuthResult): void {
    this.session.save(result.accessToken, result.refreshToken, result.accessTokenExpiresAt);
    this.currentUser.set(result.user);
    this.passwordChangeRequired.set(result.mustChangePassword);
    this.profileLoaded.set(true);
  }
}

/** Convenience for templates needing the display initials of the current user. */
export function initialsOf(user: AuthenticatedUser | null): string {
  if (!user) {
    return '?';
  }
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return user.username.slice(0, 2).toUpperCase();
  }
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
