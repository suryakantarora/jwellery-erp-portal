import { Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionCode } from '../../core/auth/permissions';

/**
 * Disables a control when the user lacks a permission, instead of hiding it.
 *
 * Preferred over {@link HasPermissionDirective} where the missing action would
 * otherwise leave a confusing hole in a toolbar — the operator can see the
 * capability exists and that it is not theirs.
 */
@Directive({ selector: '[appDisableWithoutPermission]' })
export class DisableWithoutPermissionDirective {
  private readonly auth = inject(AuthService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  readonly appDisableWithoutPermission = input.required<
    PermissionCode | readonly PermissionCode[]
  >();
  readonly deniedTitle = input('You do not have permission to perform this action');

  constructor() {
    effect(() => {
      const required = this.appDisableWithoutPermission();
      const codes = Array.isArray(required) ? required : [required as PermissionCode];
      const allowed = this.auth.hasAnyPermission(codes);
      const node = this.element.nativeElement;

      if (allowed) {
        this.renderer.removeAttribute(node, 'disabled');
        this.renderer.removeAttribute(node, 'aria-disabled');
        this.renderer.removeAttribute(node, 'title');
      } else {
        this.renderer.setAttribute(node, 'disabled', 'true');
        this.renderer.setAttribute(node, 'aria-disabled', 'true');
        this.renderer.setAttribute(node, 'title', this.deniedTitle());
      }
    });
  }
}
