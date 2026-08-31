import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

/** Header avatar menu: identity, roles, theme preference, and sign out. */
@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ClickOutsideDirective, IconComponent, InitialsPipe, RelativeTimePipe],
  template: `
    <div class="user-menu" (appClickOutside)="open.set(false)">
      <button
        type="button"
        class="user-menu__trigger"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
        aria-label="Account menu"
        (click)="open.set(!open())"
      >
        <span class="user-menu__avatar">{{ auth.user()?.fullName | initials }}</span>
      </button>

      @if (open()) {
        <div class="user-menu__panel" role="menu">
          <div class="user-menu__identity">
            <span class="user-menu__avatar user-menu__avatar--lg">
              {{ auth.user()?.fullName | initials }}
            </span>
            <div class="user-menu__identity-text">
              <p class="user-menu__name">{{ auth.user()?.fullName }}</p>
              <p class="user-menu__meta">{{ auth.user()?.email || auth.user()?.username }}</p>
              @if (auth.roles().length > 0) {
                <p class="user-menu__roles">{{ auth.roles().join(' · ') }}</p>
              }
            </div>
          </div>

          @if (auth.user()?.lastLoginAt; as lastLogin) {
            <p class="user-menu__last-login">Last signed in {{ lastLogin | relativeTime }}</p>
          }

          <hr class="divider" />

          <div class="user-menu__theme" role="group" aria-label="Appearance">
            <span class="user-menu__theme-label">Appearance</span>
            <div class="user-menu__theme-options">
              @for (option of themeOptions; track option.value) {
                <button
                  type="button"
                  class="user-menu__theme-option"
                  [class.user-menu__theme-option--active]="theme.preference() === option.value"
                  [attr.aria-pressed]="theme.preference() === option.value"
                  [attr.aria-label]="option.label"
                  [title]="option.label"
                  (click)="theme.set(option.value)"
                >
                  <app-icon [name]="option.icon" [size]="15" />
                </button>
              }
            </div>
          </div>

          <hr class="divider" />

          <a
            class="user-menu__item"
            routerLink="/settings/profile"
            role="menuitem"
            (click)="open.set(false)"
          >
            <app-icon name="user" [size]="16" />
            My profile
          </a>
          <a
            class="user-menu__item"
            routerLink="/settings"
            role="menuitem"
            (click)="open.set(false)"
          >
            <app-icon name="settings" [size]="16" />
            Settings
          </a>
          <button
            type="button"
            class="user-menu__item user-menu__item--danger"
            role="menuitem"
            (click)="signOut()"
          >
            <app-icon name="logout" [size]="16" />
            Sign out
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly open = signal(false);

  protected readonly themeOptions = [
    { value: 'light' as const, label: 'Light', icon: 'sun' as const },
    { value: 'dark' as const, label: 'Dark', icon: 'moon' as const },
    { value: 'system' as const, label: 'Match system', icon: 'monitor' as const },
  ];

  protected signOut(): void {
    this.open.set(false);
    this.auth.logout();
  }
}
