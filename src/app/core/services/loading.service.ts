import { computed, Injectable, signal } from '@angular/core';

/**
 * Counts in-flight HTTP requests so the shell can show a single global
 * progress bar. A counter rather than a boolean, because overlapping requests
 * must not let the first one to finish hide the indicator.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);

  readonly isLoading = computed(() => this.pending() > 0);

  start(): void {
    this.pending.update((count) => count + 1);
  }

  stop(): void {
    this.pending.update((count) => Math.max(0, count - 1));
  }

  reset(): void {
    this.pending.set(0);
  }
}
