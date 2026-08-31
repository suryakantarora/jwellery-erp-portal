import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type DrawerSize = 'sm' | 'md' | 'lg';

/**
 * Side panel used for create and edit forms.
 *
 * Preferred over a modal for record editing because it keeps the underlying
 * list visible, which is how an operator confirms they are editing the right
 * row.
 */
@Component({
  selector: 'app-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, IconComponent],
  template: `
    <div class="drawer-scrim" (click)="onBackdrop($event)">
      <aside
        class="drawer"
        [class]="'drawer--' + size()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown.escape)="dismiss.emit()"
      >
        <header class="drawer__header">
          <div class="drawer__heading">
            @if (eyebrow()) {
              <p class="eyebrow">{{ eyebrow() }}</p>
            }
            <h2 class="drawer__title">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="drawer__subtitle">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            (click)="dismiss.emit()"
            aria-label="Close panel"
          >
            <app-icon name="close" [size]="16" />
          </button>
        </header>

        <div class="drawer__body">
          <ng-content />
        </div>

        <footer class="drawer__footer">
          <ng-content select="[drawerFooter]" />
        </footer>
      </aside>
    </div>
  `,
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly eyebrow = input('');
  readonly size = input<DrawerSize>('md');
  readonly closeOnBackdrop = input(true);

  readonly dismiss = output<void>();

  protected onBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.dismiss.emit();
    }
  }
}
