/** Visual tone shared by badges, toasts and empty states. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface Toast {
  readonly id: number;
  readonly tone: Tone;
  readonly title: string;
  readonly detail?: string;
  /** Milliseconds before auto-dismiss; 0 keeps the toast until dismissed. */
  readonly duration: number;
}

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly tone?: 'default' | 'danger';
  /** Extra line rendered in a muted style, e.g. the record being affected. */
  readonly detail?: string;
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly link?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly column: string;
  readonly direction: SortDirection;
}
