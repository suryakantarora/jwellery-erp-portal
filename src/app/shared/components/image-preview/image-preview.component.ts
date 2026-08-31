import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FileService } from '../../../core/services/file.service';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * Renders an image held in file storage.
 *
 * The download endpoint requires a bearer token, so the bytes are fetched over
 * `HttpClient` and shown from an object URL — a plain `<img src>` pointed at the
 * API would come back 401. Object URLs are revoked when the key changes or the
 * component goes away.
 */
@Component({
  selector: 'app-image-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpinnerComponent],
  template: `
    <figure class="preview" [style.aspect-ratio]="ratio()">
      @if (objectUrl(); as url) {
        <img class="preview__image" [src]="url" [alt]="alt()" />
      } @else if (loading()) {
        <app-spinner [size]="18" />
      } @else {
        <span class="preview__placeholder">
          <app-icon name="image" [size]="22" [strokeWidth]="1.3" />
        </span>
      }
    </figure>
  `,
  styles: `
    .preview {
      display: grid;
      place-items: center;
      margin: 0;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--surface-sunken);
      color: var(--text-muted);
    }

    .preview__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class ImagePreviewComponent {
  private readonly files = inject(FileService);

  /** Storage key of the image; null renders the placeholder. */
  readonly storageKey = input<string | null>(null);
  readonly alt = input('');
  readonly ratio = input('1 / 1');

  protected readonly objectUrl = signal<string | null>(null);
  protected readonly loading = signal(false);

  constructor() {
    effect((onCleanup) => {
      const key = this.storageKey();
      this.release();

      if (!key) {
        return;
      }

      this.loading.set(true);
      const subscription = this.files.objectUrl(key).subscribe({
        next: (url) => {
          this.objectUrl.set(url);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

      onCleanup(() => {
        subscription.unsubscribe();
        this.release();
      });
    });
  }

  private release(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrl.set(null);
    }
  }
}
