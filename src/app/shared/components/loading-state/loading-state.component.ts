import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

/** Centred loading placeholder for a page or panel awaiting its first data. */
@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent],
  template: `
    <div class="loading" [class.loading--compact]="compact()">
      <app-spinner [size]="compact() ? 18 : 24" [thickness]="2.5" />
      <p class="loading__label">{{ label() }}</p>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-16) var(--space-6);
      color: var(--text-muted);
    }

    .loading--compact {
      padding: var(--space-8) var(--space-4);
    }

    .loading__label {
      font-size: var(--text-sm);
    }
  `,
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
  readonly compact = input(false);
}
