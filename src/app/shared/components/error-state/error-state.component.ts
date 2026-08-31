import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppError } from '../../../core/models/api.model';
import { IconComponent } from '../icon/icon.component';

/**
 * Inline failure panel for a page or panel whose data could not be loaded.
 *
 * Shows the correlation id when the backend provided one — it is what support
 * needs to find the request in the server logs.
 */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="error" role="alert">
      <span class="error__icon">
        <app-icon name="warning" [size]="24" [strokeWidth]="1.4" />
      </span>
      <h3 class="error__title">{{ title() }}</h3>
      <p class="error__message">{{ error()?.message ?? fallback() }}</p>
      @if (error()?.correlationId; as correlationId) {
        <p class="error__reference mono">Reference {{ correlationId }}</p>
      }
      @if (retryable()) {
        <button type="button" class="btn btn--secondary btn--sm" (click)="retry.emit()">
          <app-icon name="refresh" [size]="15" />
          Try again
        </button>
      }
    </div>
  `,
  styles: `
    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-12) var(--space-6);
      text-align: center;
    }

    .error__icon {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--danger-soft);
      color: var(--danger);
    }

    .error__title {
      font-size: var(--text-lg);
    }

    .error__message {
      max-width: 52ch;
      color: var(--text-secondary);
    }

    .error__reference {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  `,
})
export class ErrorStateComponent {
  readonly error = input<AppError | null>(null);
  readonly title = input('Unable to load this data');
  readonly fallback = input('An unexpected error occurred.');
  readonly retryable = input(true);

  readonly retry = output<void>();
}
