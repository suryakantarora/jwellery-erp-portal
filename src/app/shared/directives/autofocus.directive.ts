import { afterNextRender, Directive, ElementRef, inject, input } from '@angular/core';

/** Focuses the host once it is rendered — the first field of a drawer form. */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly appAutofocus = input(true, { transform: (value: unknown) => value !== false });

  constructor() {
    afterNextRender(() => {
      if (this.appAutofocus()) {
        this.element.nativeElement.focus();
      }
    });
  }
}
