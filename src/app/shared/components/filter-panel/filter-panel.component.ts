import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Collapsible bar holding a list screen's filters.
 *
 * Collapsed by default once filters exist so the table gets the vertical space,
 * with the active-filter count kept visible on the toggle.
 */
@Component({
  selector: 'app-filter-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section class="filters">
      <header class="filters__bar">
        <button
          type="button"
          class="filters__toggle"
          [attr.aria-expanded]="expanded()"
          (click)="expanded.set(!expanded())"
        >
          <app-icon name="filter" [size]="15" />
          <span>Filters</span>
          @if (activeCount() > 0) {
            <span class="filters__count numeric">{{ activeCount() }}</span>
          }
          <app-icon [name]="expanded() ? 'chevronUp' : 'chevronDown'" [size]="14" />
        </button>

        <div class="filters__inline">
          <ng-content select="[filterInline]" />
        </div>

        @if (activeCount() > 0) {
          <button type="button" class="btn btn--ghost btn--sm" (click)="clear.emit()">
            Clear all
          </button>
        }
      </header>

      @if (expanded()) {
        <div class="filters__body">
          <ng-content />
        </div>
      }
    </section>
  `,
  styles: `
    .filters {
      border-bottom: 1px solid var(--border-subtle);
    }

    .filters__bar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
    }

    .filters__toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      height: 32px;
      padding: 0 var(--space-3);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      background: transparent;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
      cursor: pointer;
      transition: background var(--duration-fast) var(--ease-out);

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    }

    .filters__count {
      display: grid;
      place-items: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: var(--text-on-accent);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }

    .filters__inline {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-left: auto;
    }

    .filters__body {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4);
      padding: 0 var(--space-4) var(--space-4);
      animation: reveal var(--duration-base) var(--ease-out);
    }

    @keyframes reveal {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  `,
})
export class FilterPanelComponent {
  /** Number of filters currently applied, shown on the toggle. */
  readonly activeCount = input(0);
  readonly clear = output<void>();

  protected readonly expanded = signal(false);
}
