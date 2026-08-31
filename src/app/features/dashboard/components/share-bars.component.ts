import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CategoryShare } from '../dashboard.model';

/**
 * Ranked share breakdown.
 *
 * A ranked list of parts of a whole reads faster as labelled horizontal bars
 * than as a pie: the labels sit beside their bars, and the ordering does the
 * comparison for the reader. One measure, so one hue, stepped by rank.
 */
@Component({
  selector: 'app-share-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="shares">
      @for (row of rows(); track row.label) {
        <li class="shares__row">
          <span class="shares__label">{{ row.label }}</span>
          <span class="shares__track">
            <span
              class="shares__fill"
              [style.width.%]="row.width"
              [style.opacity]="row.opacity"
            ></span>
          </span>
          <span class="shares__value numeric">{{ row.value }}{{ suffix() }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    .shares {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .shares__row {
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr) 46px;
      align-items: center;
      gap: var(--space-3);
    }

    .shares__label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .shares__track {
      height: 8px;
      border-radius: var(--radius-pill);
      background: var(--surface-sunken);
      overflow: hidden;
    }

    .shares__fill {
      display: block;
      height: 100%;
      border-radius: var(--radius-pill);
      background: var(--accent);
      transition: width var(--duration-slow) var(--ease-out);
    }

    .shares__value {
      font-size: var(--text-sm);
      color: var(--text-primary);
      text-align: right;
    }
  `,
})
export class ShareBarsComponent {
  readonly data = input.required<readonly CategoryShare[]>();
  readonly suffix = input('%');

  protected readonly rows = computed(() => {
    const data = this.data();
    const max = Math.max(...data.map((entry) => entry.value), 1);

    return data.map((entry, index) => ({
      ...entry,
      width: (entry.value / max) * 100,
      // Stepped down the single hue by rank, so the ordering is legible even
      // where two bars are nearly the same length.
      opacity: Math.max(1 - index * 0.15, 0.35),
    }));
  });
}
