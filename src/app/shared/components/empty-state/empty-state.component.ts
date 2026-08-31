import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon.registry';

/** Shown where a list or panel has no records yet, or no matches for a filter. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty" [class.empty--compact]="compact()">
      <span class="empty__icon">
        <app-icon [name]="icon()" [size]="compact() ? 22 : 28" [strokeWidth]="1.3" />
      </span>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <div class="empty__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding: var(--space-16) var(--space-6);
      text-align: center;
    }

    .empty--compact {
      padding: var(--space-10) var(--space-4);
    }

    .empty__icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--surface-sunken);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }

    .empty__title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .empty__message {
      max-width: 46ch;
      color: var(--text-secondary);
      font-size: var(--text-base);
    }

    .empty__actions:empty {
      display: none;
    }
    .empty__actions {
      margin-top: var(--space-2);
      display: flex;
      gap: var(--space-2);
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly icon = input<IconName>('empty');
  readonly compact = input(false);
}
