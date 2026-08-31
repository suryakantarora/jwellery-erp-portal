import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NavItem, NavSection, NAVIGATION } from '../navigation';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { NavigationEnd } from '@angular/router';

/**
 * Primary navigation.
 *
 * Sections and items are filtered against the user's permissions, so an
 * operator never sees a module they cannot open. Groups auto-expand when the
 * active route is inside them; collapsing the whole rail switches to
 * icon-only, with groups opening as fly-outs.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly collapsed = input(false);
  readonly navigate = output<void>();

  /**
   * The group the operator has explicitly opened, or `null` for "follow the
   * route".
   *
   * One group is open at a time: opening another closes the previous one, which
   * is what keeps a long navigation readable.
   */
  private readonly openedGroup = signal<string | null>(null);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Navigation filtered down to what the current user may see. */
  protected readonly sections = computed<NavSection[]>(() => {
    // Read the permission set so the menu rebuilds when the profile arrives.
    this.auth.permissions();

    return NAVIGATION.map((section) => ({
      label: section.label,
      items: section.items
        .filter((item) => this.canSee(item.permissions))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => this.canSee(child.permissions)),
        }))
        .filter((item) => item.route || (item.children?.length ?? 0) > 0),
    })).filter((section) => section.items.length > 0);
  });

  /** The group containing the current route, if any. */
  private readonly routeGroup = computed<string | null>(() => {
    const url = this.currentUrl();
    for (const section of this.sections()) {
      for (const item of section.items) {
        if (this.matchChild(item, url)) {
          return item.label;
        }
      }
    }
    return null;
  });

  /**
   * Exactly one group is open: whichever the operator last opened, falling back
   * to the one holding the current route.
   */
  protected isExpanded(item: NavItem): boolean {
    const opened = this.openedGroup();
    return opened === null ? this.routeGroup() === item.label : opened === item.label;
  }

  protected toggle(item: NavItem): void {
    // '' means "explicitly closed", which is different from null's "follow the
    // route" — otherwise closing the group holding the current page would
    // immediately reopen it.
    this.openedGroup.set(this.isExpanded(item) ? '' : item.label);
  }

  protected containsActiveRoute(item: NavItem): boolean {
    return this.routeGroup() === item.label;
  }

  /**
   * The child that owns the current URL.
   *
   * Sibling routes nest — `/products` and `/products/designs` both prefix the
   * same URL — so the longest match wins and only one child ever highlights.
   * A deeper page such as `/products/<id>` therefore lights up Catalogue.
   */
  protected activeChild(item: NavItem): string | null {
    return this.matchChild(item, this.currentUrl());
  }

  private matchChild(item: NavItem, url: string): string | null {
    let best: string | null = null;
    for (const child of item.children ?? []) {
      if (
        url === child.route ||
        url.startsWith(`${child.route}/`) ||
        url.startsWith(`${child.route}?`)
      ) {
        if (!best || child.route.length > best.length) {
          best = child.route;
        }
      }
    }
    return best;
  }

  private canSee(permissions: readonly string[] | undefined): boolean {
    return !permissions || permissions.length === 0 || this.auth.hasAnyPermission(permissions);
  }
}
