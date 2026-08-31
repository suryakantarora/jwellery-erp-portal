import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICON_PATHS, IconName } from './icon.registry';

/**
 * Renders a stroked SVG icon that inherits the current text colour.
 *
 * Decorative by default; pass `label` when the icon is the only content of an
 * interactive control so screen readers still announce it.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="icon"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke-width]="strokeWidth()"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.role]="label() ? 'img' : 'presentation'"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.aria-label]="label() || null"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  readonly strokeWidth = input(1.6);
  readonly label = input('');

  protected readonly path = computed(() => ICON_PATHS[this.name()]);
}
