import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ROOT_URL } from '../config/api.config';
import { ApiResponse, PageQuery, PageResponse } from '../models/api.model';

/** Values acceptable as a query-string parameter. */
export type QueryValue = string | number | boolean | null | undefined | readonly string[];
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  readonly params?: QueryParams;
  readonly context?: HttpContext;
}

/**
 * The single gateway to the backend.
 *
 * It resolves relative endpoint paths against the configured API root and
 * unwraps the `ApiResponse` envelope, so feature services deal in domain types
 * only. Errors are left to propagate: the HTTP interceptors normalise them.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly root = inject(API_ROOT_URL);

  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), this.httpOptions(options))
      .pipe(map((response) => response.data));
  }

  getPage<T>(path: string, query: PageQuery & QueryParams = {}): Observable<PageResponse<T>> {
    return this.get<PageResponse<T>>(path, { params: query });
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body ?? {}, this.httpOptions(options))
      .pipe(map((response) => response.data));
  }

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body ?? {}, this.httpOptions(options))
      .pipe(map((response) => response.data));
  }

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.url(path), body ?? {}, this.httpOptions(options))
      .pipe(map((response) => response.data));
  }

  delete<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(this.url(path), this.httpOptions(options))
      .pipe(map((response) => response.data));
  }

  /** Multipart upload against the backend's file-storage endpoints. */
  upload<T>(path: string, formData: FormData, options: RequestOptions = {}): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), formData, this.httpOptions(options))
      .pipe(map((response) => response.data));
  }

  /** Absolute URL for a relative endpoint path; passes absolute URLs through. */
  url(path: string): string {
    return /^https?:\/\//i.test(path) ? path : `${this.root}${path}`;
  }

  private httpOptions(options: RequestOptions) {
    return {
      params: buildParams(options.params),
      context: options.context,
    };
  }
}

/** Builds HttpParams, dropping empty values so blank filters are not sent. */
export function buildParams(source: QueryParams | undefined): HttpParams {
  let params = new HttpParams();
  if (!source) {
    return params;
  }

  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        params = params.append(key, entry);
      }
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}
