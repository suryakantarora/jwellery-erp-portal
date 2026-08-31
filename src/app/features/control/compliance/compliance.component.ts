import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AppError, emptyPage, PageResponse } from '../../../core/models/api.model';
import {
  AuditLog,
  DualAuthorisationReport,
  HighValueTransactionReport,
  KycStatusReport,
} from '../../../core/models/control.model';
import { Branch } from '../../../core/models/organization.model';
import { environment } from '../../../../environments/environment';
import {
  CellTemplateContext,
  TableColumn,
  TableSort,
} from '../../../shared/components/data-table/data-table.model';
import { DrawerComponent } from '../../../shared/components/drawer/drawer.component';
import { MasterPanelComponent } from '../../../shared/components/master-panel/master-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { OrganizationService } from '../../organization/organization.service';
import { ControlService } from '../control.service';

type Tab = 'high-value' | 'kyc' | 'dual-auth' | 'audit';

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compliance and audit.
 *
 * Four questions a regulator or an auditor actually asks: which transactions
 * were large enough to report, whose identity is not properly verified, which
 * controlled actions went through on one approval, and what happened to a given
 * record.
 */
@Component({
  selector: 'app-compliance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    PageHeaderComponent,
    MasterPanelComponent,
    DrawerComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './compliance.component.html',
  styleUrl: './compliance.component.scss',
})
export class ComplianceComponent {
  private readonly control = inject(ControlService);
  private readonly organization = inject(OrganizationService);

  protected readonly tab = signal<Tab>('high-value');
  protected readonly tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'high-value', label: 'High-value transactions' },
    { id: 'kyc', label: 'KYC standing' },
    { id: 'dual-auth', label: 'Dual authorisation' },
    { id: 'audit', label: 'Audit trail' },
  ];

  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly branchFilter = signal('');
  protected readonly from = signal(monthStart());
  protected readonly to = signal(today());

  protected readonly highValue = signal<HighValueTransactionReport | null>(null);
  protected readonly kyc = signal<KycStatusReport | null>(null);
  protected readonly dualAuth = signal<DualAuthorisationReport | null>(null);
  protected readonly auditLogs = signal<PageResponse<AuditLog>>(
    emptyPage(environment.defaultPageSize),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly entityFilter = signal('');
  protected readonly sort = signal<TableSort | null>({ field: 'occurredAt', direction: 'desc' });
  protected readonly page = signal(0);
  protected readonly size = signal(environment.defaultPageSize);
  protected readonly viewing = signal<AuditLog | null>(null);

  private readonly auditActionTpl =
    viewChild.required<TemplateRef<CellTemplateContext<AuditLog>>>('auditActionCell');
  private readonly auditWhenTpl =
    viewChild.required<TemplateRef<CellTemplateContext<AuditLog>>>('auditWhenCell');

  protected readonly auditTemplates = computed(() => ({
    action: this.auditActionTpl(),
    occurredAt: this.auditWhenTpl(),
  }));

  protected readonly auditColumns: readonly TableColumn<AuditLog>[] = [
    { key: 'occurredAt', header: 'When', width: '180px' },
    { key: 'action', header: 'Action', width: '230px' },
    { key: 'entityType', header: 'Record', width: '170px', value: (row) => row.entityType },
    { key: 'entityId', header: 'Id', mono: true, hideOnMobile: true, value: (row) => row.entityId },
    { key: 'username', header: 'By', mono: true, width: '150px', value: (row) => row.username },
  ];

  protected readonly trackById = (row: { id: string }) => row.id;

  constructor() {
    this.organization.listAllBranches().subscribe({ next: (r) => this.branches.set(r) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const branchId = this.branchFilter() || null;
    const tab = this.tab();

    if (tab === 'high-value') {
      this.control.highValueTransactions(this.from(), this.to(), branchId).subscribe({
        next: (report) => {
          this.highValue.set(report);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    if (tab === 'kyc') {
      this.control.kycStatusReport().subscribe({
        next: (report) => {
          this.kyc.set(report);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    if (tab === 'dual-auth') {
      this.control.dualAuthorisation(this.from(), this.to(), branchId).subscribe({
        next: (report) => {
          this.dualAuth.set(report);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
      return;
    }

    this.control
      .searchAuditLogs({
        page: this.page(),
        size: this.size(),
        entityType: this.entityFilter() || null,
      })
      .subscribe({
        next: (page) => {
          this.auditLogs.set(page);
          this.loading.set(false);
        },
        error: (error: AppError) => this.fail(error),
      });
  }

  private fail(error: AppError): void {
    this.error.set(error);
    this.loading.set(false);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.page.set(0);
    this.load();
  }

  protected onDate(which: 'from' | 'to', event: Event): void {
    (which === 'from' ? this.from : this.to).set((event.target as HTMLInputElement).value);
    this.load();
  }

  protected onBranch(event: Event): void {
    this.branchFilter.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  protected onEntityFilter(event: Event): void {
    this.entityFilter.set((event.target as HTMLInputElement).value.trim());
    this.page.set(0);
    this.load();
  }

  protected onPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.page.set(0);
    this.load();
  }

  protected view(log: AuditLog): void {
    this.viewing.set(log);
  }

  protected close(): void {
    this.viewing.set(null);
  }

  /** Pretty-prints the stored JSON so a before/after is actually readable. */
  protected pretty(value: string | null): string {
    if (!value) {
      return '—';
    }
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  protected branchName(id: string | null): string {
    if (!id) {
      return 'All branches';
    }
    return this.branches().find((branch) => branch.id === id)?.name ?? '—';
  }
}
