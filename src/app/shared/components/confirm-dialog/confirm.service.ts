import { Injectable, signal } from '@angular/core';
import { ConfirmOptions } from '../../../core/models/ui.model';

interface PendingConfirm {
  readonly options: ConfirmOptions;
  readonly resolve: (confirmed: boolean) => void;
}

/**
 * Promise-based confirmation prompt.
 *
 * A single host in the app shell renders whatever is queued here, so a service
 * or component can ask for confirmation without owning any dialog markup:
 *
 * ```ts
 * if (await this.confirm.ask({ title: 'Deactivate branch', ... })) { … }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly pending = signal<PendingConfirm | null>(null);
  private readonly busy = signal(false);

  readonly request = this.pending.asReadonly();
  readonly isBusy = this.busy.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    // Only one prompt at a time; a queued second question would be answered by
    // an operator who cannot see what they are agreeing to.
    this.pending()?.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.pending.set({ options, resolve });
    });
  }

  /** Convenience for destructive actions, which default to the danger tone. */
  askDestructive(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
    return this.ask({ title, message, confirmLabel, tone: 'danger' });
  }

  resolve(confirmed: boolean): void {
    const request = this.pending();
    if (!request) {
      return;
    }
    this.pending.set(null);
    this.busy.set(false);
    request.resolve(confirmed);
  }
}
