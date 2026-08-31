import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AppError } from '../../../core/models/api.model';
import { JewelleryItem } from '../../../core/models/inventory.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { InventoryService } from '../inventory.service';

/**
 * The portal's single scanning entry point.
 *
 * Every handheld barcode and QR reader in a showroom behaves as a keyboard: it
 * types the code and presses Enter. That is all this component needs, which is
 * why it works today with no device integration at all.
 *
 * RFID readers and camera-based QR scanning do need a device bridge. Rather
 * than guess at one, this component exposes `resolve()` as the single place a
 * future integration hands a tag in — a reader driver only has to call it, and
 * every screen that already embeds this box gains scanning for free.
 */
@Component({
  selector: 'app-scan-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpinnerComponent],
  template: `
    <div class="scan">
      <span class="scan__icon" aria-hidden="true">
        <app-icon name="search" [size]="16" />
      </span>
      <input
        #field
        type="text"
        class="input scan__input"
        placeholder="Scan or type an RFID, QR or barcode…"
        aria-label="Scan a tag"
        autocomplete="off"
        [disabled]="busy()"
        (keydown.enter)="resolve(field.value); field.value = ''"
      />
      @if (busy()) {
        <span class="scan__status"><app-spinner [size]="14" /></span>
      }
    </div>

    @if (message(); as text) {
      <p class="scan__message" role="status">{{ text }}</p>
    }
  `,
  styles: `
    .scan {
      position: relative;
      width: 320px;
      max-width: 100%;
    }

    .scan__icon {
      position: absolute;
      top: 50%;
      left: var(--space-3);
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .scan__input {
      padding-left: var(--space-8);
    }

    .scan__status {
      position: absolute;
      top: 50%;
      right: var(--space-3);
      transform: translateY(-50%);
    }

    .scan__message {
      margin-top: var(--space-1);
      font-size: var(--text-xs);
      color: var(--danger-text);
    }
  `,
})
export class ScanBoxComponent {
  private readonly inventory = inject(InventoryService);

  readonly found = output<JewelleryItem>();

  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);

  /**
   * Resolves a tag to an item.
   *
   * Public so a reader integration can push a tag in without synthesising
   * keyboard events.
   */
  resolve(tag: string): void {
    const trimmed = tag.trim();
    if (!trimmed || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.message.set(null);
    this.inventory.findByTag(trimmed).subscribe({
      next: (item) => {
        this.busy.set(false);
        this.found.emit(item);
      },
      error: (error: AppError) => {
        this.busy.set(false);
        this.message.set(
          error.status === 404 ? `No item carries the tag “${trimmed}”.` : error.message,
        );
      },
    });
  }
}
