import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shimmering placeholder block, used while a card's real content loads. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    class: 'skeleton',
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
  styles: `
    :host {
      display: block;
      background: linear-gradient(
        90deg,
        var(--surface-sunken) 0%,
        var(--surface-hover) 50%,
        var(--surface-sunken) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s var(--ease-in-out) infinite;
    }

    @keyframes shimmer {
      from {
        background-position: 200% 0;
      }
      to {
        background-position: -200% 0;
      }
    }
  `,
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('14px');
  readonly radius = input('var(--radius-xs)');
}
