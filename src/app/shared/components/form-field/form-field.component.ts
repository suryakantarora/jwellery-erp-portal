import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Human wording for the validators the portal uses. */
const MESSAGES: Record<string, (error: never) => string> = {
  required: () => 'This field is required.',
  email: () => 'Enter a valid email address.',
  minlength: (error: { requiredLength: number }) =>
    `Must be at least ${error.requiredLength} characters.`,
  maxlength: (error: { requiredLength: number }) =>
    `Must be at most ${error.requiredLength} characters.`,
  min: (error: { min: number }) => `Must be ${error.min} or more.`,
  max: (error: { max: number }) => `Must be ${error.max} or less.`,
  pattern: () => 'The format is not valid.',
  /** Set by a form after the backend returns a field-level error. */
  server: (error: { message: string }) => error.message,
};

/**
 * Label, hint and error wrapper around a projected control.
 *
 * Errors surface only once the control is touched or the form has been
 * submitted, so a blank form does not greet the operator in red. Server-side
 * field errors are attached by the form as a `server` error and render here
 * with the same treatment.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-field" [class.form-field--invalid]="showError()">
      @if (label()) {
        <label class="field-label" [attr.for]="for()">
          {{ label() }}
          @if (required()) {
            <span class="form-field__required" aria-hidden="true">*</span>
          }
        </label>
      }

      <ng-content />

      @if (showError()) {
        <p class="field-error" role="alert">{{ errorMessage() }}</p>
      } @else if (hint()) {
        <p class="field-hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .form-field {
      display: block;
    }

    .form-field__required {
      margin-left: 2px;
      color: var(--danger);
    }

    .form-field--invalid :is(.input, .select, .textarea) {
      border-color: var(--danger);
    }
  `,
})
export class FormFieldComponent {
  readonly label = input('');
  readonly hint = input('');
  readonly for = input('');
  readonly required = input(false);
  readonly control = input<AbstractControl | null>(null);
  /** Set by the page once the form has been submitted at least once. */
  readonly submitted = input(false);

  protected readonly showError = computed(() => {
    const control = this.control();
    if (!control || control.valid) {
      return false;
    }
    return control.touched || control.dirty || this.submitted();
  });

  protected readonly errorMessage = computed(() => {
    const errors: ValidationErrors | null = this.control()?.errors ?? null;
    if (!errors) {
      return '';
    }
    const [key, value] = Object.entries(errors)[0];
    const format = MESSAGES[key];
    return format ? format(value as never) : 'This value is not valid.';
  });
}
