import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FileService, formatFileSize, StoredFile } from '../../../core/services/file.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppError } from '../../../core/models/api.model';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * Drag-and-drop upload that stores through the backend's file API and emits the
 * resulting storage key.
 *
 * The component never holds the bytes after the upload: business records
 * reference the key, which is what certificates, product images and customer
 * documents are all attached by.
 */
@Component({
  selector: 'app-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpinnerComponent],
  template: `
    <div
      class="upload"
      [class.upload--active]="dragging()"
      [class.upload--busy]="uploading()"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging.set(false)"
      (drop)="onDrop($event)"
    >
      <input
        #input
        type="file"
        class="upload__input"
        [accept]="accept()"
        [multiple]="multiple()"
        [attr.aria-label]="label()"
        (change)="onSelect($event)"
      />

      @if (uploading()) {
        <app-spinner [size]="20" [thickness]="2.5" />
        <p class="upload__title">Uploading…</p>
      } @else {
        <span class="upload__icon">
          <app-icon name="upload" [size]="20" />
        </span>
        <p class="upload__title">{{ label() }}</p>
        <p class="upload__hint">{{ hint() }}</p>
        <button type="button" class="btn btn--secondary btn--sm" (click)="input.click()">
          Choose {{ multiple() ? 'files' : 'a file' }}
        </button>
      }
    </div>

    @if (uploaded().length > 0) {
      <ul class="upload__list">
        @for (file of uploaded(); track file.storageKey) {
          <li class="upload__item">
            <app-icon name="file" [size]="16" />
            <span class="upload__name">{{ file.fileName }}</span>
            <span class="upload__size numeric">{{ size(file.sizeBytes) }}</span>
            <button
              type="button"
              class="btn btn--ghost btn--icon btn--sm"
              (click)="remove(file)"
              [attr.aria-label]="'Remove ' + file.fileName"
            >
              <app-icon name="close" [size]="14" />
            </button>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent {
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);

  readonly label = input('Drag a file here, or browse');
  readonly hint = input('JPG, PNG, WEBP or PDF up to 10 MB');
  readonly accept = input('image/jpeg,image/png,image/webp,application/pdf');
  readonly multiple = input(false);
  /** Storage category recorded against the upload, e.g. `certificates`. */
  readonly category = input('general');

  readonly fileUploaded = output<StoredFile>();
  readonly fileRemoved = output<StoredFile>();

  protected readonly dragging = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploaded = signal<StoredFile[]>([]);

  protected readonly size = formatFileSize;

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.accept_(event.dataTransfer?.files ?? null);
  }

  protected onSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.accept_(input.files);
    // Reset so re-picking the same file fires another change event.
    input.value = '';
  }

  protected remove(file: StoredFile): void {
    this.uploaded.update((current) => current.filter((item) => item !== file));
    this.fileRemoved.emit(file);
  }

  private accept_(list: FileList | null): void {
    if (!list || list.length === 0) {
      return;
    }
    const selection = this.multiple() ? Array.from(list) : [list[0]];
    for (const file of selection) {
      this.uploadOne(file);
    }
  }

  private uploadOne(file: File): void {
    this.uploading.set(true);
    this.files.upload(file, this.category()).subscribe({
      next: (stored) => {
        this.uploaded.update((current) => (this.multiple() ? [...current, stored] : [stored]));
        this.fileUploaded.emit(stored);
        this.uploading.set(false);
      },
      error: (error: AppError) => {
        this.uploading.set(false);
        this.toast.error(`Could not upload ${file.name}`, error.message);
      },
    });
  }
}
