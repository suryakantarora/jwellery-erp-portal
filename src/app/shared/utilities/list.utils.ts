import { PageResponse } from '../../core/models/api.model';
import { TableSort } from '../components/data-table/data-table.model';

/**
 * Client-side search, sort and paging for the endpoints that return a plain
 * array rather than a `PageResponse` — companies, locations, roles and the
 * permission catalogue.
 *
 * These lists are bounded by the organisation's own structure (tens of rows,
 * not millions), so filtering them in the browser keeps the list screens
 * identical in behaviour to the server-paged ones without asking the backend
 * for pagination it does not offer.
 */
export interface LocalListOptions<T> {
  readonly search: string;
  /** Fields searched, case-insensitively, against `search`. */
  readonly searchFields: ReadonlyArray<(row: T) => string | null | undefined>;
  readonly sort: TableSort | null;
  /** Sort value per column key; falls back to the row's own property. */
  readonly sortValues?: Readonly<Record<string, (row: T) => string | number | boolean | null>>;
  readonly page: number;
  readonly size: number;
}

export function localPage<T>(rows: readonly T[], options: LocalListOptions<T>): PageResponse<T> {
  const term = options.search.trim().toLowerCase();

  const matched = term
    ? rows.filter((row) =>
        options.searchFields.some((field) => (field(row) ?? '').toLowerCase().includes(term)),
      )
    : [...rows];

  const sorted = options.sort ? sortRows(matched, options) : matched;

  const totalElements = sorted.length;
  const totalPages = Math.max(Math.ceil(totalElements / options.size), 1);
  const page = Math.min(options.page, totalPages - 1);
  const start = page * options.size;

  return {
    content: sorted.slice(start, start + options.size),
    page,
    size: options.size,
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
  };
}

function sortRows<T>(rows: T[], options: LocalListOptions<T>): T[] {
  const sort = options.sort;
  if (!sort) {
    return rows;
  }

  const read =
    options.sortValues?.[sort.field] ??
    ((row: T) => (row as Record<string, never>)[sort.field] ?? null);
  const factor = sort.direction === 'asc' ? 1 : -1;

  return rows.sort((left, right) => factor * compare(read(left), read(right)));
}

function compare(
  left: string | number | boolean | null,
  right: string | number | boolean | null,
): number {
  if (left === right) {
    return 0;
  }
  // Blanks sort last regardless of direction, so an unfilled column never
  // pushes populated rows off the first page.
  if (left === null || left === '') {
    return 1;
  }
  if (right === null || right === '') {
    return -1;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right, undefined, { sensitivity: 'base' });
  }
  return Number(left) < Number(right) ? -1 : 1;
}
