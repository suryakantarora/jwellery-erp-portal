import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tone } from '../../../core/models/ui.model';

/**
 * Status pill.
 *
 * Common domain statuses map to a tone automatically so a list does not have to
 * repeat the mapping; pass `tone` explicitly to override.
 */
const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'success',
  AVAILABLE: 'success',
  APPROVED: 'success',
  COMPLETED: 'success',
  RECEIVED: 'success',
  VERIFIED: 'success',
  INACTIVE: 'neutral',
  DRAFT: 'neutral',
  CLOSED: 'neutral',
  ARCHIVED: 'neutral',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  IN_TRANSIT: 'warning',
  RESERVED: 'warning',
  UNDER_REPAIR: 'warning',
  ON_HOLD: 'warning',
  LOCKED: 'danger',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  FAILED: 'danger',
  SCRAPPED: 'danger',
  SOLD: 'info',
  EXCHANGED: 'info',
  RETURNED: 'info',
  BUYBACK: 'info',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + resolvedTone()">
      @if (dot()) {
        <span class="badge__dot" aria-hidden="true"></span>
      }
      {{ display() }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 2px var(--space-2);
      border-radius: var(--radius-xs);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .badge__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentcolor;
    }

    .badge--neutral {
      background: var(--neutral-soft);
      color: var(--neutral-soft-text);
    }
    .badge--accent {
      background: var(--accent-soft);
      color: var(--accent-soft-text);
    }
    .badge--success {
      background: var(--success-soft);
      color: var(--success-text);
    }
    .badge--warning {
      background: var(--warning-soft);
      color: var(--warning-text);
    }
    .badge--danger {
      background: var(--danger-soft);
      color: var(--danger-text);
    }
    .badge--info {
      background: var(--info-soft);
      color: var(--info-text);
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input<string | null>(null);
  readonly tone = input<Tone | null>(null);
  readonly label = input<string | null>(null);
  readonly dot = input(true);

  protected readonly resolvedTone = computed<Tone>(
    () => this.tone() ?? STATUS_TONES[this.status()?.toUpperCase() ?? ''] ?? 'neutral',
  );

  /** Turns SCREAMING_SNAKE statuses into readable text. */
  protected readonly display = computed(() => {
    const explicit = this.label();
    if (explicit) {
      return explicit;
    }
    const status = this.status();
    if (!status) {
      return '—';
    }
    return status
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });
}
