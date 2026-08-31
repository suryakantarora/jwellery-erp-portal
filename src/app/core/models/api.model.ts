/** Success envelope returned by every backend endpoint. */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message: string | null;
  readonly timestamp: string;
}

/** Transport shape of the backend's paginated list endpoints. */
export interface PageResponse<T> {
  readonly content: T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly last: boolean;
}

/** Field-level validation failure attached to a 400 response. */
export interface ApiFieldError {
  readonly field: string;
  readonly message: string;
}

/** Error payload returned by the backend's global exception handler. */
export interface ApiErrorBody {
  readonly success: false;
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly correlationId: string | null;
  readonly fieldErrors: ApiFieldError[] | null;
  readonly timestamp: string;
}

/**
 * Normalised error every consumer in the app sees, whether the failure came
 * from the backend, the network or the browser.
 */
export interface AppError {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  /** Backend error code, or a synthetic one such as NETWORK_ERROR. */
  readonly code: string;
  readonly message: string;
  readonly fieldErrors: readonly ApiFieldError[];
  readonly correlationId: string | null;
}

/** Query parameters shared by the backend's Pageable-backed list endpoints. */
export interface PageQuery {
  readonly page?: number;
  readonly size?: number;
  /** Spring sort expression, e.g. `code,asc`. */
  readonly sort?: string;
}

export function emptyPage<T>(size: number): PageResponse<T> {
  return { content: [], page: 0, size, totalElements: 0, totalPages: 0, last: true };
}
