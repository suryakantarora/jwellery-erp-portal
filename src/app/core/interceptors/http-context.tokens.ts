import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Per-request flags read by the interceptors.
 *
 * These exist so a caller can opt out of cross-cutting behaviour — the auth
 * endpoints must not try to refresh a token while they *are* the token
 * exchange, and background polling should not flash the global loading bar.
 */
export const SKIP_AUTH_REFRESH_TOKEN = new HttpContextToken<boolean>(() => false);
export const SKIP_LOADING_TOKEN = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_TOAST_TOKEN = new HttpContextToken<boolean>(() => false);

export function SKIP_AUTH_REFRESH(context = new HttpContext()): HttpContext {
  return context.set(SKIP_AUTH_REFRESH_TOKEN, true);
}

export function SKIP_LOADING(context = new HttpContext()): HttpContext {
  return context.set(SKIP_LOADING_TOKEN, true);
}

/** Suppresses the automatic error toast so a screen can render the error inline. */
export function SKIP_ERROR_TOAST(context = new HttpContext()): HttpContext {
  return context.set(SKIP_ERROR_TOAST_TOKEN, true);
}

export function SILENT(context = new HttpContext()): HttpContext {
  return SKIP_ERROR_TOAST(SKIP_LOADING(context));
}
