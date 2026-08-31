import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BreadcrumbItem } from '../../core/models/ui.model';

/**
 * Derives the breadcrumb trail from the active route.
 *
 * Every route carries a `breadcrumb` label in its data; a detail page whose
 * label is only known after loading the record calls {@link setLeaf} to replace
 * the last crumb with, say, the item's code.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly leafOverride = signal<string | null>(null);

  private readonly routeTrail = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.buildTrail()),
    ),
    { initialValue: [] as BreadcrumbItem[] },
  );

  readonly trail = computed<BreadcrumbItem[]>(() => {
    const trail = this.routeTrail();
    const override = this.leafOverride();

    if (!override || trail.length === 0) {
      return trail;
    }
    return [...trail.slice(0, -1), { ...trail[trail.length - 1], label: override }];
  });

  /** Title of the current page, taken from the last crumb. */
  readonly currentTitle = computed(() => this.trail().at(-1)?.label ?? '');

  /** Replaces the last crumb's label once a record's name is known. */
  setLeaf(label: string | null): void {
    this.leafOverride.set(label);
  }

  private buildTrail(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    const segments: string[] = [];

    let route: ActivatedRoute | null = this.route.root;

    while (route) {
      const path = route.snapshot.url.map((segment) => segment.path).join('/');
      if (path) {
        segments.push(path);
      }

      const label = route.snapshot.data['breadcrumb'] as string | undefined;
      if (label) {
        items.push({ label, link: '/' + segments.join('/') });
      }

      route = route.firstChild;
    }

    // The current page is not a link.
    if (items.length > 0) {
      items[items.length - 1] = { label: items[items.length - 1].label };
    }
    return items;
  }
}
