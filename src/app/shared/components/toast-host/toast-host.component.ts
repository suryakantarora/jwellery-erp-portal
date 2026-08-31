import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { Tone } from '../../../core/models/ui.model';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon.registry';

const TONE_ICONS: Record<Tone, IconName> = {
  neutral: 'info',
  accent: 'info',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

/** Renders the global toast queue. Mounted once, in the app shell. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="toast-host" role="region" aria-label="Notifications">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.tone" role="status" aria-live="polite">
          <span class="toast__icon">
            <app-icon [name]="iconFor(toast.tone)" [size]="17" />
          </span>
          <div class="toast__content">
            <p class="toast__title">{{ toast.title }}</p>
            @if (toast.detail) {
              <p class="toast__detail">{{ toast.detail }}</p>
            }
          </div>
          <button
            type="button"
            class="toast__close"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <app-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-host.component.scss',
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);

  protected iconFor(tone: Tone): IconName {
    return TONE_ICONS[tone];
  }
}
