import { DOCUMENT, Directive, ElementRef, inject, OnDestroy, output } from '@angular/core';

/**
 * Emits when a pointer press lands outside the host.
 *
 * Bound on `mousedown` rather than `click` so a menu closes as soon as the
 * press begins, matching how native menus behave.
 */
@Directive({ selector: '[appClickOutside]' })
export class ClickOutsideDirective implements OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  readonly appClickOutside = output<void>();

  private readonly handler = (event: Event) => {
    const target = event.target as Node | null;
    if (target && !this.element.nativeElement.contains(target)) {
      this.appClickOutside.emit();
    }
  };

  constructor() {
    // Capture phase: a stopPropagation() inside an unrelated menu must not stop
    // this one from closing.
    this.document.addEventListener('mousedown', this.handler, true);
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('mousedown', this.handler, true);
  }
}
