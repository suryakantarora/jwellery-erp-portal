import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Header control for switching the working branch.
 *
 * Renders as static text when the user is assigned to only one branch — a menu
 * with a single option is just an extra click.
 */
@Component({
  selector: 'app-branch-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClickOutsideDirective, IconComponent],
  template: `
    <div class="branch" (appClickOutside)="open.set(false)">
      <button
        type="button"
        class="branch__trigger"
        [disabled]="!branches.canSwitch()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="open.set(!open())"
      >
        <app-icon name="branch" [size]="16" />
        <span class="branch__text">
          <span class="branch__label">Branch</span>
          <span class="branch__name">{{ branches.activeBranch()?.name ?? 'All branches' }}</span>
        </span>
        @if (branches.canSwitch()) {
          <app-icon name="chevronDown" [size]="14" />
        }
      </button>

      @if (open()) {
        <div class="branch__menu" role="listbox" aria-label="Select branch">
          @for (branch of branches.available(); track branch.id) {
            <button
              type="button"
              class="branch__option"
              role="option"
              [attr.aria-selected]="branch.id === branches.activeBranchId()"
              (click)="select(branch.id)"
            >
              <span class="branch__option-text">
                <span class="branch__option-name">{{ branch.name }}</span>
                <span class="branch__option-meta mono">{{ branch.code }}</span>
              </span>
              @if (branch.id === branches.activeBranchId()) {
                <app-icon name="check" [size]="15" />
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './branch-selector.component.scss',
})
export class BranchSelectorComponent {
  protected readonly branches = inject(BranchContextService);
  protected readonly open = signal(false);

  protected select(branchId: string): void {
    this.branches.setActive(branchId);
    this.open.set(false);
  }
}
