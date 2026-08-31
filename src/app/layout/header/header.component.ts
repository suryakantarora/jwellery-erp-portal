import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { BranchSelectorComponent } from '../branch-selector/branch-selector.component';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { NotificationCenterComponent } from '../notifications/notification-center.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Top bar: brand, global search, branch, notifications and the account menu. */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    GlobalSearchComponent,
    BranchSelectorComponent,
    NotificationCenterComponent,
    UserMenuComponent,
  ],
  template: `
    <header class="header">
      <div class="header__brand">
        <button
          type="button"
          class="btn btn--ghost btn--icon header__toggle"
          [attr.aria-label]="sidebarCollapsed() ? 'Expand navigation' : 'Collapse navigation'"
          (click)="toggleSidebar.emit()"
        >
          <app-icon name="menu" [size]="18" />
        </button>

        <a class="header__logo" routerLink="/dashboard" aria-label="Jewellery ERP home">
          <app-icon name="gem" [size]="22" [strokeWidth]="1.3" />
          <span class="header__logo-text">
            <span class="header__logo-name">Jewellery</span>
            <span class="header__logo-suffix">ERP</span>
          </span>
        </a>
      </div>

      <div class="header__search">
        <app-global-search />
      </div>

      <div class="header__actions">
        <app-branch-selector />
        <app-notification-center />
        <app-user-menu />
      </div>
    </header>
  `,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly sidebarCollapsed = input(false);
  readonly toggleSidebar = output<void>();
}
