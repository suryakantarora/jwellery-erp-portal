import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TrendPoint } from '../dashboard.model';

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 200;
const PADDING = { top: 16, right: 8, bottom: 26, left: 8 };
const BAR_GAP = 14;
const RADIUS = 4;

/**
 * Single-series column chart, drawn inline.
 *
 * One measure of one kind, so it takes a single hue and needs no legend — the
 * heading names the series. The most recent column is emphasised and directly
 * labelled; the rest are labelled on hover rather than carrying a permanent
 * number each.
 */
@Component({
  selector: 'app-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="chart">
      <svg
        class="chart__svg"
        [attr.viewBox]="'0 0 ' + view.width + ' ' + view.height"
        role="img"
        [attr.aria-label]="ariaLabel()"
        preserveAspectRatio="none"
        (pointerleave)="hovered.set(null)"
      >
        <!-- Recessive baseline; no gridlines behind six columns. -->
        <line
          class="chart__axis"
          [attr.x1]="pad.left"
          [attr.x2]="view.width - pad.right"
          [attr.y1]="baseline"
          [attr.y2]="baseline"
        />

        @for (bar of bars(); track bar.label) {
          <g
            class="chart__group"
            [class.chart__group--active]="hovered() === bar.label"
            (pointerenter)="hovered.set(bar.label)"
          >
            <!-- Full-height hit target: easier to hover than the column itself. -->
            <rect
              class="chart__hit"
              [attr.x]="bar.x"
              [attr.y]="pad.top"
              [attr.width]="bar.width"
              [attr.height]="baseline - pad.top"
            />
            <rect
              class="chart__bar"
              [class.chart__bar--latest]="bar.latest"
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.width"
              [attr.height]="bar.height"
              [attr.rx]="radius"
            />
            <text class="chart__tick" [attr.x]="bar.centre" [attr.y]="view.height - 8">
              {{ bar.label }}
            </text>
            @if (bar.latest || hovered() === bar.label) {
              <text class="chart__value" [attr.x]="bar.centre" [attr.y]="bar.y - 7">
                {{ bar.value }}
              </text>
            }
          </g>
        }
      </svg>
      <figcaption class="visually-hidden">{{ ariaLabel() }}</figcaption>
    </figure>
  `,
  styleUrl: './trend-chart.component.scss',
})
export class TrendChartComponent {
  readonly points = input.required<readonly TrendPoint[]>();
  readonly unit = input('');

  protected readonly view = { width: VIEW_WIDTH, height: VIEW_HEIGHT };
  protected readonly pad = PADDING;
  protected readonly radius = RADIUS;
  protected readonly baseline = VIEW_HEIGHT - PADDING.bottom;

  protected readonly hovered = signal<string | null>(null);

  protected readonly bars = computed(() => {
    const points = this.points();
    if (points.length === 0) {
      return [];
    }

    const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = this.baseline - PADDING.top;
    const slot = plotWidth / points.length;
    const width = Math.max(slot - BAR_GAP, 6);
    // Scaled with headroom so the tallest column never touches the top label.
    const max = Math.max(...points.map((point) => point.value)) * 1.12 || 1;

    return points.map((point, index) => {
      const height = Math.max((point.value / max) * plotHeight, RADIUS);
      const x = PADDING.left + index * slot + (slot - width) / 2;
      return {
        label: point.label,
        value: point.value,
        x,
        width,
        centre: x + width / 2,
        y: this.baseline - height,
        height,
        latest: index === points.length - 1,
      };
    });
  });

  protected readonly ariaLabel = computed(() => {
    const summary = this.points()
      .map((point) => `${point.label} ${point.value}${this.unit()}`)
      .join(', ');
    return `Sales trend: ${summary}`;
  });
}
