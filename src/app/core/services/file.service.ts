import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiEndpoints } from '../config/api.endpoints';
import { ApiService, buildParams } from './api.service';

/**
 * Metadata returned when a file is stored. The `storageKey` is what a business
 * record keeps; the bytes themselves are fetched separately.
 */
export interface StoredFile {
  readonly storageKey: string;
  readonly fileName: string;
  readonly contentType: string | null;
  readonly sizeBytes: number;
}

/** Upload and download against the backend's file-storage endpoints. */
@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  upload(file: File, category = 'general'): Observable<StoredFile> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('category', category);
    return this.api.upload<StoredFile>(ApiEndpoints.files.upload, form);
  }

  /**
   * Fetches a stored file as a blob.
   *
   * The download endpoint is authenticated, so the bytes have to come through
   * `HttpClient` (which carries the bearer token) rather than a plain `<a href>`
   * or `<img src>`.
   */
  download(storageKey: string): Observable<Blob> {
    return this.http.get(this.api.url(ApiEndpoints.files.upload), {
      params: buildParams({ key: storageKey }),
      responseType: 'blob',
    });
  }

  /** Object URL for previewing a stored image. Revoke it when finished. */
  objectUrl(storageKey: string): Observable<string> {
    return this.download(storageKey).pipe(map((blob) => URL.createObjectURL(blob)));
  }

  /** Triggers a browser save of a stored file. */
  saveAs(storageKey: string, fileName: string): Observable<void> {
    return this.download(storageKey).pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }),
    );
  }
}

/** Formats a byte count for display, e.g. `1.4 MB`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
