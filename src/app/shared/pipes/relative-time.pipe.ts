import { Pipe, PipeTransform } from '@angular/core';

const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * Renders an ISO timestamp as "3 hours ago".
 *
 * Impure would re-render constantly; list timestamps are refreshed when the
 * list itself reloads, which is accurate enough for an ERP audit trail.
 */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  private readonly formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '—';
    }

    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '—';
    }

    const elapsed = timestamp - Date.now();
    const magnitude = Math.abs(elapsed);

    for (const [unit, ms] of UNITS) {
      if (magnitude >= ms) {
        return this.formatter.format(Math.round(elapsed / ms), unit);
      }
    }
    return 'just now';
  }
}
