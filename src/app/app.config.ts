import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/services/theme.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    provideRouter(
      routes,
      withComponentInputBinding(),
      // A page change starts at the top; a fragment link still lands on its anchor.
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),

    // Order matters: loading counts the request, auth attaches and refreshes the
    // token, and error normalises whatever comes back last.
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor])),

    /**
     * Resolve the signed-in profile before the first route renders.
     *
     * Guards and the permission-filtered sidebar both need the profile, and
     * rendering the shell first would flash a menu that is missing every
     * permission-gated entry.
     */
    provideAppInitializer(() => {
      // Instantiating the theme service applies the stored preference before
      // the first paint, avoiding a flash of the wrong theme.
      inject(ThemeService);
      return firstValueFrom(inject(AuthService).loadProfile());
    }),
  ],
};
