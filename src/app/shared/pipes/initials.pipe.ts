import { Pipe, PipeTransform } from '@angular/core';

/** Reduces a person's name to at most two initials for an avatar. */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const parts = (value ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
}
