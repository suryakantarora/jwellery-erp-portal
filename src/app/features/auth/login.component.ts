import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppError } from '../../core/models/api.model';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ThemeService } from '../../core/services/theme.service';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { applyServerErrors, touchAll } from '../../shared/utilities/form.utils';

/**
 * Sign-in page.
 *
 * Renders its own errors rather than relying on the global toast: a failed
 * login belongs next to the form the operator is about to retype.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    IconComponent,
    SpinnerComponent,
    AutofocusDirective,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly branches = inject(BranchContextService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly theme = inject(ThemeService);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected submit(): void {
    this.submitted.set(true);
    this.failure.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.branches.load();
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl ?? '/dashboard');
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        const unmatched = applyServerErrors(this.form, error);
        this.failure.set(
          error.status === 401 || error.status === 403
            ? 'The username or password is incorrect.'
            : (unmatched[0] ?? error.message),
        );
      },
    });
  }
}
