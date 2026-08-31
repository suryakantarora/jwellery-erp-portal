import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmService } from './confirm.service';

/** Renders whatever {@link ConfirmService} currently has queued. Mounted once. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    @if (confirm.request(); as request) {
      <app-modal
        [title]="request.options.title"
        size="sm"
        [closeOnBackdrop]="false"
        (dismiss)="confirm.resolve(false)"
      >
        <p class="confirm__message">{{ request.options.message }}</p>
        @if (request.options.detail) {
          <p class="confirm__detail">{{ request.options.detail }}</p>
        }

        <ng-container modalFooter>
          <button type="button" class="btn btn--ghost" (click)="confirm.resolve(false)">
            {{ request.options.cancelLabel ?? 'Cancel' }}
          </button>
          <button
            type="button"
            class="btn"
            [class.btn--danger]="request.options.tone === 'danger'"
            [class.btn--primary]="request.options.tone !== 'danger'"
            (click)="confirm.resolve(true)"
          >
            {{ request.options.confirmLabel ?? 'Confirm' }}
          </button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `
    .confirm__message {
      color: var(--text-secondary);
    }

    .confirm__detail {
      margin-top: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-sm);
      background: var(--surface-sunken);
      font-size: var(--text-sm);
      color: var(--text-primary);
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
}
