import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Placeholder for cross-module search.
 *
 * The shape of the control — and its ⌘K affordance — is settled now so pages
 * can be laid out around it; the query itself is wired up once the backend
 * exposes a search endpoint in a later phase.
 */
@Component({
  selector: 'app-global-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
  template: `
    <div class="global-search">
      <span class="global-search__icon" aria-hidden="true">
        <app-icon name="search" [size]="16" />
      </span>
      <input
        #input
        type="search"
        class="input global-search__input"
        placeholder="Search items, customers, orders…"
        aria-label="Global search"
        [value]="term()"
        (input)="term.set($any($event.target).value)"
        (keydown.escape)="dismiss()"
      />
      <kbd class="global-search__hint" aria-hidden="true">⌘K</kbd>

      @if (term().length > 0) {
        <div class="global-search__results" role="status">
          <p class="global-search__pending">
            Global search is not connected yet. Use a module's own search in the meantime.
          </p>
        </div>
      }
    </div>
  `,
  styleUrl: './global-search.component.scss',
})
export class GlobalSearchComponent {
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly term = signal('');

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.input().nativeElement.focus();
    }
  }

  protected dismiss(): void {
    this.term.set('');
    this.input().nativeElement.blur();
  }
}
