import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { SKIP_LOADING_TOKEN } from './http-context.tokens';

/** Drives the shell's global progress bar from in-flight request count. */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_LOADING_TOKEN)) {
    return next(request);
  }

  const loading = inject(LoadingService);
  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};
