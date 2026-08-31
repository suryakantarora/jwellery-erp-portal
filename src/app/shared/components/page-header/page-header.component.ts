import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Title block at the top of every page: eyebrow, title, supporting copy, and a
 * projected slot for the page's primary actions.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="page-header__text">
        @if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (description()) {
          <p class="page-header__description">{{ description() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-6);
      margin-bottom: var(--space-6);
    }

    .page-header__text {
      min-width: 0;
    }

    .page-header__title {
      font-family: var(--font-display);
      font-size: var(--text-3xl);
      font-weight: var(--weight-semibold);
      letter-spacing: -0.01em;
    }

    .page-header__description {
      margin-top: var(--space-2);
      max-width: 68ch;
      color: var(--text-secondary);
    }

    .page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: none;
    }

    @media (max-width: 720px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }
      .page-header__actions {
        flex-wrap: wrap;
      }
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
}
