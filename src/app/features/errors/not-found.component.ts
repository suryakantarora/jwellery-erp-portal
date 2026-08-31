import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ErrorPageComponent } from './error-page.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorPageComponent],
  template: `
    <app-error-page
      code="404"
      title="Page not found"
      message="The page you are looking for does not exist or has moved."
      icon="search"
    />
  `,
})
export class NotFoundComponent {}
