import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { BreadcrumbService } from './breadcrumb.service';

/** Renders the trail produced by {@link BreadcrumbService}. */
@Component({
  selector: 'app-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @if (breadcrumbs.trail().length > 1) {
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol class="breadcrumb__list">
          @for (crumb of breadcrumbs.trail(); track $index; let last = $last) {
            <li class="breadcrumb__item">
              @if (crumb.link && !last) {
                <a [routerLink]="crumb.link">{{ crumb.label }}</a>
              } @else {
                <span aria-current="page">{{ crumb.label }}</span>
              }
              @if (!last) {
                <app-icon name="chevronRight" [size]="13" />
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    .breadcrumb {
      margin-bottom: var(--space-3);
    }

    .breadcrumb__list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--text-sm);
    }

    .breadcrumb__item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--text-muted);
    }

    .breadcrumb__item a {
      color: var(--text-secondary);

      &:hover {
        color: var(--text-primary);
      }
    }

    .breadcrumb__item span[aria-current] {
      color: var(--text-primary);
      font-weight: var(--weight-medium);
    }
  `,
})
export class BreadcrumbComponent {
  protected readonly breadcrumbs = inject(BreadcrumbService);
}
