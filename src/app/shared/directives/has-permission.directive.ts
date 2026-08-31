import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionCode } from '../../core/auth/permissions';

/**
 * Structural directive that renders its content only when the current user
 * holds the required permission(s).
 *
 * ```html
 * <button *appHasPermission="'BRANCH_MANAGE'">New branch</button>
 * <div *appHasPermission="['SALE_VIEW', 'REPORT_VIEW']">…</div>
 * ```
 *
 * This is a convenience for the operator, not a security boundary: the backend
 * enforces authorization on every call regardless of what the UI shows.
 */
@Directive({ selector: '[appHasPermission]' })
export class HasPermissionDirective {
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);

  readonly appHasPermission = input.required<PermissionCode | readonly PermissionCode[]>();
  /** Require every listed code rather than any one of them. */
  readonly appHasPermissionAll = input(false);

  private rendered = false;

  constructor() {
    effect(() => {
      const required = this.appHasPermission();
      const codes = Array.isArray(required) ? required : [required as PermissionCode];
      const allowed = this.appHasPermissionAll()
        ? this.auth.hasAllPermissions(codes)
        : this.auth.hasAnyPermission(codes);

      if (allowed && !this.rendered) {
        this.container.createEmbeddedView(this.template);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.container.clear();
        this.rendered = false;
      }
    });
  }
}
