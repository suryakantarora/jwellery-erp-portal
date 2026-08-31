import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../../../core/models/ui.model';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

/** One moment on a timeline, whatever the module it came from. */
export interface TimelineEntry {
  readonly id: string;
  readonly title: string;
  readonly detail?: string | null;
  readonly meta?: string | null;
  readonly at: string;
  readonly tone?: Tone;
}

/**
 * A vertical history of events.
 *
 * Deliberately generic: an item's lifecycle, a customer's relationship and a
 * repair's progress are all "things that happened, newest first", so they share
 * one component rather than three that drift apart.
 */
@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RelativeTimePipe],
  template: `
    @if (entries().length === 0) {
      <p class="muted">{{ emptyMessage() }}</p>
    } @else {
      <ol class="timeline">
        @for (entry of entries(); track entry.id) {
          <li class="timeline__event">
            <span
              class="timeline__marker"
              [class]="'timeline__marker--' + (entry.tone ?? 'accent')"
              aria-hidden="true"
            ></span>
            <div>
              <p class="timeline__title">{{ entry.title }}</p>
              @if (entry.detail) {
                <p class="timeline__detail">{{ entry.detail }}</p>
              }
              <p class="timeline__meta">
                {{ entry.at | relativeTime }}
                @if (entry.meta) {
                  · {{ entry.meta }}
                }
              </p>
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .timeline {
      display: grid;
      gap: var(--space-4);
      margin: 0;
      padding: 0 0 0 var(--space-2);
      list-style: none;
    }

    .timeline__event {
      position: relative;
      padding-left: var(--space-5);

      &::before {
        content: '';
        position: absolute;
        top: 14px;
        bottom: -22px;
        left: 4px;
        width: 1px;
        background: var(--border-subtle);
      }

      &:last-child::before {
        display: none;
      }
    }

    .timeline__marker {
      position: absolute;
      top: 5px;
      left: 0;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent);
    }

    .timeline__marker--success {
      background: var(--success);
    }
    .timeline__marker--warning {
      background: var(--warning);
    }
    .timeline__marker--danger {
      background: var(--danger);
    }
    .timeline__marker--info {
      background: var(--info);
    }
    .timeline__marker--neutral {
      background: var(--text-muted);
    }

    .timeline__title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .timeline__detail {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    .timeline__meta {
      margin-top: 2px;
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
  `,
})
export class TimelineComponent {
  readonly entries = input.required<readonly TimelineEntry[]>();
  readonly emptyMessage = input('Nothing has been recorded yet.');
}
