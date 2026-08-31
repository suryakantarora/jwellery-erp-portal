import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MetricTile } from '../dashboard.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** One headline figure, with its period-over-period movement. */
@Component({
  selector: 'app-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <article class="metric" [class]="'metric--' + metric().tone">
      <!--
        A decorative rising curve in the tile's own tone. Inline SVG rather than
        an image: it inherits the tone through currentColor, costs no request,
        and stays crisp at any card width.
      -->
      <svg class="metric__flourish" viewBox="0 0 160 80" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient [attr.id]="gradientId()" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M0 66 C 26 66, 34 44, 56 40 S 96 46, 116 24 S 146 8, 160 4 L160 80 L0 80 Z"
          [attr.fill]="'url(#' + gradientId() + ')'"
        />
        <path
          d="M0 66 C 26 66, 34 44, 56 40 S 96 46, 116 24 S 146 8, 160 4"
          fill="none"
          stroke="currentColor"
          stroke-opacity="0.6"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>

      <header class="metric__head">
        <span class="metric__icon">
          <app-icon [name]="metric().icon" [size]="17" />
        </span>
        <h3 class="metric__label">{{ metric().label }}</h3>
      </header>

      <p class="metric__value numeric">{{ metric().value }}</p>

      <footer class="metric__foot">
        @if (metric().delta !== null) {
          <span
            class="metric__delta"
            [class.metric__delta--up]="(metric().delta ?? 0) >= 0"
            [class.metric__delta--down]="(metric().delta ?? 0) < 0"
          >
            <app-icon
              [name]="(metric().delta ?? 0) >= 0 ? 'chevronUp' : 'chevronDown'"
              [size]="12"
            />
            {{ absDelta() }}%
          </span>
        }
        <span class="metric__caption">{{ metric().caption }}</span>
      </footer>
    </article>
  `,
  styleUrl: './metric-card.component.scss',
})
export class MetricCardComponent {
  readonly metric = input.required<MetricTile>();

  /**
   * SVG gradients are referenced by id, and ids are document-global — six tiles
   * sharing one id would all paint with the first tile's tone.
   */
  protected gradientId(): string {
    return `metric-fade-${this.metric().label.replace(/\W+/g, '-').toLowerCase()}`;
  }

  protected absDelta(): string {
    return Math.abs(this.metric().delta ?? 0).toFixed(1);
  }
}
