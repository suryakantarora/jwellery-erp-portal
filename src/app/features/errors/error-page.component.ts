import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { IconName } from '../../shared/components/icon/icon.registry';

/** Full-page message for the 404 and 403 routes. */
@Component({
  selector: 'app-error-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="error-page">
      <span class="error-page__icon">
        <app-icon [name]="icon()" [size]="28" [strokeWidth]="1.3" />
      </span>
      <p class="error-page__code">{{ code() }}</p>
      <h1 class="error-page__title">{{ title() }}</h1>
      <p class="error-page__message">{{ message() }}</p>
      <a class="btn btn--primary" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
  styles: `
    .error-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      min-height: 60vh;
      padding: var(--space-8);
      text-align: center;
    }

    .error-page__icon {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      background: var(--surface-sunken);
      color: var(--text-muted);
    }

    .error-page__code {
      margin-top: var(--space-3);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: var(--tracking-wider);
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .error-page__title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--weight-semibold);
    }

    .error-page__message {
      max-width: 48ch;
      margin-bottom: var(--space-3);
      color: var(--text-secondary);
    }
  `,
})
export class ErrorPageComponent {
  readonly code = input('404');
  readonly title = input('Page not found');
  readonly message = input('The page you are looking for does not exist or has moved.');
  readonly icon = input<IconName>('search');
}
