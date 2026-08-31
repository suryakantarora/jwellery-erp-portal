import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SessionStore } from '../auth/session.store';
import { SKIP_AUTH_REFRESH_TOKEN } from './http-context.tokens';

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Attaches the bearer token and recovers from expiry.
 *
 * On a 401 it makes exactly one refresh attempt and replays the request; the
 * shared refresh in `AuthService` means a burst of parallel 401s still results
 * in a single token exchange. A failed refresh ends the session.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionStore);
  const auth = inject(AuthService);
  const router = inject(Router);

  const skipRefresh = request.context.get(SKIP_AUTH_REFRESH_TOKEN);
  const token = session.accessToken();
  const authorized = token ? withBearer(request, token) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      if (!isUnauthorized || skipRefresh || !session.refreshToken()) {
        if (isUnauthorized && !skipRefresh) {
          auth.clearSession();
          auth.redirectToLogin(router.url);
        }
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((result) => next(withBearer(request, result.accessToken))),
        catchError((refreshError: unknown) => {
          auth.clearSession();
          auth.redirectToLogin(router.url);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
