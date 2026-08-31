import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Permission } from '../../../core/auth/permissions';
import { AppError } from '../../../core/models/api.model';
import { Company } from '../../../core/models/organization.model';
import { PricingRule } from '../../../core/models/pricing.model';
import { NotificationTemplate } from '../../../core/models/control.model';
import { environment } from '../../../../environments/environment';
import { Accent, ThemeService, ThemePreference } from '../../../core/services/theme.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ControlService } from '../../control/control.service';
import { OrganizationService } from '../../organization/organization.service';
import { PricingService } from '../../pricing/pricing.service';

/**
 * Platform settings.
 *
 * Almost nothing is configured *here*: currency belongs to the company, tax to
 * the pricing engine, message wording to the notification templates. This page
 * is the one place that shows the whole configured state at once and sends you
 * to wherever each part is actually owned — a settings screen that duplicated
 * those editors would be a second source of truth.
 */
@Component({
  selector: 'app-system-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './system-settings.component.html',
  styleUrl: './system-settings.component.scss',
})
export class SystemSettingsComponent {
  private readonly organization = inject(OrganizationService);
  private readonly pricing = inject(PricingService);
  private readonly control = inject(ControlService);
  private readonly auth = inject(AuthService);

  protected readonly theme = inject(ThemeService);
  protected readonly branchContext = inject(BranchContextService);
  protected readonly environment = environment;

  protected readonly canSeePricing = computed(() =>
    this.auth.hasPermission(Permission.PRODUCT_VIEW),
  );
  protected readonly canSeeNotifications = computed(() =>
    this.auth.hasPermission(Permission.NOTIFICATION_VIEW),
  );

  protected readonly companies = signal<readonly Company[]>([]);
  protected readonly branchCount = signal(0);
  protected readonly taxRates = signal<readonly PricingRule[]>([]);
  protected readonly templates = signal<readonly NotificationTemplate[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly themeOptions: ReadonlyArray<{ value: ThemePreference; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Match system' },
  ];

  /** The institution whose palette the picker is currently setting. */
  protected readonly themedInstitution = computed(() => {
    const branch = this.branchContext.activeBranch();
    if (!branch) {
      return null;
    }
    return this.companies().find((company) => company.id === branch.companyId) ?? null;
  });

  protected chooseAccent(accent: Accent): void {
    this.theme.setAccent(accent);
  }

  /** Currencies actually in use, taken from the companies themselves. */
  protected readonly currencies = computed(() => [
    ...new Set(
      this.companies()
        .map((company) => company.baseCurrency)
        .filter((currency): currency is string => !!currency),
    ),
  ]);

  protected readonly activeTaxRates = computed(() => this.taxRates().filter((rate) => rate.active));

  protected readonly activeTemplates = computed(() =>
    this.templates().filter((template) => template.active),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      companies: this.organization.listCompanies(true),
      branches: this.organization.listAllBranches(true),
    }).subscribe({
      next: ({ companies, branches }) => {
        this.companies.set(companies);
        this.branchCount.set(branches.length);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });

    // Both are optional extras on this page; a permission failure just leaves
    // that card empty rather than breaking the whole screen.
    if (this.canSeePricing()) {
      this.pricing.listTaxRates().subscribe({
        next: (rates) => this.taxRates.set(rates),
        error: () => this.taxRates.set([]),
      });
    }
    if (this.canSeeNotifications()) {
      this.control.listTemplates().subscribe({
        next: (templates) => this.templates.set(templates),
        error: () => this.templates.set([]),
      });
    }
  }
}
