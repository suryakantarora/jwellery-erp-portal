import { Injectable, signal } from '@angular/core';
import { Toast, Tone } from '../models/ui.model';

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;

/**
 * Global notification queue rendered by the toast host in the app shell.
 *
 * Kept in the core layer so any service — including HTTP interceptors — can
 * surface feedback without reaching into a component.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Current queue, oldest first. */
  readonly toasts = this.items.asReadonly();

  success(title: string, detail?: string): number {
    return this.show('success', title, detail);
  }

  error(title: string, detail?: string): number {
    return this.show('danger', title, detail, ERROR_DURATION);
  }

  warning(title: string, detail?: string): number {
    return this.show('warning', title, detail);
  }

  info(title: string, detail?: string): number {
    return this.show('info', title, detail);
  }

  show(tone: Tone, title: string, detail?: string, duration = DEFAULT_DURATION): number {
    const id = this.nextId++;
    this.items.update((current) => [...current, { id, tone, title, detail, duration }]);

    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((current) => current.filter((toast) => toast.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.items.set([]);
  }
}
