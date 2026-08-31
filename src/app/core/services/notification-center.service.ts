import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiEndpoints } from '../config/api.endpoints';
import { AuthService } from '../auth/auth.service';
import { Permission } from '../auth/permissions';
import { AppError, PageResponse } from '../models/api.model';
import { NotificationRecord } from '../models/notification.model';
import { ApiService } from './api.service';
import { SILENT } from '../interceptors/http-context.tokens';

const PANEL_SIZE = 15;

/**
 * Backs the header's notification centre with the backend's notification
 * outbox.
 *
 * Fetched on demand when the panel opens rather than polled: the outbox is a
 * record of what the platform has sent, and an ERP operator opens it when they
 * want it, not continuously.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly items = signal<NotificationRecord[]>([]);
  private readonly loading = signal(false);
  private readonly failure = signal<AppError | null>(null);
  private readonly loaded = signal(false);

  readonly notifications = this.items.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly error = this.failure.asReadonly();
  readonly hasLoaded = this.loaded.asReadonly();

  /** Undelivered messages, which is what the header badge counts. */
  readonly pendingCount = computed(
    () =>
      this.items().filter((item) => item.status === 'PENDING' || item.status === 'QUEUED').length,
  );

  readonly canView = computed(() => this.auth.hasPermission(Permission.NOTIFICATION_VIEW));

  load(force = false): void {
    if (!this.canView() || this.loading() || (this.loaded() && !force)) {
      return;
    }

    this.loading.set(true);
    this.failure.set(null);

    this.api
      .get<PageResponse<NotificationRecord>>(ApiEndpoints.notifications.root, {
        params: { size: PANEL_SIZE, sort: 'createdAt,desc' },
        context: SILENT(),
      })
      .pipe(
        catchError((error: AppError) => {
          this.failure.set(error);
          return of(null);
        }),
        tap(() => {
          this.loading.set(false);
          this.loaded.set(true);
        }),
      )
      .subscribe((page) => {
        if (page) {
          this.items.set(page.content);
        }
      });
  }

  clear(): void {
    this.items.set([]);
    this.loaded.set(false);
    this.failure.set(null);
  }
}
