import { ChangeDetectionStrategy, Component, effect, input, model, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Debounced search input.
 *
 * The debounce lives here rather than in every list page so a keystroke never
 * turns into a request per character.
 */
@Component({
  selector: 'app-search-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="search" [class.search--full]="fullWidth()">
      <span class="search__icon" aria-hidden="true">
        <app-icon name="search" [size]="16" />
      </span>
      <input
        type="search"
        class="input search__input"
        [attr.aria-label]="placeholder()"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)"
        (keydown.escape)="clear()"
      />
      @if (value()) {
        <button type="button" class="search__clear" (click)="clear()" aria-label="Clear search">
          <app-icon name="close" [size]="14" />
        </button>
      }
    </div>
  `,
  styles: `
    .search {
      position: relative;
      width: 260px;
    }
    .search--full {
      width: 100%;
    }

    .search__icon {
      position: absolute;
      top: 50%;
      left: var(--space-3);
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .search__input {
      padding-left: var(--space-8);
      padding-right: var(--space-8);

      &::-webkit-search-cancel-button {
        display: none;
      }
    }

    .search__clear {
      position: absolute;
      top: 50%;
      right: var(--space-2);
      transform: translateY(-50%);
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    }
  `,
})
export class SearchBoxComponent {
  readonly value = model('');
  readonly placeholder = input('Search…');
  readonly debounceMs = input(300);
  readonly fullWidth = input(false);

  /** Emits the debounced term; list pages should react to this, not `value`. */
  readonly search = output<string>();

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect((onCleanup) => onCleanup(() => this.cancelPending()));
  }

  protected onInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.value.set(term);
    this.cancelPending();
    this.timer = setTimeout(() => this.search.emit(term.trim()), this.debounceMs());
  }

  protected clear(): void {
    this.cancelPending();
    this.value.set('');
    this.search.emit('');
  }

  private cancelPending(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
