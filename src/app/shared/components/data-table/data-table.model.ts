import { TemplateRef } from '@angular/core';
import { SortDirection } from '../../../core/models/ui.model';

/** Horizontal alignment of a column's cells and header. */
export type ColumnAlign = 'start' | 'center' | 'end';

/**
 * Declarative column definition.
 *
 * `value` covers the common case of rendering a scalar; a cell template
 * registered under the column key takes precedence when the cell needs badges,
 * links or actions.
 */
export interface TableColumn<T> {
  /** Stable key; also the sort field sent to the backend unless `sortField` is set. */
  readonly key: string;
  readonly header: string;
  /** Extracts the display value. Omit when a cell template is supplied. */
  readonly value?: (row: T) => string | number | null | undefined;
  readonly align?: ColumnAlign;
  readonly width?: string;
  readonly sortable?: boolean;
  /** Backend sort property when it differs from `key`. */
  readonly sortField?: string;
  /** Renders in a monospace face — useful for codes and identifiers. */
  readonly mono?: boolean;
  /** Tabular figures for numeric columns. */
  readonly numeric?: boolean;
  /** Hidden below the medium breakpoint to keep small screens readable. */
  readonly hideOnMobile?: boolean;
}

/** Cell template registered by a consumer for a given column. */
export interface CellTemplateContext<T> {
  readonly $implicit: T;
  readonly row: T;
  readonly index: number;
  readonly column: TableColumn<T>;
}

export type CellTemplates<T> = Readonly<Record<string, TemplateRef<CellTemplateContext<T>>>>;

export interface TableSort {
  readonly field: string;
  readonly direction: SortDirection;
}

/** Serialises a sort into the `property,direction` form Spring's Pageable expects. */
export function toSortParam(sort: TableSort | null): string | undefined {
  return sort ? `${sort.field},${sort.direction}` : undefined;
}
