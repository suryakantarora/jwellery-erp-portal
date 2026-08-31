import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { StorageKeys } from '../../core/config/api.config';
import { AuthService } from '../../core/auth/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { LoadingService } from '../../core/services/loading.service';
import { StorageService } from '../../core/services/storage.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

/**
 * The authenticated application frame: header, sidebar, breadcrumb and the
 * routed page.
 *
 * Below the medium breakpoint the sidebar becomes an overlay drawer that closes
 * on navigation; above it, the collapsed/expanded choice is remembered.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, BreadcrumbComponent],
  template: `
    <div class="shell" [class.shell--collapsed]="collapsed()">
      <app-header
        class="shell__header"
        [sidebarCollapsed]="collapsed()"
        (toggleSidebar)="toggleSidebar()"
      />

      @if (loading.isLoading()) {
        <div class="shell__progress" role="progressbar" aria-label="Loading"></div>
      }

      <div class="shell__body">
        <app-sidebar
          class="shell__sidebar"
          [class.shell__sidebar--open]="mobileOpen()"
          [collapsed]="collapsed()"
          (navigate)="mobileOpen.set(false)"
        />

        @if (mobileOpen()) {
          <div class="shell__scrim" (click)="mobileOpen.set(false)" aria-hidden="true"></div>
        }

        <main class="shell__main" id="main-content" tabindex="-1">
          <div class="shell__content">
            <app-breadcrumb />
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly branches = inject(BranchContextService);
  private readonly router = inject(Router);

  protected readonly loading = inject(LoadingService);

  protected readonly collapsed = signal(this.storage.read(StorageKeys.sidebarCollapsed) === 'true');
  protected readonly mobileOpen = signal(false);

  private readonly isDesktop = signal(
    typeof window === 'undefined' ? true : window.innerWidth > 960,
  );

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // Branch list depends on the profile, which the app initializer resolves
    // before the shell renders; reload it whenever the signed-in user changes.
    effect(() => {
      if (this.auth.user()) {
        this.branches.load();
      }
    });

    // A navigation on a small screen closes the overlay sidebar.
    effect(() => {
      this.currentUrl();
      if (!this.isDesktop()) {
        this.mobileOpen.set(false);
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.isDesktop.set(window.innerWidth > 960), {
        passive: true,
      });
    }
  }

  protected toggleSidebar(): void {
    if (this.isDesktop()) {
      const next = !this.collapsed();
      this.collapsed.set(next);
      this.storage.write(StorageKeys.sidebarCollapsed, String(next));
    } else {
      this.mobileOpen.set(!this.mobileOpen());
    }
  }
}
