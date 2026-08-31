import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';

/**
 * Application root.
 *
 * Holds only the routed outlet and the two global overlay hosts — the shell
 * itself is a routed component, so the login page renders without it.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastHostComponent, ConfirmDialogComponent],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <router-outlet />
    <app-toast-host />
    <app-confirm-dialog />
  `,
  styles: `
    .skip-link {
      position: absolute;
      top: var(--space-2);
      left: var(--space-2);
      z-index: var(--z-toast);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-sm);
      background: var(--surface-overlay);
      box-shadow: var(--shadow-md);
      transform: translateY(-200%);
      transition: transform var(--duration-fast) var(--ease-out);

      &:focus {
        transform: none;
      }
    }
  `,
})
export class App {}
