import { AbstractControl, FormGroup } from '@angular/forms';
import { AppError } from '../../core/models/api.model';

/**
 * Marks every control touched so validation messages appear for fields the
 * operator never visited. Call this when a submit is rejected client-side.
 */
export function touchAll(group: FormGroup): void {
  group.markAllAsTouched();
  for (const control of Object.values(group.controls)) {
    if (control instanceof FormGroup) {
      touchAll(control);
    }
  }
}

/**
 * Projects a backend validation failure onto the matching controls.
 *
 * Returns the messages that had no matching control, so the caller can show
 * those at form level rather than losing them.
 */
export function applyServerErrors(group: FormGroup, error: AppError): string[] {
  const unmatched: string[] = [];

  for (const fieldError of error.fieldErrors) {
    const control: AbstractControl | null = group.get(fieldError.field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: { message: fieldError.message } });
      control.markAsTouched();
    } else {
      unmatched.push(fieldError.message);
    }
  }

  return unmatched;
}

/** Strips empty strings so optional fields are sent as null, not "". */
export function nullifyBlanks<T extends Record<string, unknown>>(value: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = typeof entry === 'string' && entry.trim() === '' ? null : entry;
  }
  return result as T;
}
