import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AppError } from '../../core/models/api.model';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService, ThemePreference } from '../../core/services/theme.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { applyServerErrors, touchAll } from '../../shared/utilities/form.utils';

/**
 * The signed-in user's own profile.
 *
 * Read-only identity — user records are administered in Phase 2 — plus the two
 * things a user changes for themselves: their password and their theme.
 */
@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    SpinnerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly mismatch = signal(false);

  protected readonly themeOptions: ReadonlyArray<{ value: ThemePreference; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Match system' },
  ];

  protected changePassword(): void {
    this.submitted.set(true);
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();

    this.mismatch.set(newPassword !== confirmPassword);

    if (this.form.invalid || this.mismatch()) {
      touchAll(this.form);
      return;
    }

    this.submitting.set(true);
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(false);
        this.form.reset();
        this.toast.success('Password changed', 'Use your new password the next time you sign in.');
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.toast.error('Could not change password', unmatched[0] ?? error.message);
      },
    });
  }
}
