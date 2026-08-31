import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { toAppError } from '../services/error.util';
import { SKIP_ERROR_TOAST_TOKEN } from './http-context.tokens';

/**
 * Turns every HTTP failure into an `AppError` and surfaces it as a toast.
 *
 * 401 is left alone — the auth interceptor either recovers from it or sends the
 * user to the login page, and a toast on top of that is just noise. 400 is
 * likewise skipped: validation failures belong next to the offending field, and
 * the calling form renders them from `error.fieldErrors`.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);
  const silent = request.context.get(SKIP_ERROR_TOAST_TOKEN);

  return next(request).pipe(
    catchError((error: unknown) => {
      const appError = toAppError(error);
      const handledElsewhere = appError.status === 401 || appError.status === 400;

      if (!silent && !handledElsewhere) {
        toast.error(
          appError.message,
          appError.correlationId ? `Reference ${appError.correlationId}` : undefined,
        );
      }
      return throwError(() => appError);
    }),
  );
};
