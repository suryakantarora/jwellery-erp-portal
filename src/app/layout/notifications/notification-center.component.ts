import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { SentenceCasePipe } from '../../shared/pipes/sentence-case.pipe';

/**
 * Header panel over the backend's notification outbox.
 *
 * Loads lazily on first open — see {@link NotificationCenterService} — and
 * renders nothing at all for a user without `NOTIFICATION_VIEW`.
 */
@Component({
  selector: 'app-notification-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ClickOutsideDirective,
    IconComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
    SentenceCasePipe,
  ],
  template: `
    @if (center.canView()) {
      <div class="notifications" (appClickOutside)="open.set(false)">
        <button
          type="button"
          class="btn btn--ghost btn--icon notifications__trigger"
          [attr.aria-expanded]="open()"
          aria-label="Notifications"
          (click)="toggle()"
        >
          <app-icon name="notifications" [size]="18" />
          @if (center.pendingCount() > 0) {
            <span class="notifications__badge numeric" aria-hidden="true">
              {{ center.pendingCount() > 9 ? '9+' : center.pendingCount() }}
            </span>
          }
        </button>

        @if (open()) {
          <div class="notifications__panel" role="dialog" aria-label="Notifications">
            <header class="notifications__header">
              <h2 class="notifications__title">Notifications</h2>
              <button
                type="button"
                class="btn btn--ghost btn--icon btn--sm"
                aria-label="Refresh notifications"
                (click)="center.load(true)"
              >
                <app-icon name="refresh" [size]="15" />
              </button>
            </header>

            <div class="notifications__body">
              @if (center.isLoading()) {
                <app-loading-state label="Loading notifications…" [compact]="true" />
              } @else if (center.error()) {
                <app-empty-state
                  title="Notifications unavailable"
                  message="The notification service could not be reached."
                  icon="warning"
                  [compact]="true"
                />
              } @else if (center.notifications().length === 0) {
                <app-empty-state
                  title="Nothing to review"
                  message="Messages sent by the platform will appear here."
                  icon="notifications"
                  [compact]="true"
                />
              } @else {
                <ul class="notifications__list">
                  @for (item of center.notifications(); track item.id) {
                    <li class="notifications__item">
                      <div class="notifications__item-head">
                        <span class="notifications__event">{{
                          item.eventType | sentenceCase
                        }}</span>
                        <app-status-badge [status]="item.status" [dot]="false" />
                      </div>
                      <p class="notifications__subject">{{ item.subject || item.body || '—' }}</p>
                      <p class="notifications__meta">
                        {{ item.channel | sentenceCase }} · {{ item.createdAt | relativeTime }}
                      </p>
                    </li>
                  }
                </ul>
              }
            </div>

            <footer class="notifications__footer">
              <a
                routerLink="/notifications"
                class="btn btn--ghost btn--sm"
                (click)="open.set(false)"
              >
                View all notifications
              </a>
            </footer>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './notification-center.component.scss',
})
export class NotificationCenterComponent {
  protected readonly center = inject(NotificationCenterService);
  protected readonly open = signal(false);

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.center.load();
    }
  }
}
