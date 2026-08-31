import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indeterminate activity indicator used inside buttons, tables and overlays. */
@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="spinner"
      role="status"
      [attr.aria-label]="label()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.border-width.px]="thickness()"
    ></span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .spinner {
      display: block;
      border-style: solid;
      border-color: currentcolor;
      border-right-color: transparent;
      border-radius: 50%;
      opacity: 0.75;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class SpinnerComponent {
  readonly size = input(16);
  readonly thickness = input(2);
  readonly label = input('Loading');
}
