import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Absolute URL of the versioned API root, e.g. http://localhost:8080/api/v1. */
export const API_ROOT = `${environment.apiBaseUrl}${environment.apiPrefix}`;

/**
 * Injectable form of the API root so tests and alternate hosts can override it
 * without patching the environment file.
 */
export const API_ROOT_URL = new InjectionToken<string>('API_ROOT_URL', {
  providedIn: 'root',
  factory: () => API_ROOT,
});

/** Storage keys owned by the portal. Namespaced to avoid collisions. */
export const StorageKeys = {
  accessToken: 'pvj.erp.access-token',
  refreshToken: 'pvj.erp.refresh-token',
  accessTokenExpiry: 'pvj.erp.access-token-expiry',
  theme: 'pvj.erp.theme',
  accents: 'pvj.erp.accents',
  sidebarCollapsed: 'pvj.erp.sidebar-collapsed',
  activeBranch: 'pvj.erp.active-branch',
} as const;
