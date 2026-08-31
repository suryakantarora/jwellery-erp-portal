import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Centred dialog.
 *
 * The host page renders it inside an `@if`, which keeps ownership of the open
 * state with the page. Focus is trapped and restored by the CDK; Escape and a
 * backdrop click both emit `dismiss` so the page decides whether to close.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, IconComponent],
  template: `
    <div class="modal-scrim" (click)="onBackdrop($event)">
      <div
        class="modal"
        [class]="'modal--' + size()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown.escape)="dismiss.emit()"
      >
        <header class="modal__header">
          <div>
            <h2 class="modal__title">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="modal__subtitle">{{ subtitle() }}</p>
            }
          </div>
          @if (dismissible()) {
            <button
              type="button"
              class="btn btn--ghost btn--icon btn--sm"
              (click)="dismiss.emit()"
              aria-label="Close dialog"
            >
              <app-icon name="close" [size]="16" />
            </button>
          }
        </header>

        <div class="modal__body">
          <ng-content />
        </div>

        <footer class="modal__footer">
          <ng-content select="[modalFooter]" />
        </footer>
      </div>
    </div>
  `,
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly size = input<ModalSize>('md');
  readonly dismissible = input(true);
  /** Whether clicking the scrim dismisses; off for forms with unsaved input. */
  readonly closeOnBackdrop = input(true);

  readonly dismiss = output<void>();

  protected onBackdrop(event: MouseEvent): void {
    if (this.dismissible() && this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.dismiss.emit();
    }
  }
}
