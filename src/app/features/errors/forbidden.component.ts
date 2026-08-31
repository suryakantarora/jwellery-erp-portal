import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ErrorPageComponent } from './error-page.component';

/** Shown when a signed-in user opens a module their role does not include. */
@Component({
  selector: 'app-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorPageComponent],
  template: `
    <app-error-page
      code="403"
      title="You do not have access"
      message="Your role does not include this module. Contact your administrator if you believe this is a mistake."
      icon="lock"
    />
  `,
})
export class ForbiddenComponent {}
