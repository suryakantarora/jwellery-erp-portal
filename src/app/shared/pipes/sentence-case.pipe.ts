import { Pipe, PipeTransform } from '@angular/core';

/** Turns SCREAMING_SNAKE enum values from the backend into readable text. */
@Pipe({ name: 'sentenceCase' })
export class SentenceCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    return value
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
