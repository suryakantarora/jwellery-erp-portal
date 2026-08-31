import { inject, Injectable, signal } from '@angular/core';
import { StorageKeys } from '../config/api.config';
import { AuthSession } from '../models/auth.model';
import { StorageService } from '../services/storage.service';

/**
 * Persists the JWT pair.
 *
 * The backend issues bearer tokens rather than cookies, so the tokens have to
 * live somewhere the app can read them. `localStorage` is used deliberately —
 * it survives a reload, which an ERP operator doing an eight-hour shift
 * expects — and the exposure is bounded by short-lived access tokens plus a
 * revocable refresh token that logout invalidates server-side.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storage = inject(StorageService);

  private readonly session = signal<AuthSession | null>(this.restore());

  /** Reactive view of the stored session, for guards and the shell. */
  readonly current = this.session.asReadonly();

  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  refreshToken(): string | null {
    return this.session()?.refreshToken ?? null;
  }

  save(accessToken: string, refreshToken: string, accessTokenExpiresAt: string): void {
    const expiresAt = Date.parse(accessTokenExpiresAt);
    const session: AuthSession = {
      accessToken,
      refreshToken,
      expiresAt: Number.isNaN(expiresAt) ? Date.now() : expiresAt,
    };

    this.session.set(session);
    this.storage.write(StorageKeys.accessToken, session.accessToken);
    this.storage.write(StorageKeys.refreshToken, session.refreshToken);
    this.storage.write(StorageKeys.accessTokenExpiry, String(session.expiresAt));
  }

  clear(): void {
    this.session.set(null);
    this.storage.remove(StorageKeys.accessToken);
    this.storage.remove(StorageKeys.refreshToken);
    this.storage.remove(StorageKeys.accessTokenExpiry);
  }

  /** True once the access token is within `leewaySeconds` of expiring. */
  isAccessTokenExpiring(leewaySeconds: number): boolean {
    const session = this.session();
    if (!session) {
      return false;
    }
    return session.expiresAt - leewaySeconds * 1000 <= Date.now();
  }

  hasSession(): boolean {
    return this.session() !== null;
  }

  private restore(): AuthSession | null {
    const accessToken = this.storage.read(StorageKeys.accessToken);
    const refreshToken = this.storage.read(StorageKeys.refreshToken);
    const expiry = this.storage.read(StorageKeys.accessTokenExpiry);

    if (!accessToken || !refreshToken) {
      return null;
    }
    return { accessToken, refreshToken, expiresAt: Number(expiry ?? 0) };
  }
}
